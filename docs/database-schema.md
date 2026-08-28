# Database Schema Plan (Phase 3 — not yet implemented)

No database is connected in Phase 3. This document plans the schema so a
real backend (Supabase/PostgreSQL is assumed, matching `.env.example`) can
be connected in a later phase without redesigning the data model.

The client-side mock layers in `lib/auth.tsx` and `lib/progress.ts` were
written so their function signatures map onto these tables — swapping the
mock implementation for real Supabase calls should not require UI changes.

## profiles

One row per student, extending Supabase Auth's built-in user.

| column      | type      | notes                              |
|-------------|-----------|-------------------------------------|
| id          | uuid (PK) | matches `auth.users.id`             |
| email       | text      | mirrors auth email for convenience  |
| first_name  | text      |                                      |
| last_name   | text      |                                      |
| role        | text      | professional role, optional         |
| ai_experience | text    | one of the signup experience levels |
| created_at  | timestamptz | default now()                     |

## courses

| column      | type      | notes                        |
|-------------|-----------|-------------------------------|
| id          | uuid (PK) |                                |
| slug        | text      | unique, e.g. `ai-101`         |
| title       | text      |                                |
| description | text      |                                |
| status      | text      | `draft` / `published`         |
| created_at  | timestamptz |                              |

## modules

| column      | type      | notes                              |
|-------------|-----------|--------------------------------------|
| id          | uuid (PK) |                                      |
| course_id   | uuid (FK) | references `courses.id`             |
| title       | text      |                                      |
| position    | int       | order within the course             |

## lessons

| column           | type      | notes                              |
|------------------|-----------|--------------------------------------|
| id               | uuid (PK) |                                      |
| module_id        | uuid (FK) | references `modules.id`             |
| slug             | text      | unique within the course            |
| title            | text      |                                      |
| content          | text      | markdown or rich text               |
| position         | int       | order within the module             |
| duration_minutes | int       |                                      |

## enrollments

| column       | type      | notes                              |
|--------------|-----------|--------------------------------------|
| id           | uuid (PK) |                                      |
| user_id      | uuid (FK) | references `profiles.id`            |
| course_id    | uuid (FK) | references `courses.id`             |
| enrolled_at  | timestamptz |                                    |
| completed_at | timestamptz | nullable                          |
| status       | text      | `active` / `completed` / `dropped`  |

## lesson_progress

| column        | type      | notes                             |
|---------------|-----------|-------------------------------------|
| id            | uuid (PK) |                                     |
| user_id       | uuid (FK) | references `profiles.id`           |
| lesson_id     | uuid (FK) | references `lessons.id`            |
| completed     | boolean   | default false                      |
| completed_at  | timestamptz | nullable                         |

Replaces `lib/progress.ts`'s localStorage-based `completedLessonSlugs`.

## assessments

| column        | type      | notes                        |
|---------------|-----------|--------------------------------|
| id            | uuid (PK) |                                 |
| course_id     | uuid (FK) | references `courses.id`        |
| title         | text      |                                 |
| passing_score | int       | percentage, e.g. 80             |

Assessment questions/options are not modeled as a separate table yet —
Phase 3 keeps them in `lib/courseData.ts`. A future `assessment_questions`
table (question text, options as jsonb, correct index) is a natural next
step once assessments need to be editable without a code change.

## assessment_attempts

| column        | type      | notes                             |
|---------------|-----------|--------------------------------------|
| id            | uuid (PK) |                                     |
| user_id       | uuid (FK) | references `profiles.id`           |
| assessment_id | uuid (FK) | references `assessments.id`        |
| score         | int       | percentage                          |
| passed        | boolean   |                                      |
| attempted_at  | timestamptz |                                    |

Replaces `lib/progress.ts`'s localStorage-based assessment result.

## certificates

