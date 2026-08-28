# Phase 17 Data Integrity Review

## Method
Read every `create table` statement across all twelve prior `supabase/*.sql`
files and cross-referenced against the write paths (SECURITY DEFINER
functions) that populate each table, looking specifically for values
validated only at the application layer with no matching database-level
constraint.

## 1. Missing CHECK Constraints — Found and Fixed

**Finding**: `courses.price_cents`, `courses.sale_price_cents`,
`modules.position`, `lessons.position`, and `lessons.duration_minutes`
are all validated inside their respective admin functions
(`admin_create_course`/`admin_update_course` reject negative prices;
`admin_create_module`/`admin_update_module` and
`admin_create_lesson`/`admin_update_lesson` reject `position < 1` and
`duration_minutes` outside `1–300`) — but **none of these columns had a
matching database-level CHECK constraint.** Since no client
INSERT/UPDATE policy exists on `courses`, `modules`, or `lessons` for any
role (confirmed unchanged since Phase 6/9/10 — every write goes through
the vetted functions), this was not exploitable from the browser. It was,
however, a real defense-in-depth gap: nothing at the database layer would
have stopped a negative price or a zero-length lesson from being saved by
a bug in one of those functions, or by any future server-side script that
writes to these tables directly.

By contrast, `orders.amount_cents` and `orders.discount_cents` **already
have** `check (... >= 0)` constraints (Phase 6) — this same pattern simply
hadn't been extended to courses/modules/lessons in the phases that
introduced them.

**Fixed**: `supabase/phase17.sql` adds:
```sql
alter table public.courses
  add constraint courses_price_cents_check check (price_cents is null or price_cents >= 0),
  add constraint courses_sale_price_cents_check check (sale_price_cents is null or sale_price_cents >= 0);

alter table public.modules
  add constraint modules_position_check check (position >= 1);

alter table public.lessons
  add constraint lessons_position_check check (position >= 1),
  add constraint lessons_duration_minutes_check check (duration_minutes >= 1 and duration_minutes <= 300);
```
Purely additive — no column type changed, no existing constraint altered,
no data migrated. Every row currently in these tables was written through
the same functions that already enforce these exact bounds, so applying
these constraints should not fail against any data written by the
application itself. If it ever does fail on a real database, that failure
is itself valuable information (a row exists outside bounds the app has
always enforced) worth investigating directly, not silently working
around.

## 2. Duplicate Certificate Issuance

**Reviewed, confirmed already prevented — no change needed.**
`certificates` has a `unique(user_id, course_id)` constraint (Phase 6),
and `issue_certificate_if_eligible()` is itself idempotent (calling it
twice returns the existing certificate rather than attempting a second
insert). Unchanged.

## 3. Race Conditions on Concurrent Enrollment

**Reviewed, confirmed already prevented — no change needed.**
`enrollments` has a `unique(user_id, course_id)` constraint; both the
free-enrollment path (RLS-gated direct insert) and the paid path
(`process_stripe_payment_event()`, guarded by `where status = 'pending'`
before transitioning to `'paid'`) are safe against a duplicate row from
concurrent requests — the database's own unique constraint is the final
backstop even if application-level logic somehow raced. Unchanged.

## 4. Orphaned Records on Deletion

**Reviewed.** `admin_delete_module()`/`admin_delete_lesson()` (Phase 9)
already refuse to delete when real student `lesson_progress` exists,
specifically to prevent silently destroying completion history via
cascade delete — this was Phase 9's central finding and remains correct
and unchanged.

**No course-deletion function exists anywhere in the application** — only
`admin_update_course()` (metadata edit, including setting `status =
'archived'`) exists; there is no `admin_delete_course()`. This means the
cascade-delete behavior defined on `modules.course_id`,
`enrollments.course_id`, etc. (`on delete cascade`) is only ever
triggered by a direct database operation outside the app's own write
surface — not a gap in the app itself, but worth noting explicitly: if a
future phase adds course deletion, it should apply the same
progress-aware safety check Phase 9 already established for
modules/lessons, not a bare `DELETE`.

## 5. Negative/Zero Values Elsewhere

Checked every other numeric column for the same class of gap:
- `orders.amount_cents`, `orders.discount_cents` — already constrained (Phase 6), confirmed unchanged.
- `assessments.passing_score` — has `check (passing_score between 0 and 100)` (Phase 6), confirmed unchanged.
- `lesson_progress`, `assessment_attempts.score` — `assessment_attempts.score` is written only by `submit_assessment_attempt()` (SECURITY DEFINER, computed server-side as `round((correct/total) * 100)`, mathematically always `0–100` by construction) — no client-writable path exists to this column at all, so a CHECK constraint here would be purely redundant with the function's own arithmetic, not a meaningful additional safeguard. Not added, to avoid an unnecessary constraint with no real defensive value.

## 6. Migration Additivity

Confirmed (by diff, consistent with the practice in every phase since
Phase 8) that `phase17.sql` is the only SQL file changed this phase — all
twelve prior migration files are byte-for-byte identical to the Phase 16
delivery. The one migration this phase adds only adds constraints; it
drops nothing, alters no column type, and removes no existing constraint.

## Summary

One real, genuine gap found and fixed: five numeric columns across
`courses`/`modules`/`lessons` had application-level-only validation with
no database-level backstop. Every other area reviewed (duplicate
certificates, concurrent enrollment, deletion safety, other numeric
columns) was already correctly handled by prior phases and required no
change.
