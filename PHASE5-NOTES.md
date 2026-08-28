# Phase 5 Notes — Next Horizon AI Academy

## Added
- `supabase/phase5.sql` — additive migration: notification-preference columns and email-tracking timestamp columns, plus four `claim_*_email()` SECURITY DEFINER functions.
- `lib/data/profiles.ts` — profile data-access layer (`getProfile`, `updateProfile`, `updatePreferences`).
- `lib/actions/email.ts` — four Server Actions (`triggerWelcomeEmail`, `triggerEnrollmentEmail`, `triggerCourseCompletionEmailIfNeeded`, `triggerCertificateEmailIfNeeded`) that atomically claim-and-send each transactional email.
- `lib/email/site-url.ts` — `NEXT_PUBLIC_SITE_URL`-driven link builder with graceful fallback.
- `components/StatusMessage.tsx` — shared accessible success/error feedback component (`role="status"` / `role="alert"`).
- Password-change capability (Account Security section) using `supabase.auth.updateUser()`.
- Communication preferences UI (three independent toggles) in the profile page.

## Changed
- `lib/auth.tsx` — profile loading now delegates to `lib/data/profiles.ts` instead of querying `profiles` directly (the Phase 4 inconsistency called out in the brief); also now fires the welcome-email trigger on session load.
- `app/dashboard/profile/page.tsx` — fully rebuilt into three sections (Personal Information, Communication Preferences, Account Security), no longer queries Supabase directly.
- `lib/email/templates.ts` — all four templates rewritten with HTML-escaping for student-supplied values, CTA buttons, and env-driven links via `lib/email/site-url.ts`.
- `app/dashboard/page.tsx`, `app/courses/ai-101/learn/[lessonSlug]/page.tsx` — enrollment success now fires `triggerEnrollmentEmail` (fire-and-forget).
- `components/learn/LessonView.tsx` — lesson completion now fires `triggerCourseCompletionEmailIfNeeded` (fire-and-forget, safe to call after every lesson).
- `app/dashboard/certificates/page.tsx` — certificate issuance now fires `triggerCertificateEmailIfNeeded` (fire-and-forget).
- `.env.example`, `README.md`, `docs/database-schema.md` — updated for Phase 5.
- `lib/data/progress.ts` — one stale comment fixed (referenced a Phase 3 file removed in Phase 4).

Nothing from the "preserve everything" list in the brief was removed or
restructured beyond what's listed above — routes, RLS policies, the
assessment/certificate security functions, and Supabase Auth are all
untouched from Phase 4 except for the additive Phase 5 columns/functions.

## Database Changes
See `supabase/phase5.sql` (full SQL) and `docs/database-schema.md`
(Phase 5 addendum section) for the complete, documented list. Summary:
- `profiles`: + `email_course_updates`, `email_learning_reminders`, `email_academy_updates`, `welcome_email_sent_at`
- `enrollments`: + `enrollment_email_sent_at`, `completion_email_sent_at`
- `certificates`: + `certificate_email_sent_at`
- New functions: `claim_welcome_email()`, `claim_enrollment_email()`, `claim_completion_email()`, `claim_certificate_email()`

All additive. No table dropped, no column removed, no existing RLS policy
changed. Migration is safe to run on an existing Phase 4 database.

## Transactional Email Flows
Every flow follows the same pattern: **the student action always succeeds
first, the email is attempted after, and email failure never rolls
anything back.**

| Trigger | Sent from | Exactly-once mechanism |
|---|---|---|
| First session established | `lib/auth.tsx` → `triggerWelcomeEmail()` | `claim_welcome_email()` atomically flips `profiles.welcome_email_sent_at` |
| Enrollment succeeds | dashboard + lesson-page enroll buttons → `triggerEnrollmentEmail()` | `claim_enrollment_email()` atomically flips `enrollments.enrollment_email_sent_at` |
| Lesson marked complete | `LessonView.tsx` → `triggerCourseCompletionEmailIfNeeded()` | `claim_completion_email()` recomputes 100%-complete server-side, then atomically flips `completion_email_sent_at` |
| Certificate issued | certificates page → `triggerCertificateEmailIfNeeded()` | `claim_certificate_email()` atomically flips `certificate_email_sent_at` |

All four "claim" functions are SECURITY DEFINER Postgres functions, called
via Server Actions using the server (cookie-scoped) Supabase client — never
the service-role key. This was a deliberate design choice: it avoids
opening any new RLS UPDATE policy on `enrollments` or `certificates`
(students still cannot directly update either table), keeping the Phase 4
security model completely intact while still getting database-backed,
race-safe, multi-device-safe exactly-once email semantics.

