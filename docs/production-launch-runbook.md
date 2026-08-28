# Production Launch Runbook — Phase 13

This runbook turns the existing Next Horizon AI Academy application into a launchable production deployment without introducing new product scope.

## 1. Deployment order

1. Create or select the production Supabase project.
2. Run the numbered SQL files in this exact order: `schema.sql`, `phase5.sql`, `phase5.1.sql`, `phase6.sql`, `phase7.sql`, `phase8.sql`, `phase9.sql`, `phase10.sql`, `phase11.sql`, `phase12.sql`, `phase17.sql`, `phase18.sql`. **`phase18.sql` must be run immediately after `phase17.sql`** — `phase17.sql` alone temporarily breaks the admin Course Builder's module/lesson reordering (its new position constraints conflict with the Phase 9 reorder functions); `phase18.sql` is the fix. Do not stop between these two. Phases 13–16 introduced no database changes.
3. Run `seed.sql` only if AI-101 has not already been created in that database.
4. Create the first real user account, then promote that account to `admin` using the documented bootstrap SQL.
5. Configure all production environment variables in the deployment host.
6. Deploy the application and set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin.
7. Register the Stripe webhook endpoint at `https://YOUR-DOMAIN/api/webhooks/stripe`.
8. Verify the Resend sending domain and set `EMAIL_FROM` to an address on that verified domain.
9. Visit `/admin/launch-readiness` and resolve every blocking item.
10. Run `/admin/acceptance-test` with Stripe in test mode.
11. Only after the acceptance test passes, replace Stripe test credentials with live credentials and update the live webhook secret.

## 2. Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL` — public project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; required by the Stripe webhook to perform the protected payment/enrollment transaction.
- `STRIPE_SECRET_KEY` — use `sk_test_...` during acceptance testing and `sk_live_...` only at go-live.
- `STRIPE_WEBHOOK_SECRET` — secret for the webhook endpoint in the same Stripe mode as `STRIPE_SECRET_KEY`.
- `RESEND_API_KEY` — server-only transactional-email key.
- `EMAIL_FROM` — verified sender, such as `Next Horizon AI Academy <learn@yourdomain.com>`.
- `NEXT_PUBLIC_SITE_URL` — exact production HTTPS origin, with no trailing route.

Never expose the service-role, Stripe secret, webhook secret, or Resend key through a `NEXT_PUBLIC_` variable.

## 3. Stripe events

Register `/api/webhooks/stripe` for these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `charge.refunded`

The browser redirect is not the source of truth for paid enrollment. The signed webhook updates the order and grants access.

## 4. Test-mode acceptance

Use one dedicated student test account. Complete a Stripe-hosted Checkout test payment, verify the order and enrollment in admin, complete the course, pass the assessment, issue the certificate, and verify the certificate publicly. Then run the edge cases listed at `/admin/acceptance-test`.

Do not use live cards or live Stripe keys for this stage.

## 5. Go / No-Go criteria

### GO

- Supabase production connection is healthy.
- All migrations are applied.
- At least one admin exists.
- At least one complete published course exists.
- Supabase service-role key is configured server-side.
- Stripe key and webhook secret are configured in the same mode.
- Test payment creates exactly one paid order and one enrollment.
- Revoked enrollment removes learner access.
- Assessment and certificate are isolated to the purchased course.
- Final production URL uses HTTPS and is not localhost.
- Mobile and desktop smoke tests pass.

### NO-GO

Do not launch paid enrollment if any of these are true:

- Payment succeeds in Stripe but enrollment is not created.
- Webhook signature verification fails.
- Duplicate payment events create duplicate enrollment or certificate data.
- A student can access a course they do not own.
- A non-admin can access admin data or actions.
- The production site URL still points to localhost or a preview domain.

## 6. Post-launch smoke test

Immediately after switching Stripe to live mode, perform one low-cost real transaction you control (or temporarily use the lowest appropriate production price), confirm the live webhook and enrollment, then refund it through the admin workflow and confirm access/status behavior remains correct.
