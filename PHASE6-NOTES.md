# Phase 6 Notes — Payments & Paid Enrollment

## Files Added
- `supabase/phase6.sql` — course pricing columns, `orders` table + RLS, the `enrollments` policy change, and five new SECURITY DEFINER functions.
- `lib/stripe/server.ts` — server-only Stripe client factory.
- `lib/supabase/admin.ts` — server-only Supabase service-role client, used exclusively by the webhook route.
- `lib/actions/payments.ts` — `createCheckoutSession()` Server Action.
- `app/api/webhooks/stripe/route.ts` — the Stripe webhook handler.
- `app/courses/ai-101/purchase/success/page.tsx` and `.../canceled/page.tsx`.
- `components/EnrollmentCTA.tsx` — shared free-enroll/paid-checkout CTA.
- `lib/pricing.ts` — currency formatting helper.
- `PHASE6-NOTES.md` (this file).

## Files Changed
- `lib/types.ts` — `Course` gained a `pricing` field (`CoursePricing`: `isPaid`, `priceCents`, `salePriceCents`, `currency`, `enrollmentOpen`, `stripeProductId`, `stripePriceId`).
- `lib/courseData.ts` — the static-fallback AI-101 course now includes `pricing` (deliberately kept free, so the offline dev-preview experience doesn't require Stripe).
- `lib/data/courses.ts` — now selects and maps the new pricing columns.
- `lib/actions/email.ts` — added `sendEnrollmentEmailForOrder()` for the webhook's session-less context, using the admin client and the new `*_for_user` SQL functions.
- `app/dashboard/page.tsx`, `app/dashboard/courses/page.tsx`, `app/courses/ai-101/learn/[lessonSlug]/page.tsx` — the free-only "Enroll" button/gate is replaced with `<EnrollmentCTA />`, which branches on `course.pricing.isPaid`.
- `app/courses/ai-101/page.tsx` — rewritten (was a single-line JSX file) to add price display, a "what's included" list, explicit certificate-included messaging, and the enrollment CTA, while keeping the same content/layout otherwise.
- `.env.example`, `package.json` (added `stripe` dependency), `README.md`, `docs/database-schema.md`.

## Database Changes
See `supabase/phase6.sql` for full SQL; summarized in `docs/database-schema.md`'s
Phase 6 addendum. Highlights:
- `courses`: + `price_cents`, `sale_price_cents`, `currency`, `is_paid`, `enrollment_open`, `stripe_product_id`, `stripe_price_id`. AI-101 set to `is_paid = true`, `price_cents = 4900`, `currency = 'usd'`.
- New `orders` table, RLS: students can `select` their own orders; **no** insert/update/delete policy for any non-service-role caller.
- `enrollments`: + nullable `order_id`.
- **The one non-purely-additive change**: the Phase 4 `"enrollments: insert own"` policy is dropped and replaced with `"enrollments: insert own free course"`, adding `and c.is_paid = false`. This is a deliberate, necessary tightening — see Security Review below — not a regression. No existing free-course enrollment behavior changes.
- 5 new functions: `create_pending_order`, `attach_checkout_session` (both `authenticated`-callable), `process_stripe_payment_event`, `claim/complete/release_enrollment_email_for_user` (all four `service_role`-only, explicitly revoked from `public`/`anon`/`authenticated`).

## Payment Flow

**Checkout creation** (`lib/actions/payments.ts`, called from `EnrollmentCTA`):
1. Confirm the caller is authenticated via the cookie-scoped server client.
2. `create_pending_order(course_id)` — computes the amount from the course's own price inside Postgres; the client never supplies a price. Raises a clear error if already enrolled, course isn't paid, or enrollment is closed.
3. Create the Stripe Checkout Session (using `stripe_price_id` if configured, otherwise `price_data` built from the order's own `amount_cents`/`currency` — either way, never client-supplied).
4. `attach_checkout_session(order_id, session_id)` — ownership-checked, only while the order is still `pending`.
5. Return the Stripe-hosted URL; the browser redirects there. Nothing about payment status is decided in the browser at any point.

**Webhook processing** (`app/api/webhooks/stripe/route.ts`):
1. Verify the raw request body against the `Stripe-Signature` header using `STRIPE_WEBHOOK_SECRET`. This is the entire authorization boundary for everything that follows — a request that fails this check gets a `400` and touches nothing else.
2. Call `process_stripe_payment_event(session_id, payment_intent_id, status)` via the service-role admin client.
3. On a newly-applied `paid` transition, fire `sendEnrollmentEmailForOrder()` (fire-and-forget).
4. Always return `200` once handled (including "order not found" or "no-op" cases) so Stripe stops retrying; return `500` only for genuine unexpected errors, so Stripe's retry schedule kicks in — safe, because `process_stripe_payment_event()` is idempotent.

**Success page** (`app/courses/ai-101/purchase/success/page.tsx`): reads `?session_id=` from the URL but never trusts it — it polls the `orders` table (RLS-scoped to the signed-in student) for that session's real `status`, for up to ~20 seconds, and only shows "You're enrolled" once the database says `paid`. A URL containing `session_id=...` alone proves nothing; only the database row does.

## Enrollment Security

The five specific risks the brief called out, and how each is closed:

- **Forge an enrollment from the browser** — closed by the `enrollments` policy change: paid-course inserts are no longer permitted from the client at all, at any privilege level available to a normal session.
- **Alter an order to paid** — closed by `orders` having no update policy for any client role, and `process_stripe_payment_event` (the only function that can write `status`) being grant-restricted to `service_role`, which no browser session ever holds.
- **Change the price** — closed by `create_pending_order` computing `amount_cents` from the `courses` row itself, never from a parameter the client controls.
- **Enroll in another student's course purchase** — closed by RLS (`orders`/`enrollments` are both scoped to `user_id = auth.uid()`), and by `process_stripe_payment_event` using the order's own stored `user_id`, never a client-supplied one.
- **Replay a checkout request** — a checkout session id is not secret (Stripe puts it in the success-page URL by design), but calling `process_stripe_payment_event` directly requires the `service_role` JWT, which no student ever has. Calling it twice with the same session id is also safe regardless, because of the idempotent `status = 'pending'` guard on every transition.

## Refund Access Policy

A refund event (`charge.refunded`) flips the order to `status = 'refunded'`
and sets `refunded_at`. **It does not touch the associated enrollment
row.** This is a deliberate, documented decision for Phase 6, not an
oversight: automatically revoking course access on refund is a real
business-rule decision (grace periods, partial refunds, goodwill refunds
after completion, etc.) that deserves explicit product input rather than
a default baked into a payments-foundation phase. Phase 7+ can add that
rule once decided — the `orders.status = 'refunded'` state already exists
to key off of.

## Coupons / Scholarships Readiness

Not built in Phase 6, per the brief, but `orders.discount_cents` (default
`0`) exists specifically so a future coupon/discount doesn't require an
`orders` schema change — it can be set when a discount applies, with
`amount_cents` remaining "what was actually charged." Complimentary/
scholarship access could be modeled as a `provider` value other than
`'stripe'` on a future order, or as a direct academy-issued enrollment
outside the `orders` table entirely — left as an open choice for that
future phase rather than decided here.

## Environment Variables
New in Phase 6: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. No publishable
key is needed (see `.env.example` for why — hosted Checkout via a
server-returned URL doesn't need Stripe.js in the browser). Existing
Supabase/Resend/site-URL variables are unchanged; `SUPABASE_SERVICE_ROLE_KEY`
now has a genuine, narrow use (documented in `.env.example` and
`lib/supabase/admin.ts`).

## Security Review

- **Stripe webhook verification** — `stripe.webhooks.constructEvent()` against `STRIPE_WEBHOOK_SECRET`; a failed check returns `400` before any database access.
- **Order ownership** — every read is RLS-scoped (`user_id = auth.uid()`); every write goes through a function that either checks ownership explicitly (`attach_checkout_session`) or is restricted to `service_role` (`process_stripe_payment_event`).
- **Enrollment creation** — only ever from `process_stripe_payment_event` (paid) or the narrowed free-course RLS policy (free) — confirmed via grep that no other insert path exists.
- **Client/server boundaries** — confirmed via grep that `lib/stripe/server.ts` is only imported by `lib/actions/payments.ts` and the webhook route, and `lib/supabase/admin.ts` is only imported by `lib/actions/email.ts` (for the webhook-context email function) and the webhook route. No `"use client"` file imports either.
- **Supabase RLS** — `orders` has exactly one policy (`select` own). The `enrollments` insert policy is intentionally narrower than Phase 4's. No other existing policy was touched.
- **Secret handling** — confirmed via grep: no Stripe or Supabase secret is hardcoded anywhere, and `STRIPE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY` never appear in any `"use client"` file.
- **Duplicate webhook handling** — `process_stripe_payment_event` only transitions `pending → paid` (or `pending → failed/canceled`, or `paid → refunded`); a duplicate delivery of the same event finds the order already past `pending` and is a no-op, confirmed by the `if found` / `applied` return value the function reports back.
- **Replay/idempotency** — see "Enrollment Security" above; a leaked/guessed session id cannot be replayed into a paid status because the function that would need to be called for that is not callable by any client-held credential.
- **Payment amount validation** — the amount charged is always either a Stripe-side canonical `Price` object (`stripe_price_id`) or server-computed `price_data` from the order's own `amount_cents` — never a value read from the incoming request.
- **Checkout-session ownership** — `attach_checkout_session` checks `user_id = auth.uid() and status = 'pending'` before writing; a student cannot attach a session id to someone else's order.

## Verification Performed
- Full TypeScript check across all 70 `.ts`/`.tsx` files plus `middleware.ts` — zero real errors (only expected offline-install noise, consistent with every prior phase).
- Brace/paren balance check across all 70 files — clean.
- Dollar-quote balance check across all five SQL files (`schema.sql`, `seed.sql`, `phase5.sql`, `phase5.1.sql`, `phase6.sql`) — all even.
- Client/server boundary grep: confirmed no `"use client"` file references `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `lib/stripe/server`, or `lib/supabase/admin`; confirmed both server-only modules are imported only from the expected two files each.
- Grant/revoke grep: confirmed `process_stripe_payment_event` and the three `*_for_user` email functions are each explicitly revoked from `public`/`anon`/`authenticated` and granted only to `service_role`.
- Row-lock/guard grep: confirmed `process_stripe_payment_event` uses `FOR UPDATE` and that every status transition is guarded by a `WHERE status = '<expected prior state>'` clause.
- **`npm install` / `npm run build` / `npm run dev` were NOT run** — this sandbox has no network access to the npm registry, reconfirmed immediately before packaging (403 from `registry.npmjs.org`), consistent with every prior phase.

## What Could Not Be Verified Without Live Credentials
- No real Stripe Checkout Session has ever been created — the exact shape of the Stripe SDK's response and error cases are implemented against the documented API, not observed live.
- No real webhook delivery (correctly signed or otherwise) has been received or processed. The signature-verification code path, the idempotent-processing logic, and the "resend the same event" duplicate-safety behavior described in the README's test checklist are all reasoned through, not exercised.
- No refund has been triggered against a real charge.
- The SQL in `phase6.sql` (including the `DROP POLICY`/`CREATE POLICY` on `enrollments`) has not run against a live Postgres database.
- `stripe.checkout.sessions.create()`'s exact behavior with the `price_data` fallback path (when `stripe_price_id` is unset) is implemented per Stripe's documented API shape but unverified live.

Please run the migration, connect a real Stripe test-mode account, and work
through the full checklist in `README.md` section 9 — in particular, the
duplicate-webhook-resend step, since that's the single most important
thing to confirm before trusting this in production.

## Known Limitations
- No admin refund UI, no coupon system, no subscription support — all correctly out of scope per the brief.
- Discount/coupon application isn't implemented, only made schema-ready (`orders.discount_cents`).
- The refund-access business rule (does a refund revoke access?) is explicitly deferred to a future phase with product input, not decided here.

## Recommendation for Phase 7
Decide and implement the refund-access policy referenced above, and/or
begin a lightweight coupon/scholarship system using the `discount_cents`
column already in place. An admin console for viewing orders/issuing
manual refunds or complimentary enrollments would also naturally follow
once there's more than one paid course to manage.
