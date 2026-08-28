# Phase 8 Notes — Operational Administration

## What Was Added
An audit log for sensitive admin actions, an in-app admin-promotion
workflow (with the Phase 7 self-escalation trigger still the ultimate
backstop), secure Stripe refunds with an explicit refund-only vs.
refund+revoke choice, a payment-status/enrollment-status distinction on
the Orders page, expanded dashboard metrics sourced entirely from real
order/enrollment records, and a course metadata edit foundation.

## Routes Added
- `/admin/admins` — view current admins, search any account, promote to admin.
- `/admin/activity` — full audit log, newest first.
- `/admin/courses/[id]` — course detail + metadata edit form.

## Routes Modified
- `/admin` — new cards (active/completed/complimentary enrollments, total paid orders, refunded orders, revenue computed only from paid orders) + a Recent Admin Activity section.
- `/admin/orders` — added a Payment/Enrollment status pair per row and a Refund action on paid orders.
- `/admin/enrollments` — added an inline Revoke action.
- `/admin/courses` — course titles now link to the new detail page.

## Components Added
`PromoteAdminForm`, `RefundOrderButton` (the refund confirmation panel),
`RevokeEnrollmentButton`, `EditCourseForm`.

## Database Changes
See `supabase/phase8.sql` in full and the Phase 8 addendum in
`docs/database-schema.md`. Summary:
- New table `admin_audit_log` (RLS: admin `select` only — no write policy for anyone, including admins; every row comes from a SECURITY DEFINER function).
- New functions: `admin_log_action`, `admin_promote_user`, `admin_mark_order_refunded`, `admin_update_course`.
- `admin_grant_enrollment()`/`admin_revoke_enrollment()` (Phase 7) replaced via `CREATE OR REPLACE` **only** to add an audit-log insert — their authorization checks and behavior are byte-for-byte identical otherwise.

Nothing dropped, nothing removed, no previous migration file edited —
`phase5.sql` through `phase7.sql` are untouched.

## RLS/Security Changes
- **One new table, one new policy** (`admin_audit_log: admin read`). No policy was added anywhere that lets any client role — admin included — write to the audit log directly.
- **No existing policy from Phase 4–7 was touched.** Confirmed by grep: `phase8.sql` contains exactly one `create policy` statement.
- Every new or modified function (`admin_log_action`, `admin_promote_user`, `admin_grant_enrollment`, `admin_revoke_enrollment`, `admin_mark_order_refunded`, `admin_update_course`) begins with `if not public.is_admin(auth.uid()) then raise exception` — confirmed by grep (6 occurrences, matching all 6 functions).
- The Phase 7 self-escalation-prevention trigger is untouched and remains the ultimate backstop under `admin_promote_user()` — the function doesn't bypass it, it satisfies it (the trigger sees the *promoting* admin's own `auth.uid()`, confirms they're already an admin, and lets the target's role change through).

## Admin Authorization Approach
Unchanged from Phase 7 — see that phase's README section. Every new
mutation added in Phase 8 (`promoteToAdmin`, `refundOrder`, `updateCourse`)
goes through the same `assertAdmin()` re-check in `lib/actions/admin.ts`
before calling a SQL function that checks `is_admin()` again itself — the
same two-independent-layers pattern as every Phase 7 admin mutation.

## Stripe Refund Architecture
`refundOrder()` in `lib/actions/admin.ts`:
1. Fresh-reads the order; rejects if not currently `'paid'` or missing a Stripe payment intent reference.
2. Logs `refund_initiated` (via `admin_log_action`) **before** calling Stripe — so an attempt is on record even if the Stripe call itself fails.
3. Calls `stripe.refunds.create()` server-side (`STRIPE_SECRET_KEY`, never sent to the browser). If Stripe errors, the function stops here — nothing in the academy database has changed yet.
4. Only after Stripe confirms success does it call `admin_mark_order_refunded()`, which atomically guards against double-processing via `WHERE status = 'paid'` (a duplicate/concurrent call finds the order already past `'paid'` and raises rather than silently reprocessing), records `refund_completed`, and — only if the admin explicitly chose to — revokes the linked enrollment (`enrollments.order_id = orders.id`) and records `enrollment_revoked_refund`.
5. If step 4 fails *after* Stripe already succeeded (a genuinely bad state — money refunded, database not updated), the action returns a loud, explicit error telling the admin to check Stripe and the order manually, rather than pretending success.

