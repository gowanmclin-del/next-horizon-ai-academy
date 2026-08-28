// Server-only. STRIPE_SECRET_KEY must never be read from client code — this
// file has no "use client" and is only ever imported from Server Actions
// and Route Handlers (lib/actions/payments.ts, app/api/webhooks/stripe/route.ts).
import Stripe from "stripe";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
  });
}
