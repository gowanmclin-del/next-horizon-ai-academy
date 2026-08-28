-- ============================================================================
-- Next Horizon AI Academy — OPTIONAL second-course validation fixture
-- ============================================================================
-- This file is NOT part of the numbered migration chain (schema.sql through
-- phase12.sql) and is NOT required for the application to function. It
-- exists solely to give the academy owner a real, disposable second course
-- to manually validate Phase 11/12's generic multi-course architecture
-- against — see PHASE12-NOTES.md "Second-Course Validation Procedure" for
-- the full 15-point checklist this course is meant to be tested with.
--
-- Per the Phase 12 brief: "Do not populate production with misleading fake
-- student activity." This file creates a course, its content, and a small
-- assessment — but deliberately creates NO fake students, enrollments,
-- progress, or certificates. Every enrollment/progress/certificate record
-- produced during validation should come from a real signup + real (test
-- mode) Stripe checkout, performed by hand, following the checklist.
--
-- Safe to run once against a Supabase project when you're ready to
-- validate. Safe to delete afterward (or leave published as a genuine
-- second course, if the content is good enough to keep) — either is fine,
-- since nothing else in the application treats it specially.
--
-- To remove it later:
--   delete from public.courses where slug = 'ai-101-validation-course';
--   -- (cascades to its modules, lessons, and assessment automatically)
-- ============================================================================

do $$
declare
  v_course_id uuid;
  v_module_id uuid;
  v_assessment_id uuid;
  v_q uuid;
  v_o1 uuid; v_o2 uuid;
begin

  insert into public.courses (slug, title, short_description, description, status, price_cents, currency, is_paid, certification_name)
  values (
    'ai-101-validation-course',
    'Validation Course: AI Tools for Everyday Work',
    $c$A short, disposable course used to validate the multi-course platform end to end.$c$,
    $c$This course exists only to validate that Next Horizon AI Academy correctly handles a second, independent course alongside AI-101 — separate catalog listing, checkout, dashboard visibility, lesson delivery, progress tracking, assessment, and certificate issuance. Safe to delete once validation is complete.$c$,
    'published',
    1900,
    'usd',
    true,
    'Validation Course Certificate'
  )
  returning id into v_course_id;

  insert into public.modules (course_id, slug, title, description, position)
  values (v_course_id, 'getting-started', 'Getting Started', null, 1)
  returning id into v_module_id;

  insert into public.lessons (module_id, slug, title, description, content, duration_minutes, position, is_published) values
  (v_module_id, 'welcome', 'Welcome',
    $c$A short welcome lesson.$c$,
    $c$This is the first lesson of the validation course. If you can read this as an enrolled student, lesson delivery is working correctly for a non-AI-101 course.$c$,
    3, 1, true),
  (v_module_id, 'second-lesson', 'Second Lesson',
    $c$A second lesson to confirm ordering and progress tracking.$c$,
    $c$This is the second lesson. Completing both lessons should bring this course to 100% and unlock its assessment — independently of any progress on AI-101.$c$,
    3, 2, true);

  insert into public.assessments (course_id, title, description, passing_score, is_published)
  values (v_course_id, 'Validation Course Assessment', $c$A single-question assessment for validation purposes.$c$, 100, true)
  returning id into v_assessment_id;

  insert into public.assessment_questions (assessment_id, question, position)
  values (v_assessment_id, $c$This is a validation course. Which answer is correct?$c$, 1)
  returning id into v_q;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$This one$c$, 1) returning id into v_o1;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Not this one$c$, 2) returning id into v_o2;
  insert into public.assessment_answer_keys (question_id, correct_option_id) values (v_q, v_o1);

end $$;
