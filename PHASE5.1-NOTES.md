# Phase 5.1 Notes — Reliability Correction

## The Problem

In Phase 5, each `claim_*_email()` function set the corresponding
`*_email_sent_at` timestamp as part of the *claiming* step — before the
caller had actually attempted to send anything via Resend. If Resend then
failed (network error, bad API key, rate limit, transient outage), the
database already recorded the email as sent, and no future call would ever
retry it. A real transactional email — including the welcome email,
enrollment confirmation, course-completion email, or certificate email —
could be silently and permanently lost.

## The Fix

Replaced the single-step "claim = sent" design with a three-step
claim → send → complete-or-release flow, for all four email flows:

1. **`claim_*_email(...)`** — atomically claims a short-lived lease (5
   minutes) to attempt a send, by setting `*_email_claimed_at`. Returns
   `should_send: false` if the email was already confirmed sent, or if
   another claim is currently active and unexpired.
2. The caller (`lib/actions/email.ts`) attempts the actual send via
   `sendEmail()`.
3. **On confirmed success:** `complete_*_email(...)` sets
   `*_email_sent_at`, which permanently stops any future send for that
   event.
4. **On failure or any exception:** `release_*_email(...)` clears the
   claim, so a later call (next login, next page view, next retry) can
   claim and try again.

If step 4 itself never runs — for example, the server process is killed
mid-request — the claim isn't released, but it self-expires after 5
minutes inside the SQL functions' own `WHERE` clause. A stale claim can
delay a retry by at most 5 minutes; it can never permanently block
delivery.

## Requirement-by-Requirement

