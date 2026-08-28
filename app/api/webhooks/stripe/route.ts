import { NextResponse, type NextRequest } from "next/server";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { sendEnrollmentEmailForOrder } from "@/lib/actions/email";

// ---------------------------------------------------------------------------
// STRIPE WEBHOOK — the only place an order can become "paid"
// ---------------------------------------------------------------------------
// This route is the entire trust boundary for payments:
//   1. The raw request body is verified against the Stripe signature header
//      using STRIPE_WEBHOOK_SECRET (stripe.webhooks.constructEvent). If
//      this fails, we return 400 immediately and touch nothing else.
//   2. Only after that succeeds do we call process_stripe_payment_event()
//      (supabase/phase6.sql) via the service-role admin client — that
//      function is itself grant-restricted to service_role only, so even
//      a leaked/guessed checkout session id (which appears in the
//      success-page URL, so it is not secret) cannot be used to fake a
//      paid status by calling the function directly.
//   3. That function is idempotent: a duplicate webhook delivery (Stripe
//      explicitly warns these can happen and recommends handling it) for
//      the same event has no additional effect the second time.
//
// We always return 200 once the event has been handled (including "order
// not found" or "already processed" cases) so Stripe stops retrying, and
// return 500 only for genuine unexpected errors so Stripe's retry schedule
// kicks in — process_stripe_payment_event()'s idempotency makes retries
// safe.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!isStripeConfigured() || !isServiceRoleConfigured()) {
    // Not an error a retry would fix — this deployment simply isn't set
    // up for payments yet.
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as { id: string; payment_intent: string | null };
        const { data, error } = await admin.rpc("process_stripe_payment_event", {
          p_checkout_session_id: session.id,
          p_payment_intent_id: session.payment_intent ?? null,
          p_new_status: "paid",
        });
        if (error) {
          console.error("[process_stripe_payment_event failed]", error.message);
          return NextResponse.json({ error: "Processing failed" }, { status: 500 });
        }
        const result = Array.isArray(data) ? data[0] : data;
        if (result?.applied) {
          // Fetch the order's user/course to send the enrollment email —
          // fire-and-forget, never blocks the webhook response, and never
          // affects whether the enrollment itself succeeded (it already
          // did, above).
          const { data: order } = await admin
            .from("orders")
            .select("user_id, course_id")
            .eq("id", result.order_id)
            .single();
          if (order) {
            sendEnrollmentEmailForOrder(order.user_id, order.course_id).catch((err) => {
              console.error("[sendEnrollmentEmailForOrder failed]", err);
            });
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as { id: string };
        const { error } = await admin.rpc("process_stripe_payment_event", {
          p_checkout_session_id: session.id,
          p_payment_intent_id: null,
          p_new_status: "canceled",
        });
        if (error) {
          console.error("[process_stripe_payment_event failed]", error.message);
          return NextResponse.json({ error: "Processing failed" }, { status: 500 });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as { payment_intent: string | null };
        if (charge.payment_intent) {
          const { error } = await admin.rpc("process_stripe_payment_event", {
            p_checkout_session_id: null,
            p_payment_intent_id: charge.payment_intent,
            p_new_status: "refunded",
          });
          if (error) {
            console.error("[process_stripe_payment_event failed]", error.message);
            return NextResponse.json({ error: "Processing failed" }, { status: 500 });
          }
        }
        break;
      }

      default:
        // Unhandled event types are expected and fine — Stripe sends many
        // event types we don't act on.
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[stripe webhook] unexpected error", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