| column            | type      | notes                            |
|-------------------|-----------|-------------------------------------|
| id                | uuid (PK) |                                     |
| user_id           | uuid (FK) | references `profiles.id`           |
| course_id         | uuid (FK) | references `courses.id`            |
| certificate_number | text    | unique, human-readable              |
| issued_at         | timestamptz |                                   |
| verification_code | text      | unique, used by `/verify/[code]`   |

## Notes for implementation

- Row-level security should scope `profiles`, `enrollments`,
  `lesson_progress`, and `assessment_attempts` to `auth.uid() = user_id`.
- `certificates` needs a public, read-only policy scoped to lookups by
  `verification_code` only (not a full table scan) to support `/verify`
  without exposing other students' data.
- This plan intentionally stays flexible — exact column types, indexes, and
  constraints should be finalized against real Supabase migrations rather
  than treated as final DDL.

---

## Phase 5 addendum — implemented schema changes

The plan above was written in Phase 3, before any of this existed for
real. As of Phase 5, the actual implemented schema lives in
`supabase/schema.sql` (Phase 4 — full tables, RLS, and the assessment/
certificate SECURITY DEFINER functions) and `supabase/phase5.sql` (this
phase — additive only, safe to run after schema.sql on an existing
database). This section documents what Phase 5 actually added, which is
authoritative over the original plan above where they differ.

### profiles — new columns
| column | type | notes |
|---|---|---|
| `email_course_updates` | boolean, default `true` | opt-out communication preference |
| `email_learning_reminders` | boolean, default `false` | opt-in |
| `email_academy_updates` | boolean, default `false` | opt-in (general/marketing news) |
| `welcome_email_sent_at` | timestamptz, nullable | exactly-once welcome-email tracking |

None of these gate transactional account email (password reset, enrollment
confirmation, course completion, certificate issuance) — those always send.

### enrollments — new columns
| column | type | notes |
|---|---|---|
| `enrollment_email_sent_at` | timestamptz, nullable | |
| `completion_email_sent_at` | timestamptz, nullable | only ever set once ALL published lessons are actually complete, checked server-side |

### certificates — new column
| column | type | notes |
|---|---|---|
| `certificate_email_sent_at` | timestamptz, nullable | |

### New functions (all SECURITY DEFINER, all scoped internally to `auth.uid()`)
- `claim_welcome_email()`
- `claim_enrollment_email(p_course_id uuid)`
- `claim_completion_email(p_course_id uuid)`
- `claim_certificate_email(p_course_id uuid)`

Each atomically flips its `..._sent_at` column from `NULL` via
`UPDATE ... WHERE ... IS NULL RETURNING ...` and reports whether *this*
call is the one that should actually trigger the email. This pattern was
chosen specifically so Phase 5 would not need to open any new RLS UPDATE
policies on `enrollments` or `certificates` — those tables remain
non-directly-writable by students, preserving the Phase 4 security model
exactly. See `PHASE5-NOTES.md` for the full security review.

---

## Phase 5.1 addendum — reliability correction

**Supersedes the Phase 5 addendum above for the four `claim_*_email()`
functions.** Phase 5 set `*_email_sent_at` before Resend confirmed
delivery, so a Resend failure would silently and permanently suppress a
real email. Phase 5.1 (`supabase/phase5.1.sql`) replaces that single-step
design with a three-step claim/complete/release flow. See
`PHASE5.1-NOTES.md` for the full explanation and security review.

### New columns (all additive)
| table | column | type |
|---|---|---|
| `profiles` | `welcome_email_claimed_at` | timestamptz, nullable |
| `enrollments` | `enrollment_email_claimed_at` | timestamptz, nullable |
| `enrollments` | `completion_email_claimed_at` | timestamptz, nullable |
| `certificates` | `certificate_email_claimed_at` | timestamptz, nullable |

The existing `*_email_sent_at` columns from Phase 5 are unchanged in
shape — only their *meaning* is now stricter: sent_at is set if and only
if Resend actually confirmed delivery.