1. **Not recorded as sent until Resend confirms success** — `*_email_sent_at` is now only ever set inside `complete_*_email()`, called only after `sendEmail()` returns `{ sent: true }`.
2. **Concurrent tabs/devices can't cause duplicate sends** — the claim `UPDATE ... WHERE *_email_sent_at IS NULL AND (*_email_claimed_at IS NULL OR *_email_claimed_at < now() - interval '5 minutes')` is a single atomic statement; Postgres's row-level locking means only one concurrent caller can ever win it for a given row.
3. **Temporary failures remain retryable** — a released (or expired) claim can be claimed again. Welcome-email retries happen naturally on every session load (`lib/auth.tsx`); enrollment/completion/certificate emails now also get a passive retry check on every relevant dashboard/certificates page load (see "Additional edge-case fixes" below), in addition to the original action-triggered attempt.
4. **The triggering student action still succeeds regardless of email outcome** — unchanged from Phase 5: every trigger call is fire-and-forget (`.catch(() => {})`) after the real action (signup, enrollment, lesson completion, certificate issuance) has already committed.
5. **No service-role key or Resend key exposed client-side** — unchanged; see Security Review below.
6. **Authenticated server-side Supabase access + SECURITY DEFINER** — all 12 functions (4 flows × claim/complete/release) are SECURITY DEFINER, called via the cookie-scoped server Supabase client, scoped internally to `auth.uid()`.
7. **Short-lived claim/lease approach** — implemented exactly as suggested: `*_email_claimed_at` + `*_email_sent_at`, 5-minute lease.
8. **Finalize on success** — `complete_*_email()`.
9. **Release/expire on failure** — `release_*_email()`, plus the self-expiring lease window.
10. **A stale claim cannot permanently block delivery** — bounded by the 5-minute lease window, enforced in SQL, not in application code.
11. **All four flows updated** — welcome, enrollment, completion, certificate.
12. **Welcome email uses the authenticated Auth email, not `profiles.email`** — `claim_welcome_email()` now returns `auth.email()` (read from the verified JWT claims) instead of querying `profiles.email`. This also closes a real (if minor) gap: `profiles.email` is technically editable by the student via the existing row-level "profiles: update own" RLS policy (RLS is row-level, not column-level, and the app's own `updateProfile()` never included `email` in its payload, but a student could still call the Supabase REST API directly to change it), so it should never have been trusted as a delivery address for an account-identity email.
13. **No RLS weakened** — confirmed: zero new `create policy` statements in `supabase/phase5.1.sql`. Every new column is only ever writable through the SECURITY DEFINER functions, exactly like the Phase 4/5 model for `enrollments`/`certificates`.
14. **Migration is additive and safe** — `supabase/phase5.1.sql` only adds columns (`add column if not exists`) and replaces functions (`create or replace function`); no table, column, or data is dropped.
15. **Documentation updated** — `README.md` (setup steps now include running `phase5.1.sql`), `docs/database-schema.md` (Phase 5.1 addendum appended), this file. `.env.example` was **not** changed — no new environment variables were needed for this fix.
16. **Searched for other transactional-email edge cases** — see below.

## Additional Edge-Case Fixes Found During Review

While auditing the whole application for transactional-email issues per
requirement #16, two gaps were found and fixed:

- **No retry surface for enrollment/completion/certificate emails.**
  In Phase 5, these three emails were only ever attempted once, right at
  the moment of the triggering action (clicking Enroll, marking the last
  lesson complete, clicking Claim Certificate). If that single attempt
  failed, there was no code path that would ever try again — the student
  would have to somehow re-trigger the original action, which for
  enrollment/certificates isn't naturally repeatable once already
  enrolled/issued. Fixed by adding passive retry checks: `app/dashboard/
  page.tsx` now re-attempts the enrollment and completion emails on every
  dashboard load if the student is enrolled/100% complete, and `app/
  dashboard/certificates/page.tsx` re-attempts the certificate email on
  every certificates-page load if a certificate already exists. All of
  these are cheap no-ops once the email is actually confirmed sent, since
  `claim_*_email()` checks `*_email_sent_at IS NULL` first.
- **Welcome-email address source** — see requirement #12 above; this was
  the one genuine (minor) security-adjacent gap found.

No other regressions were found. Assessment scoring, certificate
issuance, RLS on `assessment_answer_keys`/`assessment_attempts`, and every
other Phase 4/5 flow are untouched.

## Verification Performed

- **TypeScript**: full check across all 62 `.ts`/`.tsx` files plus
  `middleware.ts` — zero real errors (only expected noise from
  `@types/node`/`@supabase/supabase-js` type declarations not being
  installable offline, identical to every prior phase).
- **Brace/paren balance**: clean across all 62 files.
- **SQL dollar-quote balance**: verified even across all four SQL files
  (`schema.sql`, `seed.sql`, `phase5.sql`, `phase5.1.sql`).
- **Client/server boundary**: grepped every `"use client"` file — none
  import `lib/supabase/server`, `RESEND_API_KEY`, or
  `SUPABASE_SERVICE_ROLE_KEY` directly; all email-related client code only
  calls the `"use server"` functions in `lib/actions/email.ts`, the
  sanctioned Next.js pattern for crossing this boundary.
- **SQL function security**: confirmed all 12 new/replaced functions in
  `phase5.1.sql` are `SECURITY DEFINER` and each begins with an
  `auth.uid() is null` guard. Confirmed zero new RLS policies were added.
- **Retry/concurrency behavior**: reasoned through and documented above
  (atomic `UPDATE ... WHERE ... IS NULL`), but **not exercised against a
  live database** — see Limitations.
- **`npm install` / `npm run build` / `npm run dev`**: **not run.** This
  sandbox has no network access to the npm registry, reconfirmed
  immediately before packaging (403 from `registry.npmjs.org`).

## What Could Not Be Tested Without Live Credentials

- The SQL in `phase5.1.sql` has never executed against a real Postgres
  database. The `create or replace function` statements, the `RETURNING
  ... INTO` clauses, and the `FOUND` checks are believed correct based on
  standard PostgreSQL/plpgsql semantics, but a live run in the Supabase
  SQL Editor is the real test.
- No actual concurrent-request race (two tabs claiming simultaneously) has
  been exercised — the atomicity argument rests on Postgres's documented
  row-level locking behavior for `UPDATE`, not on an observed test.
- No real Resend failure has been triggered and observed being correctly
  released and later retried.
- `auth.email()` has not been confirmed against a live Supabase project to
  return the expected value in this exact function-call context (it is a
  documented, standard Supabase Auth helper, but this specific usage is
  unverified live).

Please run the migration in a real Supabase project and walk through the
manual test sequence in `README.md`, including deliberately breaking
`RESEND_API_KEY` temporarily to confirm a failed send is correctly
released and retried on the next dashboard visit.

## Not Changed

Per the brief, Phase 5.1 is strictly this reliability correction — no
payment integration, no changes to routes, styling, Supabase Auth
configuration, RLS policies (beyond what's described above, which adds
none), assessment security, certificate-issuance security, student
dashboard functionality/layout, course content, or email template
wording/branding.