## Account Security
Password changes use `supabase.auth.updateUser({ password })` directly
from the client (this is the correct, intended use of that API — it
operates on the caller's own already-authenticated session, so no
additional server code or secret is needed). Passwords are never logged,
stored outside Supabase Auth, or sent through any custom endpoint. The
existing forgot-password/reset-password flow from Phase 4 is untouched and
still works independently.

## Communication Preferences
Three independent, student-owned toggles on `profiles`
(`email_course_updates`, `email_learning_reminders`, `email_academy_updates`),
defaulting to on/off/off respectively (course-relevant content on by
default, reminders and general marketing news opt-in only). Enforced by
the same existing `profiles: update own` RLS policy from Phase 4 — no new
policy was needed since RLS is row-level, not column-level. These never
gate transactional account email.

## Environment Variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (documented, still unused by any app code),
`RESEND_API_KEY`, `EMAIL_FROM`, and the new `NEXT_PUBLIC_SITE_URL` (used
only to build CTA links inside emails — templates gracefully omit the CTA
if unset, never guessing or hardcoding a domain). See `.env.example`.

## Security Review
Performed against the Phase 5 brief's checklist:
- **No service-role key exposed client-side or used anywhere in app code** — confirmed by grep; the one match is a comment.
- **No hardcoded secrets** anywhere in `.ts`/`.tsx`/`.sql`/`.md`.
- **Passwords never logged** — confirmed by grep across all console.log/console.error calls.
- **Email API credentials remain server-only** — `RESEND_API_KEY` is only read inside `lib/email/resend.ts`, which is only ever imported from `"use server"` files (`lib/actions/email.ts`); confirmed no client component imports it directly.
- **RLS remains enabled and unchanged** on every existing table — confirmed zero new `create policy` statements in `supabase/phase5.sql`.
- **Students cannot edit another student's profile or preferences** — enforced by the existing `profiles: update own` RLS policy (row-level `auth.uid() = id`), unchanged from Phase 4.
- **Assessment answers remain inaccessible, scoring remains server-side** — untouched from Phase 4; `assessment_answer_keys` still has zero client-facing SELECT policy.
- **Certificates cannot be forged client-side, issuance remains server-side** — untouched from Phase 4; the new `claim_certificate_email()` function only sends an email for a certificate that `issue_certificate_if_eligible()` already created, it does not issue anything itself.
- **Email URLs cannot be manipulated into unsafe HTML** — all student-supplied values (first name, in particular) are passed through `escapeHtml()` before interpolation into email HTML; verified in `lib/email/templates.ts`.
- Client/server boundary check: confirmed every `"use client"` file that touches email-triggering only imports the `"use server"` action functions (the sanctioned Next.js pattern for crossing this boundary) — never `lib/supabase/server.ts` or `RESEND_API_KEY` directly.

## Verification Performed
- **`npm install` / `npm run build` / `npm run dev` were NOT successfully run** — this sandbox has no network access to the npm registry, re-confirmed immediately before packaging (403 from `registry.npmjs.org`). This applies to every phase of this project.
- Full TypeScript check across all 62 `.ts`/`.tsx` files plus `middleware.ts` — zero real errors; remaining output is exclusively expected noise from `@types/node`/`@supabase/supabase-js` type declarations not being installable offline.
- Brace/paren balance check across all 62 files — clean.
- Dollar-quote balance check across all three SQL files (`schema.sql`, `seed.sql`, `phase5.sql`) — all even/balanced.
- Manual security review — see above.
- **None of the SQL (including the new `phase5.sql`) has been executed against a live database, and no transactional email has actually been sent via a live Resend account.** Both are implemented carefully but genuinely unverified — please run the migration and walk through the manual test sequence in the README, and report back anything that fails.

## Still Deferred
- Notification-delivery *scheduling* (e.g. digest emails, reminder cadence) — the preference toggles exist, but no actual "learning reminder" email or scheduled job sends yet.
- Email change flow (profile email is still read-only, managed by Supabase Auth directly).
- Admin console, course-authoring UI, payments — all explicitly out of scope per the brief.

## Known Limitations
- No live Supabase or Resend testing was possible in this environment.
- `SUPABASE_SERVICE_ROLE_KEY` remains documented-but-unused; there's no feature yet that needs it.

## Recommended Phase 6
Payments: paid course products, checkout, orders/payment records, receipts,
and paid enrollment. The `enrollments` table already doesn't assume "free
forever" (no such flag exists to remove), so a Phase 6 could add an
`orders`/`payments` table and a nullable `order_id` reference on
`enrollments` without restructuring anything here. Coupons/scholarships and
refund state would layer onto that same `orders` table rather than
touching `enrollments` further.