### New/replaced functions (all SECURITY DEFINER, scoped to `auth.uid()`)
Each flow (welcome, enrollment, completion, certificate) now has three
functions instead of one:
- `claim_*_email(...)` — atomically claims a 5-minute lease to attempt a
  send, replacing the Phase 5 version of the same name.
- `complete_*_email(...)` — **new**. Call only after Resend confirms
  success; sets `*_email_sent_at`.
- `release_*_email(...)` — **new**. Call after a failed/errored send
  attempt; clears the claim so a later call can retry. An unreleased claim
  also self-expires after 5 minutes.

No new RLS policy was added on any table — every one of these 12 functions
remains the only way to touch these columns, same as the Phase 4/5 model.

---

## Phase 6 addendum — payments & paid enrollment

See `supabase/phase6.sql` for the full SQL and `PHASE6-NOTES.md` for the
complete security review. Summary:

### courses — new columns
| column | type | notes |
|---|---|---|
| `price_cents` | integer, nullable | canonical price; null = free |
| `sale_price_cents` | integer, nullable | optional discounted price |
| `currency` | text, default `'usd'` | |
| `is_paid` | boolean, default `false` | AI-101 is set to `true` by this migration |
| `enrollment_open` | boolean, default `true` | |
| `stripe_product_id` / `stripe_price_id` | text, nullable | left null until a real Stripe product/price is created; checkout falls back to `price_data` built from `price_cents` when `stripe_price_id` is unset |

### orders — new table
Fields: `id`, `user_id`, `course_id`, `provider` (`'stripe'`), 
`stripe_checkout_session_id` (unique), `stripe_payment_intent_id` (unique),
`amount_cents`, `discount_cents` (reserved for future coupons — always `0`
today), `currency`, `status` (`pending`/`paid`/`failed`/`canceled`/`refunded`),
`created_at`, `paid_at`, `refunded_at`. Indexed on `user_id`, `course_id`,
`status`. RLS: students can `select` their own orders only — there is
**no** insert/update/delete policy for `authenticated` or `anon`; every
write goes through `create_pending_order()` or
`process_stripe_payment_event()`.

### enrollments — new column + a necessary policy change
- New column: `order_id` (nullable FK to `orders`, `on delete set null`).
- **Policy change**: the Phase 4 `"enrollments: insert own"` policy (which
  allowed self-service enrollment in any published course) is replaced
  with `"enrollments: insert own free course"`, which adds `and
  c.is_paid = false`. This was necessary, not incidental — without it, a
  student could grant themselves free access to a paid course by calling
  the Supabase REST API directly. Free-course self-enrollment behaves
  exactly as before.

### New SECURITY DEFINER functions
- `create_pending_order(p_course_id)` — granted to `authenticated`. Computes the order amount from the course's own price server-side.
- `attach_checkout_session(p_order_id, p_session_id)` — granted to `authenticated`, ownership-checked.
- `process_stripe_payment_event(p_checkout_session_id, p_payment_intent_id, p_new_status)` — granted **only** to `service_role`, explicitly revoked from `public`/`anon`/`authenticated`. The only function that can ever mark an order paid or create a paid enrollment.
- `claim_enrollment_email_for_user` / `complete_enrollment_email_for_user` / `release_enrollment_email_for_user` — the Phase 5.1 email-reliability pattern, parameterized by an explicit user id for the webhook's session-less context. Also `service_role`-only.

---

## Phase 7 addendum — academy administration

See `supabase/phase7.sql` for the full SQL and `PHASE7-NOTES.md` for the
complete security review.

### profiles — new column + critical trigger
| column | type | notes |
|---|---|---|
| `role` | text, default `'student'`, check `in ('student','admin')` | |

`is_admin(uuid)` — `SECURITY DEFINER`, `stable`, granted to `authenticated`.
The single source of truth for "is this user an admin?", used both inside
RLS policies and inside the admin-only functions below.

