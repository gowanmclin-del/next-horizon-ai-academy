// ---------------------------------------------------------------------------
// SUPABASE SERVICE-ROLE CLIENT — WEBHOOK-ONLY
// ---------------------------------------------------------------------------
// This is the one legitimate use of SUPABASE_SERVICE_ROLE_KEY in this
// codebase: the Stripe webhook handler (app/api/webhooks/stripe/route.ts)
// receives requests with no Supabase session at all (Stripe calls the
// endpoint directly, not the signed-in student's browser), so there is no
// auth.uid() available for RLS to scope against. The webhook route
// verifies the request is genuinely from Stripe (HMAC signature check
// against STRIPE_WEBHOOK_SECRET) BEFORE ever calling anything in this
// file — that signature check is the authorization boundary, not RLS.
//
// This file must NEVER be imported from:
//   - any "use client" component
//   - any file reachable from a client bundle
//   - any Server Action or Route Handler that acts on behalf of a
//     specific signed-in student (those use lib/supabase/server.ts, which
//     is scoped to that student's own session via RLS instead)
//
// Even with this client, actual writes go through
// process_stripe_payment_event() and the *_email_*_for_user() functions in
// supabase/phase6.sql, which are themselves granted to `service_role`
// only — so holding this client is necessary but not sufficient to write
// arbitrary rows; the SQL layer is a second, independent enforcement point.
// ---------------------------------------------------------------------------

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  if (!isServiceRoleConfigured()) {
    throw new Error(
      "Supabase service-role client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
