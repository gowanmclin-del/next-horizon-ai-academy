-- ============================================================================
-- Next Horizon AI Academy — Phase 5.1 migration (reliability correction)
-- ============================================================================
-- Run this AFTER supabase/schema.sql, supabase/seed.sql, and
-- supabase/phase5.sql, against the same database. Additive and safe to run
-- on an existing Phase 5 database — no table is dropped, no existing
-- column is removed, no existing RLS policy is touched.
--
-- This has NOT been executed against a live database in this environment
-- (no network access here — see PHASE5.1-NOTES.md).
--
-- ----------------------------------------------------------------------------
-- THE PROBLEM THIS FIXES
-- ----------------------------------------------------------------------------
-- In Phase 5, each claim_*_email() function set the *_email_sent_at column
-- BEFORE the caller had actually attempted to send anything via Resend. If
-- Resend then failed (network error, rate limit, bad API key, etc.), the
-- database already believed the email had been sent, and no future call
-- would ever retry it — a real message was silently lost with no recovery
-- path.
--
-- ----------------------------------------------------------------------------
-- THE FIX: short-lived claim/lease + explicit finalize/release
-- ----------------------------------------------------------------------------
-- Each flow now has three functions instead of one:
--   1. claim_*_email(...)   — atomically claims the right to attempt a send
--      by setting *_email_claimed_at (NOT *_email_sent_at), but only if the
--      email hasn't been sent yet AND no other claim is currently active
--      (or the previous claim has expired — see the lease window below).
--   2. complete_*_email(...) — called ONLY after Resend confirms success;
--      sets *_email_sent_at, which permanently stops any future send.
--   3. release_*_email(...) — called after a failed/errored send attempt;
--      clears *_email_claimed_at so a later call can claim and retry.
--
-- The lease window (5 minutes, hardcoded below) means that even if a
-- caller crashes between claiming and releasing — a serverless function
-- killed mid-request, for example — the claim self-expires and a later
-- trigger can retry. A stale claim can delay a retry by at most 5 minutes;
-- it can never permanently block delivery.
--
-- All functions remain SECURITY DEFINER, scoped internally to auth.uid(),
-- exactly like the Phase 4/5 pattern — no new RLS UPDATE policy is opened
-- on enrollments or certificates, and neither the Supabase service-role key
-- nor the Resend API key are ever needed here.
-- ============================================================================

-- ============================================================================
-- New columns: *_email_claimed_at alongside the existing *_email_sent_at
-- ============================================================================
alter table public.profiles
  add column if not exists welcome_email_claimed_at timestamptz;

alter table public.enrollments
  add column if not exists enrollment_email_claimed_at timestamptz,
  add column if not exists completion_email_claimed_at timestamptz;

alter table public.certificates
  add column if not exists certificate_email_claimed_at timestamptz;

-- ============================================================================
-- Welcome email
-- ============================================================================
-- Replaces the Phase 5 version of claim_welcome_email(): it now claims
-- rather than finalizes, and (per Phase 5.1 requirement #12) returns the
-- authenticated Supabase Auth email via auth.email() rather than
-- profiles.email — profiles.email is editable by the student through the
-- ordinary "profiles: update own" RLS policy (RLS is row-level, not
-- column-level), so it should never be trusted as a delivery address for
-- an account-identity email like this one. auth.email() reads directly
-- from the request's verified JWT claims and cannot be edited by the
-- student at all.
create or replace function public.claim_welcome_email()
returns table (should_send boolean, first_name text, email text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_first_name text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set welcome_email_claimed_at = now()
  where id = v_user
    and welcome_email_sent_at is null
    and (welcome_email_claimed_at is null or welcome_email_claimed_at < now() - interval '5 minutes')
  returning profiles.first_name into v_first_name;

  if not found then
    return query select false, null::text, null::text;
    return;
  end if;

  return query select true, v_first_name, auth.email();
end;
$$;

grant execute on function public.claim_welcome_email() to authenticated;

create or replace function public.complete_welcome_email()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set welcome_email_sent_at = now()
  where id = auth.uid() and welcome_email_sent_at is null;
end;
$$;

grant execute on function public.complete_welcome_email() to authenticated;

create or replace function public.release_welcome_email()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set welcome_email_claimed_at = null
  where id = auth.uid() and welcome_email_sent_at is null;
end;
$$;

grant execute on function public.release_welcome_email() to authenticated;

-- ============================================================================
-- Enrollment confirmation email
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
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  update public.enrollments
  set enrollment_email_claimed_at = now()
  where user_id = v_user
    and course_id = p_course_id
    and enrollment_email_sent_at is null
    and (enrollment_email_claimed_at is null or enrollment_email_claimed_at < now() - interval '5 minutes');

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

create or replace function public.complete_enrollment_email(p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.enrollments
  set enrollment_email_sent_at = now()
  where user_id = auth.uid() and course_id = p_course_id and enrollment_email_sent_at is null;
end;
$$;

grant execute on function public.complete_enrollment_email(uuid) to authenticated;

create or replace function public.release_enrollment_email(p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.enrollments
  set enrollment_email_claimed_at = null
  where user_id = auth.uid() and course_id = p_course_id and enrollment_email_sent_at is null;
end;
$$;

grant execute on function public.release_enrollment_email(uuid) to authenticated;

-- ============================================================================
-- Course completion email
-- ============================================================================
-- Still recomputes "are all published lessons actually complete?"
-- server-side on every claim attempt — never trusts a client-supplied
-- "I finished" flag, exactly as in Phase 5.
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
  set completion_email_claimed_at = now()
  where user_id = v_user
    and course_id = p_course_id
    and completion_email_sent_at is null
    and (completion_email_claimed_at is null or completion_email_claimed_at < now() - interval '5 minutes');

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

create or replace function public.complete_completion_email(p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.enrollments
  set completion_email_sent_at = now()
  where user_id = auth.uid() and course_id = p_course_id and completion_email_sent_at is null;
end;
$$;

grant execute on function public.complete_completion_email(uuid) to authenticated;

create or replace function public.release_completion_email(p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.enrollments
  set completion_email_claimed_at = null
  where user_id = auth.uid() and course_id = p_course_id and completion_email_sent_at is null;
end;
$$;

grant execute on function public.release_completion_email(uuid) to authenticated;

-- ============================================================================
-- Certificate issued email
-- ============================================================================
-- Still does not issue the certificate itself — issue_certificate_if_eligible()
-- in schema.sql remains the only place a certificates row is ever created.
-- This only claims/finalizes/releases the right to email about a
-- certificate that already exists.
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
  set certificate_email_claimed_at = now()
  where user_id = v_user
    and course_id = p_course_id
    and certificate_email_sent_at is null
    and (certificate_email_claimed_at is null or certificate_email_claimed_at < now() - interval '5 minutes')
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

create or replace function public.complete_certificate_email(p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.certificates
  set certificate_email_sent_at = now()
  where user_id = auth.uid() and course_id = p_course_id and certificate_email_sent_at is null;
end;
$$;

grant execute on function public.complete_certificate_email(uuid) to authenticated;

create or replace function public.release_certificate_email(p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.certificates
  set certificate_email_claimed_at = null
  where user_id = auth.uid() and course_id = p_course_id and certificate_email_sent_at is null;
end;
$$;

grant execute on function public.release_certificate_email(uuid) to authenticated;