**`prevent_role_self_escalation()` trigger (BEFORE UPDATE on `profiles`)** —
the security-critical piece of this migration. RLS is row-level, not
column-level, so the existing `"profiles: update own"` policy from Phase 4
would otherwise let a student change their own `role` to `'admin'` via a
direct Supabase REST call (the app's own UI never does this, but RLS alone
doesn't stop a call that bypasses the UI). This trigger silently reverts
any attempted `role` change back to its previous value unless the caller
is already an admin.

New RLS policy: `"profiles: admin read all"` — admins can `select` every
profile (needed for the student list/detail pages); the existing
`"profiles: read own"` and `"profiles: update own"` policies are
unchanged.

### enrollments — new columns + widened status
| column | type | notes |
|---|---|---|
| `enrollment_type` | text, default `'paid'`, check `in ('paid','complimentary','scholarship','administrative')` | |
| `granted_by` | uuid, nullable, FK to `auth.users` | who granted a complimentary/scholarship/administrative enrollment |
| `admin_note` | text, nullable | |
| `updated_at` | timestamptz, default `now()` | bumped by the existing `set_updated_at()` trigger function from `schema.sql` |

The `status` check constraint is widened from
`('enrolled','active','completed','cancelled')` to also allow `'revoked'`
and `'refunded'` — additive (nothing previously allowed is removed).

New RLS policy: `"enrollments: admin read all"`. No admin
INSERT/UPDATE/DELETE policy was added — every admin write to `enrollments`
goes through `admin_grant_enrollment()` or `admin_revoke_enrollment()`
below.

### orders, certificates, lesson_progress, courses
Each gets one new `"... : admin read all"` SELECT policy, gated by
`is_admin(auth.uid())`. No write policy was added to any of these for
admins — order/certificate state still only changes through the existing
Phase 6 `process_stripe_payment_event()` / `issue_certificate_if_eligible()`
functions.

### New functions
- `is_admin(p_user_id uuid default auth.uid())` — see above.
- `admin_grant_enrollment(p_student_id, p_course_id, p_enrollment_type, p_note)` — `authenticated`-callable, but checks `is_admin(auth.uid())` internally and raises an exception otherwise. The only way a non-`'paid'` enrollment can ever be created.
- `admin_revoke_enrollment(p_enrollment_id, p_note)` — same pattern; sets `status = 'revoked'` without deleting the row or touching any linked order.

---

## Phase 8 addendum — audit log, admin promotion, Stripe refunds

See `supabase/phase8.sql` for full SQL and `PHASE8-NOTES.md` for the
complete security review.

### admin_audit_log — new table
Fields: `id`, `admin_id` (FK `auth.users`), `action`, `target_type`,
`target_id`, `metadata` (jsonb), `created_at`. Indexed on `created_at desc`
and `admin_id`. RLS: admins can `select`; **there is no insert/update/
delete policy for any client role, including admins** — every row is
written by a SECURITY DEFINER function. This means the log cannot be
edited or deleted through the app by anyone short of direct database
access.

Actions currently logged: `admin_promoted`, `enrollment_granted`,
`enrollment_revoked`, `refund_initiated`, `refund_completed`,
`enrollment_revoked_refund`, `course_updated`.

### New/replaced functions
- `admin_log_action(action, target_type, target_id, metadata)` — general-purpose logger, `is_admin()`-gated, used for the pre-Stripe-call `refund_initiated` entry.
- `admin_promote_user(target_user_id)` — the only way `profiles.role` becomes `'admin'` outside direct database access. Checks the caller is already an admin, the target exists and isn't already an admin, updates the role, and logs the action — all in one transaction. Cooperates with (does not replace) the Phase 7 `prevent_role_self_escalation` trigger.
- `admin_grant_enrollment()` / `admin_revoke_enrollment()` (Phase 7) — replaced via `CREATE OR REPLACE` **only** to add an audit-log insert; authorization logic and behavior are otherwise identical to Phase 7.
- `admin_mark_order_refunded(order_id, revoke_enrollment, stripe_refund_id, note)` — the only way an order's status becomes `'refunded'`. Never calls Stripe itself (that happens in `lib/actions/admin.ts` before this is called) — it only records the outcome, atomically guarded by `WHERE status = 'paid'` so a duplicate call can never double-process the same order. Optionally revokes the linked enrollment (via `orders.id = enrollments.order_id`) if the admin chose to.
- `admin_update_course(course_id, title, description, price_cents, status)` — narrow metadata-only editing; does not touch modules/lessons/assessment content.

### No RLS was weakened
Every table's existing policies (Phase 4–7) are untouched. `admin_audit_log` is the only new table, and its one policy is read-only for admins.

---

## Phase 9 addendum — admin demotion + course authoring

See `supabase/phase9.sql` for full SQL and `PHASE9-NOTES.md` for the
complete security review and the deletion-safety design decision.

### Two RLS gaps closed (both read-only, additive)
Phase 7 added `"courses: admin read all"` but never a matching policy for
`modules`/`lessons` — without it, an admin couldn't see draft/unpublished
module or lesson content at all, which would have made the Course Builder
non-functional for exactly the content most likely to be mid-edit. Added:
`"modules: admin read all"` and `"lessons: admin read all"`, both scoped
to `is_admin(auth.uid())`, matching the existing pattern exactly.

### New functions
- `admin_demote_user(target_user_id)` — the only way `profiles.role` moves from `'admin'` back to `'student'`. Counts current admins and rejects if that count is `1` (covers both demoting someone else and self-demotion with the same check — no special-casing needed).
- `is_valid_slug(slug)` — shared helper, lowercase-letters/numbers/hyphens only.
- `admin_create_module` / `admin_update_module` / `admin_delete_module`.
- `admin_create_lesson` / `admin_update_lesson` / `admin_delete_lesson`.
- `admin_reorder_modules(course_id, ordered_ids[])` / `admin_reorder_lessons(module_id, ordered_ids[])` — atomic two-phase reorder (move everything to negative positions, then assign final positions) so the unique `(course_id, position)` / `(module_id, position)` constraints are never violated mid-operation.

### Deletion safety
`admin_delete_module()` and `admin_delete_lesson()` both check for existing
`lesson_progress` rows before allowing a hard delete (a module's lessons
cascade-delete, and lessons cascade-delete their `lesson_progress` rows —
see `schema.sql`), and reject with a clear message if any student has
interacted with the content, recommending unpublishing instead. See
`PHASE9-NOTES.md` for the full reasoning.

---

## Phase 10 addendum — multi-course creation

See `supabase/phase10.sql` for full SQL and `PHASE10-NOTES.md` for the
complete security review and dynamic-architecture explanation.

### One new function, zero new policies
`admin_create_course(title, slug, short_description, description,
price_cents, status, certification_name)` — the only way a new course row
can be created. No new RLS policy was needed: `"courses: public read
published"` (schema.sql) already scopes public visibility to `status =
'published'` for any course, not just AI-101, so a newly created draft
course is invisible to the public the same way any other draft already
was. `"courses: admin read all"` (phase7.sql) already lets admins see
every course regardless of status.

Reuses `is_valid_slug()` from `phase9.sql` rather than redefining it.

---

## Phase 11 addendum — generic learner delivery

See `supabase/phase11.sql` and `PHASE11-NOTES.md` for the complete
security review.

### One function replaced, zero new tables/columns/policies
`submit_assessment_attempt()` (originally `schema.sql`, Phase 4) is
replaced via `CREATE OR REPLACE` to add an enrollment-ownership check that
was missing from the original version — the function checked
authentication but never checked that the caller was actually enrolled in
the assessment's course. Any signed-in student could previously call this
RPC directly for any published assessment id, from any course. The fix
adds: `caller must have a non-'revoked' enrollment row for the
assessment's course`, checked before scoring proceeds. No other behavior
changed — scoring logic, idempotency, and the answer-key access pattern
are identical to the Phase 4 version.

---

## Phase 12 addendum — academy operations

See `supabase/phase12.sql` and `PHASE12-NOTES.md` for the complete
security review.

### One new read-only RLS policy
`"assessment_attempts: admin read all"` — a real gap found during this
phase: no admin-read policy existed on `assessment_attempts` in any prior
phase (only `"assessment_attempts: read own"` from Phase 4), so an admin's
ordinary session could not see any student's assessment score, blocking
the brief's explicit requirement to show "Attempts, scores, passing
status" in the student detail view. Same read-only, `is_admin(auth.uid())`
pattern as every other admin-read policy.

### New indexes
`enrollments(course_id)`, `enrollments(user_id)`, `enrollments(status)`,
`assessment_attempts(user_id)`, `assessment_attempts(assessment_id)`,
`certificates(course_id)` — none of these existed before (only a
composite unique constraint on `(user_id, course_id)` for
enrollments/certificates, which Postgres can't use efficiently for a
single-column filter), and the new admin filter/reporting queries
introduced in this phase need them.

### Optional fixture (not part of the migration chain)
`supabase/optional-second-course-fixture.sql` — creates one real,
disposable second course (with modules, lessons, and a 1-question
assessment) for manually validating the multi-course architecture. Not
required, not auto-run, and creates zero fake student/enrollment/progress
data — see `PHASE12-NOTES.md` "Second-Course Validation Procedure."

---

## Phase 17 addendum — data-integrity CHECK constraints

See `supabase/phase17.sql` and `DATA-INTEGRITY-REVIEW.md` for the
complete review. Adds five `CHECK` constraints as defense-in-depth on
values already validated at the application layer:
`courses.price_cents >= 0` (or null), `courses.sale_price_cents >= 0`
(or null), `modules.position >= 1`, `lessons.position >= 1`,
`lessons.duration_minutes between 1 and 300`. No new table or column.

**Must be followed immediately by `phase18.sql`** — see the Phase 18
addendum directly below for why.

## Phase 18 addendum — reorder-function fix (corrective)

See `supabase/phase18.sql` and `PHASE18-NOTES.md` for the complete
explanation. Phase 17's `modules_position_check`/`lessons_position_check`
constraints (`position >= 1`) directly conflicted with the module/lesson
reorder functions defined in Phase 9, which used a temporary *negative*
position as part of their atomic two-phase reorder technique. Applied in
sequence, `phase17.sql` alone would have broken `admin_reorder_modules()`
and `admin_reorder_lessons()` completely — every call would fail with a
check-constraint violation.

`phase18.sql` replaces both functions (via `CREATE OR REPLACE` — the
original definitions in `phase9.sql` are untouched) with a version that
shifts positions into a temporary large **positive** offset
(`position + 1000000`) instead of negating them — collision-free for the
same reason the original negative-position trick was (adding a constant
to a set of already-unique values preserves their uniqueness), but
compatible with the new `position >= 1` constraint at every intermediate
step, not just the final state.

Also fixed while reviewing these functions: a duplicate-ID gap in the
original validation (a malformed reorder list like `[A, A, C]` instead of
`[A, B, C]` would previously pass validation and silently strand the
omitted module/lesson at an out-of-range temporary position with no error
raised), and a missing explicit check for a nonexistent parent
course/module id. Both are independent correctness issues from the
Phase 17 constraint conflict, found during this phase's required review
of the replacement functions.

**Migration sequencing**: `phase17.sql` and `phase18.sql` must always be
applied together, in that order, with nothing in between. See the
README's "Migration Sequencing" section for the operational guidance and
a rollback procedure.
