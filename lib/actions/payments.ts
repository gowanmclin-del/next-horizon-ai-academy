"use server";

// ---------------------------------------------------------------------------
// CHECKOUT SESSION CREATION (Phase 6, URL validation hardened in Phase 16)
// ---------------------------------------------------------------------------
// Runs entirely server-side. The flow:
//   1. Confirm the caller is authenticated (via the cookie-scoped server
//      Supabase client — never the browser client, never a client-supplied
//      user id).
//   2. Validate NEXT_PUBLIC_SITE_URL (see getValidatedSiteUrlForCheckout()
//      in lib/email/site-url.ts) BEFORE touching the database — Stripe
//      Checkout requires an absolute URL, and failing here first means a
//      misconfigured deployment never creates an orphaned pending order.
//   3. Call create_pending_order() (supabase/phase6.sql), which computes
//      the amount from the course's own price_cents/sale_price_cents
//      inside Postgres — the client never supplies a price, so there is no
//      way to check out at an altered amount.
//   4. Create the actual Stripe Checkout Session using STRIPE_SECRET_KEY
//      (never sent to the browser), with success/cancel URLs built only
//      from the validated origin — never a relative-path fallback.
//   5. Attach the resulting session id to the order via
//      attach_checkout_session(), so the webhook can later find this order
//      by session id.
//   6. Return the Checkout URL to the client, which redirects the browser
//      to Stripe. Nothing about payment status is ever decided here or in
//      the browser — only the webhook (app/api/webhooks/stripe/route.ts)
//      can ever mark an order paid.
// ---------------------------------------------------------------------------

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe/server";
import { getValidatedSiteUrlForCheckout } from "@/lib/email/site-url";

export interface CreateCheckoutResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export async function createCheckoutSession(courseId: string, courseSlug: string): Promise<CreateCheckoutResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "This deployment isn't connected to Supabase yet." };
  }
  if (!isStripeConfigured()) {
    return { ok: false, error: "Payments aren't configured yet in this environment. See .env.example." };
  }

  // Phase 16 fix: validate the site URL BEFORE touching the database at
  // all. Previously, an invalid/missing NEXT_PUBLIC_SITE_URL was only
  // discovered after create_pending_order() had already inserted a
  // 'pending' order row, leaving an orphaned row behind for every failed
  // attempt. Checking this first means a misconfigured deployment fails
  // cleanly with zero database side effects.
  const siteUrlResult = getValidatedSiteUrlForCheckout();
  if (!siteUrlResult.ok) {
    return { ok: false, error: siteUrlResult.error };
  }
  const { origin } = siteUrlResult;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please log in first." };
  }

  const { data, error } = await supabase.rpc("create_pending_order", { p_course_id: courseId });
  if (error) {
    // create_pending_order() raises clear exceptions for "already
    // enrolled" / "not a paid course" / "enrollment closed" — surface
    // those directly rather than a generic failure.
    return { ok: false, error: error.message };
  }
  const order = Array.isArray(data) ? data[0] : data;
  if (!order) {
    return { ok: false, error: "Couldn't start checkout. Please try again." };
  }

  try {
    const stripe = getStripeClient();
    // Phase 16 fix: always absolute, built from the validated origin above
    // — never a relative-path fallback (Stripe Checkout requires absolute
    // URLs; a relative one is simply wrong, not a graceful degradation).
    // The course slug is explicitly encoded even though it's already
    // validated URL-safe at creation time (is_valid_slug() in
    // supabase/phase9.sql) — defense in depth for a value that ends up
    // directly in a URL string.
    const encodedSlug = encodeURIComponent(courseSlug);
    const successUrl = `${origin}/courses/${encodedSlug}/purchase/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/courses/${encodedSlug}/purchase/canceled`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      client_reference_id: order.order_id,
      line_items: [
        order.stripe_price_id
          ? { price: order.stripe_price_id, quantity: 1 }
          : {
              price_data: {
                currency: order.currency,
                unit_amount: order.amount_cents,
                product_data: { name: order.course_title },
              },
              quantity: 1,
            },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        order_id: order.order_id,
        course_id: courseId,
        user_id: user.id,
      },
    });

    if (!session.url) {
      return { ok: false, error: "Stripe didn't return a checkout URL. Please try again." };
    }

    const { error: attachError } = await supabase.rpc("attach_checkout_session", {
      p_order_id: order.order_id,
      p_session_id: session.id,
    });
    if (attachError) {
      console.error("[attach_checkout_session failed]", attachError.message);
      // The order still exists as 'pending' with no session id attached —
      // the webhook won't be able to match it later, so surface an error
      // rather than sending the student to a checkout page that can never
      // resolve to "paid" in our system.
      return { ok: false, error: "Couldn't start checkout. Please try again." };
    }

    return { ok: true, url: session.url };
  } catch (err) {
    console.error("[createCheckoutSession exception]", err);
    return { ok: false, error: "Couldn't start checkout. Please try again." };
  }
}
