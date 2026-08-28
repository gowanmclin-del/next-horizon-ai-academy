# Next Horizon AI Academy — Website & Learning Platform (Phase 18)

A Next.js 14 (App Router) + TypeScript + Tailwind CSS academy site with a
Supabase (Postgres) backend and Stripe-powered paid enrollment:
authentication, student dashboard, the AI-101 course (now a paid course),
server-graded assessments, CAFP certificate issuance, notification
preferences, password management, and reliable transactional student email.

**None of this has been tested against a live Supabase, Resend, or Stripe
account in the environment that built it** (no network access there — see
`PHASE6-NOTES.md` for the full verification/limitations writeup). Follow
the setup steps below and work through the test checklist at the end to
confirm everything end to end.

## 1. Install dependencies

Requires Node.js 18.18+ (Node 20 LTS recommended).

```bash
npm install
```

## 2. Create/configure Supabase

Create a project at [supabase.com](https://supabase.com) (free tier is
fine for development). From Settings → API, copy the Project URL and
anon/public key.

## 3. Run the schema

**If starting fresh:** open the Supabase SQL Editor and run, in order:
1. `supabase/schema.sql` (Phase 4 — every table, RLS policy, and the
   assessment/certificate security functions)
2. `supabase/seed.sql` (AI-101's modules, lessons, and assessment)
3. `supabase/phase5.sql` (Phase 5 — notification preferences, email
   tracking columns, and the original email-claim functions)
4. `supabase/phase5.1.sql` (Phase 5.1 — reliability correction: replaces
   the Phase 5 email-claim functions with a race-safe claim/complete/
   release flow)
5. `supabase/phase6.sql` (Phase 6 — course pricing, the `orders` table,
   Stripe-related SECURITY DEFINER functions, and a necessary tightening
   of the `enrollments` insert policy so paid courses can't be
   self-enrolled for free)
6. `supabase/phase7.sql` (Phase 7 — admin roles, self-escalation
   prevention, admin read policies, and complimentary-enrollment
   functions)
7. `supabase/phase8.sql` (Phase 8 — audit log, admin promotion,
   Stripe refunds, and course-metadata editing)
8. `supabase/phase9.sql` (Phase 9 — safe admin demotion and full
   module/lesson course-authoring)
9. `supabase/phase10.sql` (Phase 10 — multi-course creation)
10. `supabase/phase11.sql` (Phase 11 — generic learner delivery; also
    fixes a real gap in assessment-ownership enforcement)
11. `supabase/phase12.sql` (Phase 12 — academy operations; also fixes a
    real gap in admin visibility into assessment scores — see
    `PHASE12-NOTES.md`)
12. `supabase/phase17.sql` (Phase 17 — adds CHECK constraints on course
    price and module/lesson position/duration as defense-in-depth — see
    `DATA-INTEGRITY-REVIEW.md`. Phases 13–16 added no database changes.)
13. `supabase/phase18.sql` (Phase 18 — **must be run immediately after
    phase17.sql, never skipped or delayed** — replaces the module/lesson
    reorder functions with an implementation compatible with phase17.sql's
    new constraints. Without this file, reordering modules or lessons
    will fail after phase17.sql is applied — see "Migration Sequencing"
    below and `PHASE18-NOTES.md`.)

Optionally, once you're ready to validate the multi-course architecture:
`supabase/optional-second-course-fixture.sql` — see "Second-Course
Validation Procedure" below. Not required, not part of the numbered
chain, creates no fake student data.

**If upgrading an existing database:** run whichever of the files above you
haven't already applied, in order. Each is additive and safe to run on top
of the previous ones.

### Migration Sequencing — phase17.sql and phase18.sql

**These two files must always be applied together, in order, with nothing
in between.** `phase17.sql` adds `CHECK (position >= 1)` constraints to
`modules` and `lessons`. The module/lesson reorder functions defined back
in `phase9.sql` use a temporary *negative* position as part of their
atomic-reorder technique — which directly violates that new constraint.
`phase18.sql` replaces those two functions (via `CREATE OR REPLACE`, not
by editing `phase9.sql`) with a version that uses a large *positive*
offset instead, which is safe under the new constraint. If `phase17.sql`
is ever applied to a database without immediately following it with
`phase18.sql`, **module and lesson reordering will be broken** (every
call will fail with a check-constraint violation) until `phase18.sql` is
applied. See `PHASE18-NOTES.md` for the full technical explanation.

## 4. Configure Supabase Auth

In Supabase → Authentication → URL Configuration:
- Set **Site URL** to your app's URL (`http://localhost:3000` for local
  dev, your real domain in production).
- Add `/reset-password` as an allowed **redirect URL** (e.g.
  `http://localhost:3000/reset-password`), so the password-reset email
  link works.

## 5. Configure Resend (optional)

