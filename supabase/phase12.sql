-- ============================================================================
-- Next Horizon AI Academy — Phase 12 migration (academy operations)
-- ============================================================================
-- Run this AFTER schema.sql, seed.sql, phase5.sql, phase5.1.sql, phase6.sql,
-- phase7.sql, phase8.sql, phase9.sql, phase10.sql, and phase11.sql, against
-- the same database. Fully additive: one new RLS policy (read-only), a
-- handful of indexes, zero new tables, zero new columns, zero destructive
-- changes, zero prior migration files touched.
--
-- This has NOT been executed against a live database in this environment
-- (no network access here — see PHASE12-NOTES.md).
--
-- ----------------------------------------------------------------------------
-- THE GAP THIS FIXES
-- ----------------------------------------------------------------------------
-- Phase 12's brief explicitly requires the admin student-detail view to
-- show "Assessments: Attempts, scores, passing status, and relevant
-- timestamps." Inspecting the existing RLS policies on
-- `assessment_attempts` (schema.sql, Phase 4) found only
-- `"assessment_attempts: read own"` (auth.uid() = user_id) — there has
-- never been an admin-read policy on this table, in any phase. Without
-- one, an admin's ordinary RLS-scoped session literally cannot see any
-- student's assessment score, including the site's own owner. This closes
-- that gap using the exact same read-only pattern already established for
-- every other table in Phase 7 (profiles, enrollments, orders,
-- certificates, lesson_progress, courses) and Phase 9 (modules, lessons).
-- ============================================================================

create policy "assessment_attempts: admin read all" on public.assessment_attempts
  for select using (public.is_admin(auth.uid()));

-- ============================================================================
-- Indexes to support the new admin filter/reporting queries
-- ============================================================================
-- enrollments.course_id and enrollments.user_id previously had no
-- standalone index — only the composite unique constraint on
-- (user_id, course_id), which Postgres can only use efficiently when
-- user_id is the leading filter column. Phase 12's admin views filter and
-- join on course_id alone (e.g. "all enrollments for course X") and need
-- their own index.
create index if not exists enrollments_course_id_idx on public.enrollments (course_id);
create index if not exists enrollments_user_id_idx on public.enrollments (user_id);
create index if not exists enrollments_status_idx on public.enrollments (status);

-- assessment_attempts had no index at all before this migration.
create index if not exists assessment_attempts_user_id_idx on public.assessment_attempts (user_id);
create index if not exists assessment_attempts_assessment_id_idx on public.assessment_attempts (assessment_id);

-- certificates.course_id, same reasoning as enrollments.course_id above.
create index if not exists certificates_course_id_idx on public.certificates (course_id);