The order row is never deleted, before or after a refund — `status`
becomes `'refunded'`, `refunded_at` is set, and the row remains the
permanent record.

**Known limitation on double-refund protection**: the atomic `WHERE
status = 'paid'` guard in `admin_mark_order_refunded()` is the
authoritative, tested-by-design protection at the database layer. There
is a narrow theoretical race window *before* that point — if the refund
button were clicked twice in rapid succession, both requests could pass
the initial fresh-read check and both call Stripe. In practice this is
mitigated by the confirmation panel requiring a deliberate second click
and the button's own submitting-state disable, and even in the rare case
where Stripe was called twice, Stripe's own API would reject a
refund exceeding the original charge amount. This is a reasonable,
documented tradeoff for an admin-only, low-concurrency interface rather
than building a distributed lock for a low-likelihood scenario — flagged
here rather than silently accepted.

## Audit-Log Architecture
`admin_audit_log(id, admin_id, action, target_type, target_id, metadata,
created_at)`, indexed on `created_at desc` and `admin_id`. Populated
exclusively via inline `INSERT` statements inside the SECURITY DEFINER
functions that perform the action being logged (`admin_promote_user`,
`admin_grant_enrollment`, `admin_revoke_enrollment`,
`admin_mark_order_refunded`, `admin_update_course`), plus the standalone
`admin_log_action()` for the one case (refund-initiated) that needs to be
recorded before a multi-step process completes. No standalone "write to
the log" path exists that isn't tied to the action itself — the log
cannot be edited or deleted through the app by anyone, admin included.

## Tests Completed
- Full TypeScript check across all 89 `.ts`/`.tsx` files plus `middleware.ts` — zero real errors (only expected offline-install noise from `@types/node`/`@supabase/supabase-js`/`stripe` not being installable, consistent with every prior phase).
- Brace/paren balance check across all 89 files — clean.
- Dollar-quote balance check across all seven SQL files — all even.
- Security sweep: confirmed (by checking actual import graphs, not just string matches) that neither `lib/supabase/admin.ts` nor `lib/stripe/server.ts` is ever imported by a `"use client"` file — only by `lib/actions/{admin,email,payments}.ts` (all `"use server"`) and the webhook Route Handler; confirmed no `NEXT_PUBLIC_`-prefixed secret exists in `.env.example`; confirmed `admin_audit_log` has exactly one policy and it's read-only; confirmed all 6 new/modified functions check `is_admin()`; confirmed the refund atomic guard is present; confirmed no code path deletes an order.
- **`npm install` / `npm run build` / `npm run lint` were NOT run** — this sandbox has no network access to the npm registry, reconfirmed immediately before packaging (403 from `registry.npmjs.org`), consistent with every prior phase.

## Anything Requiring Live Supabase Verification
- `admin_promote_user()` has never run against a live database — the interaction with the Phase 7 self-escalation trigger (does the trigger correctly allow the change through when the *caller* is an admin, even though the *target's* row is what's changing?) is reasoned through via standard Postgres/plpgsql `auth.uid()` semantics, not observed.
- `admin_mark_order_refunded()`'s atomic guard, and the enrollment-revocation join via `order_id`, have never executed against real data.
- The audit log's zero-write-policy design (RLS enabled, no insert policy, writes only via SECURITY DEFINER) has not been confirmed to actually block a direct client insert attempt live.
- Dashboard aggregate queries (the new active/completed/refunded counts) are unverified against real rows.

## Anything Requiring Stripe Test-Mode Verification
- No real `stripe.refunds.create()` call has ever been made — the request shape, response handling, and error handling are implemented against Stripe's documented API, not observed.
- The full refund-only vs. refund+revoke UI flow, end to end with a real Stripe test charge, is untested.
- Whether Stripe correctly rejects a genuine double-refund attempt (the mitigation described above) has not been observed.

**The 18-step Live Verification Checklist in `README.md` covers all of the
above — please work through it in order with Stripe test mode before
trusting this in production, and report back anything that fails.**

## Recommended Phase 9 Priorities
1. Run the full Live Verification Checklist and fix anything it surfaces — this is the highest-priority item, as with every phase that couldn't be tested live.
2. A safe admin-demotion path, explicitly designed to prevent removing the last remaining administrator (the Phase 8 brief intentionally deferred this).
3. Course-authoring: module/lesson editing, now that `/admin/courses/[id]` exists as a metadata-only foundation.
4. Partial refunds (currently only full-amount refunds are supported, matching Stripe's default `refunds.create()` behavior with no amount specified).
