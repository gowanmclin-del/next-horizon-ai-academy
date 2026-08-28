-- ============================================================================
-- Next Horizon AI Academy — Phase 5 migration
-- ============================================================================
-- Run this AFTER supabase/schema.sql (and supabase/seed.sql if this is a
-- fresh project) against the same database. Safe to run on an existing
-- Phase 4 database: every statement is additive (new columns, new
-- functions) — nothing here drops a table or destroys existing data.
--
-- This has NOT been executed against a live database in this environment
-- (no network access here — see PHASE5-NOTES.md).
--
-- Design: rather than opening new UPDATE policies on enrollments/
-- certificates (which would regress the Phase 4 security model — students
-- currently cannot update those tables at all), every "has this
-- transactional email already been sent?" check-and-claim is done inside a
-- SECURITY DEFINER function, the same pattern already used for
-- submit_assessment_attempt() and issue_certificate_if_eligible(). Each
-- function atomically claims the "send" via an
-- UPDATE ... WHERE <sent_at column> IS NULL RETURNING ..., which is safe
-- against concurrent calls, retries, multiple tabs/devices, and page
-- refreshes — only the caller that actually flips the column from NULL
-- wins the race and is told to send the email.
-- ============================================================================

-- ============================================================================
-- profiles: communication preferences + welcome-email tracking
-- ============================================================================
alter table public.profiles
  add column if not exists email_course_updates boolean not null default true,
  add column if not exists email_learning_reminders boolean not null default false,
  add column if not exists email_academy_updates boolean not null default false,
  add column if not exists welcome_email_sent_at timestamptz;

-- Defaults are privacy-conscious: course-relevant updates default on (a
-- student signed up to learn AI-101 and should hear about it), while
-- reminder nudges and general academy/marketing news default OFF and
-- require an explicit opt-in. None of these gate transactional account
-- email (password reset, enrollment confirmation, course completion,
-- certificate issuance) — those always send regardless of these toggles,
-- per the Phase 5 brief.

-- No RLS changes needed here — the existing "profiles: update own" policy
-- from schema.sql already covers these new columns (RLS in Postgres is
-- row-level, not column-level), so a student can already read/update their
-- own preferences and nothing else changes.

-- ============================================================================
-- enrollments: per-enrollment email tracking
-- ============================================================================
alter table public.enrollments
  add column if not exists enrollment_email_sent_at timestamptz,
  add column if not exists completion_email_sent_at timestamptz;

-- ============================================================================
-- certificates: per-certificate email tracking
-- ============================================================================
alter table public.certificates
  add column if not exists certificate_email_sent_at timestamptz;

-- ============================================================================
-- claim_welcome_email — exactly-once welcome email
-- ============================================================================
-- Safe to call on every login. Only the very first call for a given
-- account (across any device, tab, or retry) ever gets should_send = true.
create or replace function public.claim_welcome_email()
returns table (should_send boolean, first_name text, email text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row record;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set welcome_email_sent_at = now()
  where id = v_user and welcome_email_sent_at is null
  returning profiles.first_name, profiles.email into v_row;

  if found then
    return query select true, v_row.first_name, v_row.email;
  else
    return query select false, null::text, null::text;
  end if;
end;
$$;

grant execute on function public.claim_welcome_email() to authenticated;

-- ============================================================================
-- claim_enrollment_email — exactly-once enrollment confirmation email
-- ============================================================================
create or replace function public.claim_enrollment_email(p_course_id uuid)
returns table (should_send boolean, first_name text, course_title text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_first_name text;
  v_title text;
  v_claimed boolean;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  update public.enrollments
  set enrollment_email_sent_at = now()
  where user_id = v_user and course_id = p_course_id and enrollment_email_sent_at is null
  returning true into v_claimed;

  if not found then
    return query select false, null::text, null::text;
    return;
  end if;

  select first_name into v_first_name from public.profiles where id = v_user;
  select title into v_title from public.courses where id = p_course_id;

  return query select true, v_first_name, v_title;
end;
$$;

grant execute on function public.claim_enrollment_email(uuid) to authenticated;

-- ============================================================================
-- claim_completion_email — exactly-once course-completion email
-- ============================================================================
-- Only claims (and reports should_send = true) once ALL published lessons
-- in the course are actually complete for this student, computed
-- server-side — never trusts a client-supplied "I finished" flag.
create or replace function public.claim_completion_email(p_course_id uuid)
returns table (should_send boolean, first_name text, course_title text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_total int;
  v_completed int;
  v_first_name text;
  v_title text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select count(*) into v_total
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.course_id = p_course_id and l.is_published;

  select count(*) into v_completed
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  join public.modules m on m.id = l.module_id
  where m.course_id = p_course_id and l.is_published and lp.user_id = v_user and lp.completed;

  if v_total = 0 or v_completed < v_total then
    return query select false, null::text, null::text;
    return;
  end if;

  update public.enrollments
  set completion_email_sent_at = now()
  where user_id = v_user and course_id = p_course_id and completion_email_sent_at is null;

  if not found then
    return query select false, null::text, null::text;
    return;
  end if;

  select first_name into v_first_name from public.profiles where id = v_user;
  select title into v_title from public.courses where id = p_course_id;

  return query select true, v_first_name, v_title;
end;
$$;

grant execute on function public.claim_completion_email(uuid) to authenticated;

-- ============================================================================
-- claim_certificate_email — exactly-once certificate-issued email
-- ============================================================================
-- Does not issue the certificate itself (that stays entirely inside
-- issue_certificate_if_eligible() from schema.sql) — this only claims the
-- right to send the email for a certificate that already exists.
create or replace function public.claim_certificate_email(p_course_id uuid)
returns table (
  should_send boolean,
  first_name text,
  certificate_name text,
  certificate_number text,
  verification_code text
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_first_name text;
  v_cert record;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  update public.certificates
  set certificate_email_sent_at = now()
  where user_id = v_user and course_id = p_course_id and certificate_email_sent_at is null
  returning certificate_name, certificate_number, verification_code into v_cert;

  if not found then
    return query select false, null::text, null::text, null::text, null::text;
    return;
  end if;

  select first_name into v_first_name from public.profiles where id = v_user;

  return query select true, v_first_name, v_cert.certificate_name, v_cert.certificate_number, v_cert.verification_code;
end;
$$;

grant execute on function public.claim_certificate_email(uuid) to authenticated;
