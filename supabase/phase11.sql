-- ============================================================================
-- Next Horizon AI Academy — Phase 11 migration (generic learner delivery)
-- ============================================================================
-- Run this AFTER schema.sql, seed.sql, phase5.sql, phase5.1.sql, phase6.sql,
-- phase7.sql, phase8.sql, phase9.sql, and phase10.sql, against the same
-- database. No new table, no new column, no new RLS policy. The only
-- change is a CREATE OR REPLACE of one existing function
-- (submit_assessment_attempt, originally defined in schema.sql) to close a
-- real security gap found while implementing this phase — see below. No
-- prior migration *file* was edited; this follows the exact same pattern
-- already used in phase8.sql/phase9.sql for admin_grant_enrollment and
-- admin_revoke_enrollment.
--
-- This has NOT been executed against a live database in this environment
-- (no network access here — see PHASE11-NOTES.md).
--
-- ----------------------------------------------------------------------------
-- THE GAP THIS FIXES
-- ----------------------------------------------------------------------------
-- Phase 11's brief explicitly requires: "Prevent students from taking
-- assessments for courses they don't own." Inspecting the existing
-- submit_assessment_attempt() function (schema.sql, Phase 4) found that it
-- checks the caller is authenticated and that the assessment exists and is
-- published — but never checks that the caller is actually enrolled in
-- the course the assessment belongs to. Any signed-in student could call
-- this RPC directly (bypassing the assessment page's UI entirely) with any
-- published assessment's id from any course and receive a real, recorded
-- assessment_attempts row, with no enrollment at all.
--
-- This was already latent in the single-course (AI-101) version of the
-- app, but became directly relevant now that a generic
-- /courses/[slug]/assessment route exists for every course, not just the
-- one course an admin happened to seed by hand.
--
-- The fix adds one check: the caller must have a non-'revoked' enrollment
-- row for the assessment's course before scoring proceeds.
-- ============================================================================

create or replace function public.submit_assessment_attempt(
  p_assessment_id uuid,
  p_answers jsonb
)
returns table (score int, passed boolean, passing_score int)
language plpgsql
security definer set search_path = public
as $$
declare
  v_total int;
  v_correct int;
  v_passing_score int;
  v_course_id uuid;
  v_score int;
  v_passed boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select a.passing_score, a.course_id into v_passing_score, v_course_id
  from public.assessments a
  where a.id = p_assessment_id and a.is_published;

  if v_passing_score is null then
    raise exception 'Assessment not found or not published';
  end if;

  -- The fix: caller must actually be enrolled in the course this
  -- assessment belongs to, and that enrollment must not be revoked. This
  -- mirrors the same "revoked enrollments no longer grant access" rule
  -- already applied client-side to lesson access (see
  -- lib/data/progress.ts's hasCourseAccess(), added in this same phase).
  if not exists (
    select 1 from public.enrollments
    where user_id = auth.uid() and course_id = v_course_id and status <> 'revoked'
  ) then
    raise exception 'Not enrolled in this course';
  end if;

  select count(*) into v_total
  from public.assessment_questions q
  where q.assessment_id = p_assessment_id;

  select count(*) into v_correct
  from public.assessment_questions q
  join public.assessment_answer_keys k on k.question_id = q.id
  where q.assessment_id = p_assessment_id
    and (p_answers ->> q.id::text)::uuid = k.correct_option_id;

  if v_total = 0 then
    raise exception 'Assessment has no questions configured';
  end if;

  v_score := round((v_correct::numeric / v_total::numeric) * 100);
  v_passed := v_score >= v_passing_score;

  insert into public.assessment_attempts (user_id, assessment_id, score, passed)
  values (auth.uid(), p_assessment_id, v_score, v_passed);

  return query select v_score, v_passed, v_passing_score;
end;
$$;

-- Grant is unchanged from schema.sql, restated here only because
-- CREATE OR REPLACE does not require re-granting (grants persist across
-- CREATE OR REPLACE on a function with the same signature) — included for
-- clarity/completeness of this file as a standalone record.
grant execute on function public.submit_assessment_attempt(uuid, jsonb) to authenticated;