Transactional email (welcome, enrollment, completion, certificate) is
optional — the whole platform works without it, just without emails
actually sending. To enable it:
1. Create a [Resend](https://resend.com) account and API key.
2. Verify a sending domain in Resend.
3. Set `RESEND_API_KEY` and `EMAIL_FROM` (e.g.
   `Next Horizon AI Academy <hello@yourdomain.com>`) in `.env.local`.

## 6. Configure Stripe

AI-101 is a paid course as of Phase 6 ($49 by default — change
`price_cents` on the `courses` row, or set `sale_price_cents` for a
temporary discount). To enable real checkout:

1. Create a [Stripe](https://stripe.com) account. Use **test mode** while developing.
2. From the Stripe Dashboard → Developers → API keys, copy the **secret key** into `STRIPE_SECRET_KEY`. Do **not** use the publishable key here, and do not prefix this variable with `NEXT_PUBLIC_`.
3. (Optional) Create a Product and Price in the Stripe Dashboard for AI-101, then set `stripe_product_id`/`stripe_price_id` on the course row to that Price's ID. If you skip this, checkout still works — it falls back to building the line item from `price_cents` directly.

### Set up the webhook

The webhook is what actually grants access after payment — checkout
redirecting the browser back to your site is not sufficient on its own.

**Local development**, using the [Stripe CLI](https://stripe.com/docs/stripe-cli):
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
This prints a webhook signing secret starting with `whsec_` — put that in
`STRIPE_WEBHOOK_SECRET`.

**Production**, in the Stripe Dashboard → Developers → Webhooks:
1. Add an endpoint: `https://yourdomain.com/api/webhooks/stripe`.
2. Subscribe to at least: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`,
   `checkout.session.expired`, and `charge.refunded`.
3. Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`.

## 7. Set the remaining environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Everything Supabase-backed |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything Supabase-backed |
| `SUPABASE_SERVICE_ROLE_KEY` | The Stripe webhook only (see `.env.example` for why) |
| `RESEND_API_KEY` | Sending real emails |
| `EMAIL_FROM` | Sending real emails |
| `NEXT_PUBLIC_SITE_URL` | **Required for checkout** (validated before every Stripe Checkout Session — see below); also used for CTA links inside emails |
| `STRIPE_SECRET_KEY` | Creating checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | Verifying webhook signatures |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional — shows a working mailto: link on `/contact`; shows a professional placeholder message if unset |

Never commit `.env.local`.

**`NEXT_PUBLIC_SITE_URL` requirements (Phase 16):** must be a valid
absolute `http://` or `https://` URL. In production it must use `https://`
and cannot be `localhost`. If it's missing or invalid, Stripe checkout
will refuse to start with a clear error — it does **not** fall back to a
relative URL (Stripe requires an absolute redirect URL; a relative one
would simply be wrong). `http://localhost:3000` is fine for local
development.

## 8. Start the development server

```bash
npm run dev
```

Open http://localhost:3000. Without Supabase configured, the site still
runs — marketing pages work normally, and the student dashboard/course/
forms show a clear "backend not configured" notice instead of pretending
to work.

Other scripts:

```bash
npm run build       # production build
npm run start        # serve the production build
npm run lint          # run ESLint
npm run typecheck  # TypeScript, no emit
npm audit --omit=dev  # dependency security audit (production dependencies only)
```

## 9. Testing the student lifecycle

A recommended manual test sequence once Supabase, Stripe (test mode), and
ideally Resend are connected. Since Phase 6, AI-101 is a paid course, so
step 8 now goes through Stripe Checkout rather than a free enroll button.

1. **Signup** at `/signup` — enter name, email, password, role, experience level.
2. **Confirm account** — if Supabase email confirmation is enabled, check the inbox and click the link.
3. **Welcome email** — should arrive once, on first successful login/session (not on every subsequent login).
4. **Login** at `/login`.
5. **Edit profile** at `/dashboard/profile` — update name/role/experience, confirm the success message.
6. **Set communication preferences** — toggle the three checkboxes, save, refresh the page, confirm they persisted.
7. **Change password** — use the Account Security section, then log out and log back in with the new password.
8. **Purchase AI-101**: from `/dashboard`, `/dashboard/courses`, or `/courses/ai-101`, click the enrollment CTA. You should land on a Stripe-hosted Checkout page showing the correct price.
9. **Pay with a Stripe test card** — `4242 4242 4242 4242`, any future expiry, any CVC. Confirm you're redirected to `/courses/ai-101/purchase/success`.
10. **Success page behavior** — it should say "Checking with Stripe…" briefly, then confirm enrollment once the webhook has processed (a few seconds at most locally with `stripe listen` running). Refresh the page — it should still say confirmed, not re-check from scratch in a way that could flip.
11. **Webhook processed correctly** — check your terminal running `stripe listen` (or the Stripe Dashboard's webhook logs) for a `200` response; check the `orders` table directly in Supabase to confirm `status = 'paid'` and `paid_at` is set; check `enrollments` for a new row with `order_id` set.
12. **Enrollment email** — should arrive once (sent from the webhook, not the browser).
13. **Duplicate-webhook safety** — in the Stripe Dashboard's webhook logs (or via the Stripe CLI), manually resend the same `checkout.session.completed` event. Confirm no second enrollment row and no second email.
14. **Dashboard reflects paid enrollment** — `/dashboard` and `/dashboard/courses` should now show AI-101 as enrolled with 0% progress, exactly like a free enrollment would.
15. **Complete lessons** — work through the course, marking each lesson complete.
16. **Completion email** — should arrive once, only after the *last* lesson is marked complete, not on every lesson.
17. **Take the assessment** at `/courses/ai-101/assessment`.
18. **Pass** — score is computed and recorded entirely server-side.
19. **Issue certificate** from `/dashboard/certificates`.
20. **Certificate email** — should arrive once, with a working verification link if `NEXT_PUBLIC_SITE_URL` is set.
21. **Public certificate verification** at `/verify` — enter the verification code from the email or the certificates page, confirm it resolves correctly.
22. **Canceled checkout** — start a new checkout for a second test account and click "back" or close the Stripe tab instead of paying. Confirm you land on (or can navigate to) `/courses/ai-101/purchase/canceled`, and that no enrollment was created.
23. **Refund (optional)** — issue a refund for a test payment from the Stripe Dashboard. Confirm the `orders` row flips to `refunded` with `refunded_at` set, and that the existing enrollment is **not** automatically removed (see `PHASE6-NOTES.md` "Refund access policy" for why that's the intended behavior in Phase 6).

Re-running steps 5–7 and 12/16/20 a second time (or opening a second
browser/tab and repeating) is a good way to confirm the exactly-once email
behavior — no step should ever send a duplicate transactional email.

## Phase 7 — Academy Administration

### Admin architecture

Authorization is enforced in two independent places, both server-side:

1. **`app/admin/layout.tsx`** — a Server Component that wraps every
   `/admin/*` page. It calls `requireAdmin()` (`lib/data/admin.ts`), which
   reads the signed-in user's `profiles.role` and redirects away
   (`/login` if signed out, `/dashboard` if signed in but not an admin)
   *before generating any admin page's HTML*. This is real server-side
   authorization, not a hidden nav link — a non-admin's browser never
   receives admin markup or data.
2. **Every admin mutation** (`lib/actions/admin.ts`) independently
   re-checks `profiles.role` itself, and the underlying SQL functions
   (`admin_grant_enrollment`, `admin_revoke_enrollment`) check
   `is_admin(auth.uid())` a third time inside the database. A request that
   somehow reached a Server Action without going through the layout would
   still be rejected twice more.

`middleware.ts` also requires a signed-in session for `/admin/*` (same as
`/dashboard/*`), but deliberately does **not** check the role there — see
the comment in `middleware.ts` for why the role check specifically lives
in the layout instead (avoiding a database round-trip on every request to
every protected route, not just admin ones).

### Database migration

`supabase/phase7.sql` — see `docs/database-schema.md`'s Phase 7 addendum
for the full column/function/policy list. Run it after `phase6.sql`.

### How the first administrator is assigned

There is intentionally no signup flow, invite code, or UI button that can
create an admin — that would itself be a privilege-escalation risk. The
first (and any subsequent) administrator is promoted manually, directly in
the Supabase SQL Editor, by someone with direct database access:

```sql
update public.profiles set role = 'admin' where email = 'the-real-admin@yourdomain.com';
```

This deliberate manual step is the actual root of trust for the entire
admin system. A future phase could add an admin-managed "promote another
admin" UI (itself gated by `is_admin()`), but Phase 7 does not include one.

### RLS policies

See `docs/database-schema.md`. Summary: `profiles`, `enrollments`,
`orders`, `certificates`, `lesson_progress`, and `courses` each gained one
new **read-only** policy scoped to `is_admin(auth.uid())`. No
INSERT/UPDATE/DELETE policy was added anywhere for admins — every
administrative write goes through a SECURITY DEFINER function that checks
`is_admin()` itself.

### Admin routes

`/admin` (dashboard), `/admin/students`, `/admin/students/[id]`,
`/admin/enrollments`, `/admin/orders`, `/admin/courses`,
`/admin/certificates`.

### Complimentary enrollment workflow

From `/admin/enrollments`: search for a student by name/email → select a
course → choose a type (complimentary / scholarship / administrative) →
optional internal note → confirm. This calls
`grantComplimentaryEnrollment()` (`lib/actions/admin.ts`), which calls
`admin_grant_enrollment()` in the database. The resulting enrollment
records `granted_by` (the admin's user id) and `admin_note`, so every
complimentary enrollment is auditable to who granted it, when, and why.
An enrollment can be revoked (`status = 'revoked'`) via
`admin_revoke_enrollment()`, which never deletes the row.

### Order management

`/admin/orders` reads the existing Phase 6 `orders` table (via the new
admin-read RLS policy) — no new payment logic was added. Filterable by
status. No refund action exists in the UI yet, per the brief; see
`PHASE7-NOTES.md` "Refund/access status architecture."

### Certificate management

`/admin/certificates` is read-only by design — there is no administrative
override to issue a certificate outside `issue_certificate_if_eligible()`
(Phase 6). This was a deliberate choice: an unaudited override would
undermine the entire point of server-side-verified completion.

### Environment variables

No new environment variables in Phase 7 — the admin area uses the same
Supabase connection as everything else, gated by the database `role`
column rather than a separate credential.

### Testing procedure

See "Testing the student lifecycle" above for the student side. For
admin, once you've promoted an account to `role = 'admin'` as described
above:

1. **Student cannot access `/admin`** — log in as a non-admin student and
   navigate to `/admin` directly; confirm you're redirected to
   `/dashboard`.
2. **Admin can access `/admin`** — log in as the admin account; confirm
   the dashboard loads with real counts (not placeholders).
3. **Student cannot self-promote** — while signed in as a student, attempt
   `supabase.from('profiles').update({ role: 'admin' }).eq('id', <own id>)`
   directly (e.g. from the browser console using the app's own Supabase
   client). Confirm the row's `role` is still `'student'` afterward.
4. **Grant complimentary enrollment** — as admin, grant a student a
   complimentary enrollment in AI-101; confirm it appears on
   `/admin/enrollments` and on that student's `/admin/students/[id]` page,
   and that the student can now access `/courses/ai-101/learn` without
   paying.
5. **Duplicate enrollment handled safely** — attempt to grant the same
   student the same course again; confirm a clear "already enrolled"
   error, not a duplicate row.
6. **Existing paid enrollment/order data intact** — confirm any Phase 6
   test purchases still display correctly on `/admin/orders` and the
   relevant student's detail page.
7. **Responsive check** — view `/admin`, `/admin/students`, and
   `/admin/orders` at mobile, tablet, and desktop widths; confirm tables
   either scroll horizontally or (students list) switch to stacked cards
   below `md`.

## Phase 8 — Operational Administration

Builds on Phase 7's admin system with an audit log, admin-to-admin
promotion, and secure Stripe refunds. See `PHASE8-NOTES.md` for the full
implementation report and security review.

### Admin promotion (`/admin/admins`)

Unlike the very first administrator (see the Phase 7 section above, which
still requires direct database access — that hasn't changed), every
*subsequent* admin can now be promoted from within the app itself, by an
existing admin, via `/admin/admins`. This calls `admin_promote_user()`
(`supabase/phase8.sql`), which re-verifies the caller is already an admin,
checks the target account exists and isn't already an admin, performs the
promotion, and records it in `admin_audit_log` — all as one atomic
database transaction. The Phase 7 self-escalation-prevention trigger is
still fully in effect underneath this; `admin_promote_user()` doesn't
bypass it, it simply satisfies it (the trigger sees that the *calling*
user is already an admin and allows the change through).

### Audit log (`/admin/activity`)

Every sensitive administrative action — admin promotion, complimentary
enrollment granted/revoked, refund initiated/completed, an enrollment
revoked because of a refund, course metadata updated — is recorded in
`admin_audit_log`. Students have no access to this table at all (no RLS
policy grants them anything); admins can read it, but **nobody** can write
or delete a row through the app — every entry is inserted by a SECURITY
DEFINER function as part of the action it's recording, never by a
standalone insert.

### Stripe refund architecture

From `/admin/orders`, a paid order shows a "Refund" action that opens a
confirmation panel showing the student, course, amount, current status,
and Stripe reference, and requires the admin to explicitly choose
**Refund only** or **Refund + revoke course access** — refunding never
silently assumes access should be removed.

The server-side flow (`refundOrder()` in `lib/actions/admin.ts`):
1. Re-verify the order is currently `'paid'` (a fresh read, not trusting
   whatever the browser last rendered).
2. Log `refund_initiated` — before touching Stripe, so an attempt is on
   record even if what follows fails.
3. Call Stripe's refund API (`STRIPE_SECRET_KEY`, server-only).
4. **Only if Stripe confirms success**, call `admin_mark_order_refunded()`,
   which atomically guards against double-processing (`WHERE status =
   'paid'`) and optionally revokes the linked enrollment.
5. If the database update fails *after* Stripe already succeeded, this is
   surfaced as a loud, explicit error rather than silently treated as
   success — see the comment in `refundOrder()` for why that state needs a
   human to check Stripe and the order manually.

The order row is never deleted at any point, before or after a refund —
it remains the permanent financial record, exactly as before, just with
`status = 'refunded'`.

### Payment vs. access status

`/admin/orders` now shows two independent status columns — payment status
(from `orders.status`) and enrollment status (from `enrollments.status`,
looked up via `enrollments.order_id`) — so "Refunded / Active" and
"Refunded / Revoked" are both visible outcomes, matching how the refund
action actually works.

## Live Verification Checklist (Phase 7 + Phase 8)

Run this after connecting to a real Supabase project and Stripe test-mode
account. **Do not perform a real-money refund during development
testing** — use Stripe test mode throughout.

1. Promote the first administrator through the documented secure bootstrap procedure (Phase 7 section above — direct SQL, not the app).
2. Sign in as a normal student.
3. Attempt to change that student's role to admin (e.g. via the browser console, calling the app's own Supabase client directly).
4. Confirm the Phase 7 self-escalation-prevention trigger blocks the change — the row's `role` should still read `'student'` afterward.
5. Sign in as the administrator.
6. Promote a test student through `/admin/admins`.
7. Confirm the `admin_promoted` event appears on `/admin/activity`.
8. Grant a complimentary enrollment via `/admin/enrollments`.
9. Confirm the student now has course access (can reach `/courses/ai-101/learn`).
10. Revoke that enrollment from `/admin/enrollments`; confirm access is removed and `enrollment_revoked` appears in the activity log.
11. Complete a real Stripe test-mode purchase as a different test student (test card `4242 4242 4242 4242`).
12. Confirm the order appears in `/admin/orders` with status "Paid."
13. Refund that order choosing **Refund only**.
14. Confirm the Orders page shows Payment: Refunded, Enrollment: Active.
15. Perform another test transaction as a third test student.
16. Refund that one choosing **Refund + revoke access**.
17. Confirm Payment: Refunded, Enrollment: Revoked.
18. Confirm both `refund_initiated` and `refund_completed` (and, for step 16, `enrollment_revoked_refund`) appear in `/admin/activity`, newest first.

## Phase 9 — Admin Demotion & Course Authoring

Adds safe administrator demotion and a full module/lesson authoring
system to the admin dashboard. See `PHASE9-NOTES.md` for the complete
implementation report, including the deletion-safety design decision.

### Safe administrator demotion

From `/admin/admins`, an existing admin can demote another admin (or
themselves) back to a student account, with a confirmation panel that
explains the consequence before acting. The critical protection —
**the last remaining administrator can never be demoted** — is enforced
in the database, not just the UI: `admin_demote_user()`
(`supabase/phase9.sql`) counts current admins and rejects the request if
that count is `1`, before any change is made. The same single check
naturally covers self-demotion too (if you're the only admin, demoting
yourself is still rejected).

### Course Builder

`/admin/courses/[id]` now includes a full **Course Content** section
below the existing metadata editor: every module in position order, each
expandable to show its lessons in position order, with create/edit/
delete/reorder actions for both. Lesson editing happens on a dedicated
route, `/admin/courses/[id]/lessons/[lessonId]`, since lesson content can
be substantial.

All course-authoring writes go through SECURITY DEFINER functions
(`admin_create_module`, `admin_update_module`, `admin_delete_module`,
`admin_create_lesson`, `admin_update_lesson`, `admin_delete_lesson`,
`admin_reorder_modules`, `admin_reorder_lessons`) — there is no client
INSERT/UPDATE/DELETE policy on `courses`, `modules`, or `lessons`. Every
mutation is logged to `admin_audit_log`.

### Module/lesson deletion safety

Deleting a module cascades to its lessons, which cascades to
`lesson_progress` — meaning a routine content edit could silently destroy
real student completion history. `admin_delete_module()` and
`admin_delete_lesson()` both check for existing student progress first
and refuse to delete (recommending unpublishing instead) if any is found.
The Course Builder UI shows this same information before the admin even
attempts the action, and requires an explicit second confirmation for any
module deletion (since it can cascade to multiple lessons at once).

### Reordering

Simple number-based positions with ▲/▼ buttons, not drag-and-drop, per
the brief. Reordering goes through `admin_reorder_modules()` /
`admin_reorder_lessons()`, which use an atomic two-phase update (move
everything to negative positions, then assign final positions) so the
unique `(course_id, position)` / `(module_id, position)` database
constraints are never violated mid-operation — a plain sequential update
could otherwise fail partway through when two positions need to swap.

### `lib/courseData.ts` vs. the database

No migration was needed here. `lib/data/courses.ts`'s `getCourseBySlug()`
already reads modules and lessons from Supabase first, when configured —
`lib/courseData.ts` has only ever been the offline/unconfigured fallback
since Phase 6. This means Phase 9's authoring mutations already flow
straight into the live learner experience; there was no second source of
truth to reconcile. See `PHASE9-NOTES.md` for the full explanation.

## Phase 9 Live Verification Checklist

Run this after connecting to a real Supabase project.

1. Admin A promotes Admin B (via `/admin/admins`, from Phase 8).
2. Admin A demotes Admin B; confirm Admin B loses `/admin` access.
3. Confirm `admin_demoted` appears in `/admin/activity`.
4. With only one admin remaining, confirm attempting to demote them is rejected (both the UI's disabled state and, ideally, a direct RPC call).
5. With two admins, confirm self-demotion succeeds; with one admin, confirm self-demotion is rejected.
6. Signed in as a student, confirm calling `admin_demote_user` (or any Phase 9 RPC) directly fails with "Not authorized."
7. Create a module on AI-101 (or a test course) via the Course Builder.
8. Edit that module's title/description/position.
9. Reorder modules using the ▲/▼ controls; confirm the new order persists after a page refresh.
10. Create a lesson inside a module.
11. Edit that lesson via its dedicated edit route.
12. Toggle a lesson between Published and Draft.
13. Reorder lessons within a module.
14. Attempt to create a module with a slug that already exists in that course; confirm a clear error, not a generic failure.
15. Attempt to create a module at a position already used in that course; confirm a clear error.
16. Repeat 14–15 for a duplicate lesson slug/position within the same module.
17. As a signed-out visitor, confirm an unpublished lesson's URL is not accessible.
18. Confirm a published lesson remains accessible to enrolled students.
19. On a lesson with real student progress, confirm the delete action is blocked with a clear explanation, and that unpublishing it (instead of deleting) still works.
20. Confirm every authoring mutation above produced a matching entry in `/admin/activity`.
21. As a student, confirm `/admin/courses/[id]` and the Course Builder are unreachable.
22. Confirm existing AI-101 lesson progress (from before this migration) is unaffected.
23. Confirm certificate issuance still works end to end.
24. Confirm the Phase 8 refund flow (refund-only and refund+revoke) still works.

## Phase 10 — Multi-Course Platform

Turns the academy into a true multi-course platform: admins can create a
new course, build it with the existing Course Builder, publish it, and it
appears automatically on the public site — no new Next.js route required
per course. See `PHASE10-NOTES.md` for the complete implementation report.

### Creating a course

From `/admin/courses`, click **Create Course**. The form auto-suggests a
slug from the title (still editable), and on success redirects straight
into the existing Phase 9 Course Builder at `/admin/courses/[id]` to add
modules and lessons — the same authoring system AI-101 uses, not a
duplicate. Course creation goes through `admin_create_course()`
(`supabase/phase10.sql`), which validates the slug, rejects duplicates
with a clear error, and records the action in the audit log.

### Dynamic public catalog

`/courses` now loads every published course from Supabase and renders a
card for each — title, short description, price, and a link to its page.
No published courses yet? The page shows a friendly "more learning paths
are on the way" message instead of an empty page. AI-101 appears here
automatically, exactly like any other published course.

### Dynamic course pages

`/courses/[slug]` is the new reusable public marketing page for any
course — it queries Supabase by slug, shows modules/lesson counts,
pricing, and the same `EnrollmentCTA` used everywhere else, and calls
Next.js's real `notFound()` (from a Server Component, for a correct 404)
if the slug doesn't exist or isn't published.

### AI-101 compatibility

`/courses/ai-101` and its nested `/learn`, `/assessment`, and
`/purchase/...` routes are completely untouched — they're still their own
hardcoded folders under `app/courses/ai-101/`. Next.js always resolves an
exact static folder match (`ai-101`) ahead of a dynamic sibling (`[slug]`)
at the same level, so there is no routing conflict; the two systems
coexist safely by construction, not by careful ordering.

### Stripe / multi-course purchase readiness

`createCheckoutSession()` (`lib/actions/payments.ts`) was already
parameterized by `courseSlug`, not hardcoded to AI-101 — it builds its
Stripe success/cancel URLs generically. The one missing piece was that
only AI-101 had matching `/purchase/success` and `/purchase/canceled`
pages to redirect back to; Phase 10 adds generic versions at
`/courses/[slug]/purchase/success` and `/courses/[slug]/purchase/canceled`
(new routes, no collision with AI-101's static ones, same precedence rule
as above). **This means a new paid course created through the admin
dashboard can already be purchased end to end** — no further checkout
generalization work was required.

**What's intentionally still AI-101-specific, deferred to Phase 11**: the
learning interface itself (`/courses/ai-101/learn/[lessonSlug]`) and the
assessment page (`/courses/ai-101/assessment`) are not yet generalized to
`/courses/[slug]/learn/...` — a new course's modules/lessons can be
authored and purchased, but a dedicated learner delivery route for that
new course doesn't exist yet. Generalizing those was judged higher-risk
(they involve enrollment gating, progress tracking, and the assessment
RPC's course-id assumptions) and was deliberately left out of this phase
per the brief's explicit guidance to avoid unnecessary regression risk.

## Phase 11 — Generic Learner Delivery

Completes what Phase 10 started: every course created through the admin
dashboard now has real lesson delivery, an assessment, dashboard
visibility, and certificate eligibility — not just AI-101. See
`PHASE11-NOTES.md` for the complete implementation report.

### Dynamic lesson delivery

`/courses/[slug]/learn` and `/courses/[slug]/learn/[lessonSlug]` reuse the
exact same `CourseSidebar`/`LessonView` components and data-layer
functions (`getCompletedLessonSlugs`, `markLessonCompleteRemote`,
`findContinueLessonSlug`, etc.) that AI-101's hardcoded routes already
used — those were never actually AI-101-specific under the hood, only the
route files were missing. `middleware.ts`'s learn-route protection
(`/courses/:slug/learn/:path*`) was already slug-agnostic since Phase 6
and required no change.

### Dynamic assessments

`/courses/[slug]/assessment` reuses `getPublishedAssessment()` and
`submitAssessment()` unchanged. **A real gap was found and fixed here**:
the server-side `submit_assessment_attempt()` function checked
authentication but never checked course enrollment — see "Security fixes"
below.

### Course completion & certificates, generalized

`/dashboard`, `/dashboard/courses`, and `/dashboard/certificates` were all
**hardcoded to load only AI-101**, regardless of what else a student was
enrolled in — this directly blocked the "course appears in dashboard"
milestone. All three now use a new `getMyEnrolledCourses()` function and
render a card per enrolled course via two new shared components
(`EnrolledCourseSummaryCard`, `CertificateCard`). Certificate eligibility
logic itself (`issue_certificate_if_eligible`, unchanged since Phase 6)
was already fully generic — the gap was purely that the dashboard never
asked it about any course besides AI-101.

### Security fixes found during this phase

1. **`submit_assessment_attempt()` had no enrollment check at all.** Any
   signed-in student could call it directly, bypassing the UI, with any
   published assessment id from any course. Fixed via `CREATE OR REPLACE`
   in `supabase/phase11.sql` — the function now requires a non-`'revoked'`
   enrollment row for the assessment's course before scoring proceeds.
2. **A revoked enrollment still granted lesson/assessment access.** The
   `Enrollment.status` TypeScript type had gone stale after Phase 9 added
   `'revoked'`/`'refunded'` at the database level, masking that the
   existing `Boolean(enrollment)` access checks didn't exclude revoked
   rows. Added `hasCourseAccess()` (`lib/data/progress.ts`) and applied it
   everywhere access is gated — **including the pre-existing AI-101 lesson
   page, and the AI-101 assessment page, which had no enrollment gate of
   any kind before this fix.**
3. **Two hardcoded-AI-101 bugs found via a full-codebase sweep**: an
   admin editing any course's metadata always revalidated `/courses/ai-101`
   regardless of which course was actually edited; the enrollment and
   completion transactional emails always linked to `/courses/ai-101/...`
   regardless of the actual course. Both fixed.

### AI-101 protection

AI-101's own routes work exactly as before, with the two security fixes
above applied identically (a strictly positive change — closing gaps, not
altering intended behavior). No destructive database change was made; the
one SQL change is a `CREATE OR REPLACE` of an existing function, not a
schema alteration.

## Phase 12 — Launch Verification & Academy Operations

Strengthens academy operations (student/enrollment filters, per-course
stats, a Launch Readiness page) and validates the generic multi-course
architecture from Phase 11. See `PHASE12-NOTES.md` for the complete
implementation report and security review.

### Admin student & enrollment operations

`/admin/students` and `/admin/enrollments` both gained course and
enrollment-status filter dropdowns (Active, Enrolled, Completed, Revoked,
Cancelled, Refunded). `/admin/students/[id]` is now organized into the
five sections the brief specifies — **Student**, **Enrollments**,
**Progress**, **Assessments**, **Certificates** — with assessment
attempts now genuinely visible for the first time (see "A real gap
found," below).

### Course-level operations

`/admin/courses/[id]` now shows active/completed enrollment counts,
completion rate, assessment pass rate, and certificates issued per
course, plus a direct link to that course's filtered student list.

### A real gap found and fixed

No RLS policy in any prior phase granted admins read access to
`assessment_attempts` — only `"read own"` existed (Phase 4). This meant
an admin's ordinary session could not see **any** student's assessment
score, anywhere in the app, blocking the Phase 12 brief's explicit
requirement to show "Attempts, scores, passing status" in the student
detail view. Fixed with one new read-only policy in
`supabase/phase12.sql`, identical in shape to every other admin-read
policy already established since Phase 7.

### Launch Readiness page

`/admin/launch-readiness` reports **Ready / Needs Attention / Unable to
Verify** for Supabase, database migrations, Stripe, the Stripe webhook,
Resend, the production site URL, admin access, published course
availability, checkout, and certificate configuration. It never displays
a secret value — only whether required configuration appears to exist
(confirmed by code review: every secret is checked via `Boolean(...)`,
never interpolated into a displayed string; `NEXT_PUBLIC_SITE_URL` is the
one value shown directly, since it's a public, non-secret setting by
design).

### Legacy route review (Phase 12 brief section 8)

Every AI-101-specific route was reviewed individually:

| Route | Disposition |
|---|---|
| `/courses/ai-101` | **Retained.** A real, published course's marketing page — not legacy, still the primary way visitors discover AI-101. |
| `/courses/ai-101/learn`, `/learn/[lessonSlug]` | **Retained.** Duplicates the generic `/courses/[slug]/learn/...` route's *behavior*, but is a distinct file, not dead code — AI-101 students' existing bookmarks/links keep working. Next.js's own routing precedence (exact static folder beats a dynamic sibling) means both can never conflict, so there is nothing to consolidate without deleting a working route. |
| `/courses/ai-101/assessment` | **Retained**, same reasoning. Also received the Phase 11 enrollment-gate fix, so it's no longer just a duplicate — it now has parity with the generic version. |
| `/courses/ai-101/purchase/success`, `/purchase/canceled` | **Retained.** Real Stripe redirect targets already in production use (any live checkout session created before this phase points here). |

**Nothing was removed or redirected.** Every AI-101 route contains real,
still-necessary behavior — none of them are unreachable dead code, and
none of them diverge from the generic routes in any way that would make a
redirect safe (a redirect would need the two to be behaviorally
identical, which they now are, but redirecting a route with real existing
traffic and bookmarks for no functional gain is unnecessary risk for zero
benefit). No consolidation was performed, per the brief's explicit "do
not blindly delete legacy routes" and "if removing a route risks breaking
existing links, use a redirect or compatibility strategy" guidance — the
safest compatibility strategy here was simply not touching them.

### Second-Course Validation Procedure

Per the brief: **no fake student activity was created.**
`supabase/optional-second-course-fixture.sql` creates one real,
disposable course (with real modules, lessons, and a 1-question
assessment) — nothing else. Every enrollment, progress record, and
certificate produced while validating it should come from a real signup
and a real (test-mode) Stripe purchase, performed by hand.

To validate:
1. Run `supabase/optional-second-course-fixture.sql` once against your Supabase project.
2. Confirm the course **appears correctly in the catalog** at `/courses`.
3. Open its **course detail page** at `/courses/ai-101-validation-course` and confirm the price, description, and module list are its own, not AI-101's.
4. Click through **checkout** and confirm the Stripe Checkout page shows this course's price and name, not AI-101's.
5. Complete a **test-mode purchase**; confirm the resulting **enrollment** references this course's id, not AI-101's.
6. Confirm the course **appears on the student's dashboard** alongside (not replacing) any AI-101 enrollment the same test account has.
7. Confirm the student can **enter the correct course** — `/courses/ai-101-validation-course/learn` shows this course's own two lessons, not AI-101's thirty.
8. Complete both lessons; confirm **lesson progress is isolated by course** — AI-101 progress (if any) on the same account is untouched, and vice versa.
9. Confirm the **assessment belongs to the correct course** — `/courses/ai-101-validation-course/assessment` shows this course's own single question.
10. Attempt to call `submit_assessment_attempt` for this course's assessment while enrolled only in AI-101 (or vice versa); confirm it's rejected — this is the Phase 11 fix, re-verified here against a genuinely different course pair.
11. Confirm **completion is calculated independently** — passing this course's assessment doesn't affect AI-101's certificate eligibility.
12. Pass the assessment and claim the certificate; confirm it **identifies the correct course** (title and certification name are this course's own, set in the fixture).
13. Confirm the **enrollment/completion/certificate emails identify the correct course** (subject line and links point to `ai-101-validation-course`, not `ai-101`).
14. Confirm **admin views identify the correct course** — `/admin/students/[id]`, `/admin/enrollments`, and `/admin/courses/[id]` all show this course distinctly from AI-101.
15. Confirm **cache revalidation doesn't rely on AI-101-specific routes** — after editing this course's metadata as an admin, its own public page reflects the change (this was a real bug found and fixed in Phase 11 — see that phase's notes).

## End-to-End Acceptance Test Checklist

The basic student journey, to walk through before public launch:

Visitor → Catalog (`/courses`) → Course page → Create/sign into account →
Checkout → Successful payment → Enrollment created → Student dashboard →
Open course → Complete lessons → Take assessment → Pass → Course
completion → Certificate generated → Certificate accessible.

**Expected result at each step**: the visitor never needs to already know
a course exists; the catalog and course page both load without a
signed-in session; checkout requires login (redirecting back to the
correct course afterward); payment success is confirmed by the database,
not the redirect URL alone (`/courses/[slug]/purchase/success` polls real
order status); the enrollment appears on the dashboard within moments of
the webhook processing; lesson progress persists across page reloads;
the assessment is unavailable until all lessons are complete; a passing
score unlocks certificate claiming; the certificate is visible on
`/dashboard/certificates` and independently verifiable at `/verify`.

Also test, with expected results:

- **Failed payment** — use Stripe's documented test card for a decline; confirm no enrollment is created and the order shows `failed`, not `paid`.
- **Duplicate checkout attempt** — start checkout twice for the same course without completing either; confirm no duplicate enrollment results once one succeeds (Phase 6's `process_stripe_payment_event` guard).
- **Logged-out protected route** — visit `/dashboard` or `/courses/[slug]/learn` signed out; confirm a redirect to `/login` with the original destination preserved.
- **Student without enrollment** — visit a course's learn/assessment route while signed in but not enrolled; confirm the enrollment CTA appears, not lesson content.
- **Revoked enrollment** — have an admin revoke a test student's enrollment; confirm that student immediately loses lesson and assessment access (Phase 11's `hasCourseAccess()` fix).
- **Cross-course access** — enroll a test student in course A only; confirm they cannot reach course B's lessons.
- **Cross-course assessment submission** — attempt `submit_assessment_attempt` for course B's assessment while enrolled only in course A; confirm rejection (Phase 11's server-side fix).
- **Failed assessment attempt** — score below the passing threshold; confirm the result page shows "Not Passed" and no certificate becomes claimable.
- **Assessment retake** — confirm "Retake Assessment" allows a new attempt, and that the latest passing attempt (if any) is what the certificate check honors.
- **Existing certificate retrieval** — revisit `/dashboard/certificates` after a certificate is already issued; confirm it displays without re-triggering issuance (Phase 6's idempotent `issue_certificate_if_eligible`).
- **Mobile navigation** — verify the public site, student dashboard, and every admin screen at a phone width; confirm no horizontal overflow and that tables either scroll or become cards.
- **Admin/student authorization boundaries** — confirm a student account cannot reach any `/admin/*` route, and that no admin Server Action succeeds when called by a non-admin session.

## Architecture Notes

- `supabase/schema.sql` — Phase 4 schema, RLS, and the assessment/certificate security functions.
- `supabase/seed.sql` — AI-101 course content.
- `supabase/phase5.sql` — notification preferences and email-tracking columns.
- `supabase/phase5.1.sql` — reliability correction: race-safe claim/complete/release functions for all four transactional emails.
- `supabase/phase6.sql` — course pricing, the `orders` table, Stripe-related SECURITY DEFINER functions, and the necessary `enrollments` policy tightening for paid courses.
- `supabase/phase7.sql` — admin roles, the self-escalation-prevention trigger, admin read policies, and complimentary-enrollment functions.
- `supabase/phase8.sql` — the audit log, admin promotion, Stripe refund functions, and course-metadata editing.
- `supabase/phase9.sql` — safe admin demotion and full module/lesson course-authoring.
- `supabase/phase10.sql` — multi-course creation (`admin_create_course`).
- `supabase/phase11.sql` — generic learner delivery; also fixes a real assessment-ownership gap.
- `lib/supabase/` — browser client, server client, `isSupabaseConfigured()`, and `admin.ts` — the service-role client used exclusively by the Stripe webhook (not by the admin UI, which uses the ordinary RLS-scoped server client — see the Phase 7/8 sections above).
- `lib/stripe/server.ts` — server-only Stripe client, used by `lib/actions/payments.ts`, `lib/actions/admin.ts` (refunds), and the webhook route.
- `lib/actions/` — Server Actions: `marketing.ts`, `email.ts`, `payments.ts`, `admin.ts` (student search, enrollment grant/revoke, admin promotion/demotion, refunds, course/module/lesson authoring).
- `app/api/webhooks/stripe/route.ts` — the only place a payment can ever mark an order paid or create a paid-course enrollment.
- `app/admin/` — the admin dashboard, gated entirely by `app/admin/layout.tsx`.
- `components/EnrollmentCTA.tsx` — the shared free-enroll/paid-checkout button used across the dashboard, course pages, and lesson-access gate.
- `components/admin/CourseBuilder.tsx` — the module/lesson authoring interface.
- `components/admin/CreateCourseForm.tsx` — course creation, redirects into the Course Builder on success.
- `app/courses/[slug]/` — the dynamic public course marketing page, generic learn/assessment/purchase routes; coexists safely with `app/courses/ai-101/`'s static routes (Next.js prefers the exact static match).
- `lib/data/progress.ts` — now also `getMyEnrolledCourses()` and `hasCourseAccess()`, used by the generalized dashboard and every learn/assessment access gate.
- `components/dashboard/EnrolledCourseSummaryCard.tsx`, `components/dashboard/CertificateCard.tsx` — self-contained per-course cards used by the generalized dashboard pages.
- `lib/data/` — the data-access layer (courses, progress, assessment, certificates, profiles, admin).
- `lib/email/` — `resend.ts` (graceful-skip sending), `templates.ts` (escaped, CTA-enabled templates, now course-slug-aware), `site-url.ts`.
- `lib/auth.tsx` — the auth context (`useAuth()`), delegating profile reads to `lib/data/profiles.ts`.
- `middleware.ts` — protects `/dashboard/*`, `/admin/*`, and `/courses/*/learn/*` routes (the Stripe webhook route is intentionally outside this — Stripe's own signature is its authorization).
- `app/admin/launch-readiness/` — safe configuration status checks, never displaying secret values.
- `supabase/optional-second-course-fixture.sql` — an optional, disposable second course for manually validating the multi-course architecture; not part of the required migration chain.
- `lib/monitoring.ts`, `lib/analytics.ts` — graceful-degradation wrappers (Phase 14), inert until a real provider is configured, matching the same pattern as Stripe/Resend.
- `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `app/sitemap.ts`, `app/robots.ts` — added in Phase 14; all five were previously missing.
- See `docs/database-schema.md` for the full schema history, `PHASE5-NOTES.md`/`PHASE5.1-NOTES.md`/`PHASE6-NOTES.md`/`PHASE7-NOTES.md`/`PHASE8-NOTES.md`/`PHASE9-NOTES.md`/`PHASE10-NOTES.md`/`PHASE11-NOTES.md`/`PHASE12-NOTES.md` for prior phases, and `PHASE14-NOTES.md` for the launch-polish changes.


## Phase 13 — Production Integration & Launch Control

Phase 13 intentionally freezes new product scope and focuses on getting the existing academy safely deployable. The admin area now includes `/admin/acceptance-test`, a repeatable pre-launch checklist covering the full visitor → payment → enrollment → learning → assessment → certificate journey plus declined payments, duplicate checkout, revoked access, cross-course isolation, authorization boundaries, and mobile QA.

`/admin/launch-readiness` now also checks the server-only Supabase service-role dependency, identifies Stripe test/live mode without exposing the key, and rejects localhost/non-HTTPS values as production-ready site URLs. A configuration-only "Ready" result is not a launch approval; the acceptance test must still pass against real external services.

See `docs/production-launch-runbook.md` for the exact migration/deployment order, required environment variables, Stripe events, go/no-go rules, and post-launch smoke test. `npm run typecheck` is also now available as a standard local/CI verification command.

## Phase 14 — Launch Polish & Observability

Per Phase 13's own recommendation, Phase 14 adds no new course-platform
features — it closes the gap between "the payment-to-certificate path
works" and "the site behaves like a real production website." See
`PHASE14-NOTES.md` for the complete implementation report.

### What was missing before this phase

`app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`,
`app/sitemap.ts`, and `app/robots.ts` did not exist at all — any unhandled
error or bad URL fell through to Next.js's unstyled default pages, and
the site had no sitemap or robots directives. All five now exist, styled
consistently with the rest of the academy.

**`/privacy` and `/terms` were still their literal Phase 2 placeholder
text** — "a complete privacy policy will be published before the academy
begins collecting learner account, enrollment, or payment information" —
despite the platform having processed real Stripe payments and stored
real learner data since Phase 6. Both were rewritten as comprehensive,
honest drafts describing the platform's actual data practices (Supabase,
Stripe, Resend, admin access, the audit log, certificate verification),
clearly labeled **"Draft — Pending Legal Review"** rather than presented
as final legal text — this project has not had, and does not have, a
lawyer review these pages.

### Error monitoring & analytics

`lib/monitoring.ts` and `lib/analytics.ts` follow the exact
graceful-degradation shape already established for Stripe/Resend
elsewhere in this codebase: they work today with zero configuration
(server errors log to console, which most hosts capture automatically;
analytics is simply inert), and become a real third-party integration
later by filling in one clearly-marked spot — no call-site changes
required anywhere else. `track()` is now called at five real conversion
points (signup, enrollment start/complete, assessment pass, certificate
issued), but fires nothing at all unless `NEXT_PUBLIC_ANALYTICS_ID` is
set — a deliberate privacy-by-default choice, since no cookie-consent
mechanism exists yet to pair with a real analytics provider.

### SEO

Six static marketing pages gained real per-page metadata; the dynamic
`/courses/[slug]` route gained `generateMetadata()`; the `/courses`
catalog and `/courses/ai-101` pages — previously Client Components, which
can't export page metadata — were each split into a thin Server Component
wrapper (metadata) plus an extracted client component (the existing
interactive body, moved verbatim into `components/marketing/`). Confirmed
by diff that both extractions preserve the original code exactly, aside
from the function name.

### Launch-day smoke test

`docs/launch-day-smoke-test.md` — a fast ~10-minute check distinct from
the full `/admin/acceptance-test`, meant for routine "did the deploy
work" confidence after a normal deploy, not as a pre-launch substitute
for the full checklist.

## Phase 15 — Production Integration & Launch Validation

An audit-and-harden pass, not a feature phase — see `PHASE15-HANDOFF.md`
for the complete, transparent report of what was audited, what genuine
problems were found and fixed (a hardcoded `metadataBase`, a missing
favicon, and an acceptance test that didn't separate actions from
expected results), and what remains untestable without live external
credentials.

**Before launching, work through these two documents in order:**
1. `docs/OWNER-ACTION-GUIDE.md` — numbered, non-developer instructions for every external setup step (Supabase, Stripe, Resend, domain, environment variables, the first admin, a real test purchase).
2. `docs/PHASE15-LAUNCH-CHECKLIST.md` — a checkbox-based final verification, organized by Supabase / Stripe / Resend / Domain / Environment Variables / Deployment / Post-Deployment Smoke Test / Mobile / Security / Final Go-Live Approval.

`/admin/acceptance-test` was also rewritten this phase into an explicit
step → action → expected-result format covering the brief's exact
14-step critical journey plus 13 failure-path/security scenarios.

## Phase 16 — Full-Stack Dependency, Build & Compliance Audit

An audit-and-harden pass, not a feature phase. See `PHASE16-NOTES.md` for
exact findings and fixes, `PHASE16-HANDOFF.md` for what's ready vs. not,
and `docs/PHASE16-VERIFICATION-REPORT.md` for the exact commands run and
exact results (including the honest limits of what this sandbox can
verify without npm registry access).

**The one real bug fixed**: Stripe checkout previously fell back to a
relative redirect URL if `NEXT_PUBLIC_SITE_URL` was missing or invalid —
now it fails immediately with a clear configuration error, before any
database row is created, and launch-readiness reporting uses the exact
same validation logic so it can never disagree with what checkout will
actually do.

**Also added**: a real `NEXT_PUBLIC_CONTACT_EMAIL` mechanism for
`/contact` (no fabricated address), founder-photo replacement
instructions, a Next.js patch-version bump, and fixes for the specific
`react/no-unescaped-entities` violations identified in this phase's
brief.

## Phase 17 — Full Production Hardening Audit

A security/performance/accessibility/data-integrity audit, not a feature
phase. Four standalone review documents plus `PHASE17-NOTES.md` tie
everything together:
- `SECURITY-AUDIT-REPORT.md`
- `PERFORMANCE-REVIEW.md`
- `ACCESSIBILITY-REVIEW.md`
- `DATA-INTEGRITY-REVIEW.md`

**Real fixes applied** (all narrowly scoped, all reviewed in the
documents above): three sequential-fetch/N+1 patterns parallelized on the
student dashboard's data layer; a genuine keyboard-accessibility defect
fixed in the admin refund confirmation modal (it had no dialog semantics,
no Escape-to-close, and no focus trap at all); five numeric columns
(`courses.price_cents`/`sale_price_cents`, `modules.position`,
`lessons.position`/`duration_minutes`) gained database-level CHECK
constraints as defense-in-depth, via the new additive
`supabase/phase17.sql`.

**One real gap found and deliberately not fixed**: no rate limiting
exists anywhere in the application. This needs an infrastructure-level
decision (not something to build blind in an audit pass) — see
`SECURITY-AUDIT-REPORT.md` section 6 for the specific recommendation.

## Phase 18 — Corrective Verification: Reorder Function Fix

A corrective phase, not a feature phase. Phase 17's new
`CHECK (position >= 1)` constraints on `modules`/`lessons` directly
conflicted with Phase 9's module/lesson reorder functions, which used a
temporary *negative* position as part of their atomic-reorder technique.
Applied in sequence, this would have broken module and lesson reordering
completely. See `PHASE18-NOTES.md` for the full explanation, and
"Migration Sequencing" above for the required run order.

**Also fixed while reviewing those functions** (per this phase's explicit
review instruction): a duplicate-ID gap in the existing validation, and a
missing explicit check for a nonexistent parent course/module — both
documented in detail in `PHASE18-NOTES.md` and `supabase/phase18.sql`'s
own comments.

### Rollback

**Rolling back `phase18.sql` alone is not meaningful** — it only replaces
two functions; there's no data or schema state to "undo" beyond
restoring the Phase 9 version of those two functions, which would
immediately reintroduce the exact defect this phase fixes. Don't do this
unless you're also rolling back `phase17.sql`.

**Rolling back `phase17.sql` and `phase18.sql` together**, if ever
needed:
```sql
-- Reverts to the pre-Phase-17 constraint-free state and the pre-Phase-18
-- (Phase 9) reorder functions. Only do this together, never phase17.sql
-- alone — dropping the constraints without also reverting the reorder
-- functions is fine (phase18.sql's functions work correctly with or
-- without the constraints present), but reverting the functions without
-- dropping the constraints reintroduces the exact bug this phase fixes.
alter table public.courses drop constraint if exists courses_price_cents_check;
alter table public.courses drop constraint if exists courses_sale_price_cents_check;
alter table public.modules drop constraint if exists modules_position_check;
alter table public.lessons drop constraint if exists lessons_position_check;
alter table public.lessons drop constraint if exists lessons_duration_minutes_check;
```
Then re-run the Phase 9 versions of `admin_reorder_modules()`/
`admin_reorder_lessons()` from `supabase/phase9.sql` if you want to fully
revert to the pre-Phase-17 behavior (not recommended — Phase 18's
functions are strictly safer and have no downside versus Phase 9's,
constraints present or not).
# Phase 19 — First Successful Production Build

Phase 19 completed the first observed clean production build in the project
history. See `PHASE19-NOTES.md` and `PHASE19-HANDOFF.md` for the exact fixes,
verification results, remaining live-service checks, and recommended next phase.
# Phase 20 — Next.js 15 Maintenance LTS

Phase 20 migrates the application to Next.js 15.5.21 and React 19.2.8. Lint,
TypeScript, and the optimized production build pass. See `PHASE20-NOTES.md` and
`PHASE20-HANDOFF.md` for compatibility changes and the scheduled August 26,
2026 security-patch follow-up.
# Phase 21 — Production Integration & Launch Acceptance

Phase 21 adds secret-safe environment validation, a one-command release gate,
and an 11-route production smoke test. See `PHASE21-NOTES.md` and
`PHASE21-HANDOFF.md` for commands and the remaining owner-controlled live tests.
