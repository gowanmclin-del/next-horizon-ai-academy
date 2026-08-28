-- ============================================================================
-- Next Horizon AI Academy — Supabase / PostgreSQL schema (Phase 4)
-- ============================================================================
-- This file has NOT been run against a live database in this environment
-- (no network access / no Supabase project connected here). Review it and
-- run it against a real Supabase project's SQL editor or via the Supabase
-- CLI migration tooling before relying on it.
--
-- Design principles used throughout:
-- 1. Students can only read/write rows they own, enforced by RLS using
--    auth.uid(). There is no service-role key in application code.
-- 2. Anything that must not be forgeable from the browser (assessment
--    scoring, certificate issuance) is done inside a SECURITY DEFINER
--    Postgres function that runs with elevated privileges internally but
--    only ever acts on behalf of the calling user (auth.uid()), and correct
--    answers live in a table with NO client-facing SELECT policy at all.
-- 3. Course/module/lesson content is publicly readable when published,
--    since it's marketing/course-catalog content, not private data.
-- ============================================================================

-- Extensions -----------------------------------------------------------------
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ============================================================================
-- profiles
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  professional_role text,
  ai_experience_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Profiles are created automatically by the trigger below — no direct
-- client-side INSERT policy is needed or granted.

-- Auto-create a profile row when a new auth user signs up, reading the
-- fields the signup form passed in as user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, professional_role, ai_experience_level)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'professional_role',
    new.raw_user_meta_data ->> 'ai_experience_level'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- courses / modules / lessons
-- ============================================================================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  certification_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  position int not null,
  unique (course_id, slug),
  unique (course_id, position)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  content text,
  duration_minutes int not null default 5,
  position int not null,
  is_published boolean not null default true,
  unique (module_id, slug),
  unique (module_id, position)
);

alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;

create policy "courses: public read published" on public.courses
  for select using (status = 'published');

create policy "modules: public read of published course" on public.modules
  for select using (
    exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
  );

create policy "lessons: public read of published lesson in published course" on public.lessons
  for select using (
    is_published
    and exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = module_id and c.status = 'published'
    )
  );

-- No INSERT/UPDATE/DELETE policies are defined for courses/modules/lessons —
-- content changes are an admin/service-role operation only (Phase 5+).

-- ============================================================================
-- enrollments
-- ============================================================================
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status text not null default 'enrolled' check (status in ('enrolled', 'active', 'completed', 'cancelled')),
  enrolled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (user_id, course_id)
);

alter table public.enrollments enable row level security;

create policy "enrollments: read own" on public.enrollments
  for select using (auth.uid() = user_id);

create policy "enrollments: insert own" on public.enrollments
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
  );

-- Students may not update their own enrollment status directly (e.g. can't
-- mark themselves "completed") — that transition happens via the
-- certificate-issuance function below, which uses SECURITY DEFINER.

-- ============================================================================
-- lesson_progress
-- ============================================================================
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  last_viewed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

create policy "lesson_progress: read own" on public.lesson_progress
  for select using (auth.uid() = user_id);

create policy "lesson_progress: insert own" on public.lesson_progress
  for insert with check (auth.uid() = user_id);

create policy "lesson_progress: update own" on public.lesson_progress
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- assessments / questions / options / answer keys
-- ============================================================================
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  passing_score int not null default 80 check (passing_score between 0 and 100),
  maximum_attempts int, -- null = unlimited
  is_published boolean not null default true
);

create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  question text not null,
  position int not null,
  unique (assessment_id, position)
);

create table if not exists public.assessment_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions (id) on delete cascade,
  option_text text not null,
  position int not null,
  unique (question_id, position)
);

-- Correct answers live in their own table with NO client SELECT policy at
-- all — only the SECURITY DEFINER grading function below can read it.
create table if not exists public.assessment_answer_keys (
  question_id uuid primary key references public.assessment_questions (id) on delete cascade,
  correct_option_id uuid not null references public.assessment_options (id) on delete cascade
);

alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_options enable row level security;
alter table public.assessment_answer_keys enable row level security;
-- (answer_keys: RLS enabled, zero policies => no client role can read it at all)

create policy "assessments: public read published" on public.assessments
  for select using (is_published);

create policy "assessment_questions: public read of published assessment" on public.assessment_questions
  for select using (
    exists (select 1 from public.assessments a where a.id = assessment_id and a.is_published)
  );

create policy "assessment_options: public read of published assessment" on public.assessment_options
  for select using (
    exists (
      select 1 from public.assessment_questions q
      join public.assessments a on a.id = q.assessment_id
      where q.id = question_id and a.is_published
    )
  );

-- ============================================================================
-- assessment_attempts
-- ============================================================================
create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  score int not null,
  passed boolean not null,
  attempted_at timestamptz not null default now()
);

alter table public.assessment_attempts enable row level security;

create policy "assessment_attempts: read own" on public.assessment_attempts
  for select using (auth.uid() = user_id);

-- No INSERT policy for students — attempts can only be created by the
-- submit_assessment_attempt() function below (SECURITY DEFINER), so a
-- score can never be written directly from the browser.

-- ============================================================================
-- certificates
-- ============================================================================
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  certificate_name text not null,
  certificate_number text not null unique,
  verification_code text not null unique,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, course_id)
);

alter table public.certificates enable row level security;

create policy "certificates: read own" on public.certificates
  for select using (auth.uid() = user_id);

-- No INSERT policy for students — certificates can only be created by the
-- issue_certificate_if_eligible() function below.

-- Certificate verification is a public lookup by code, but must not go
-- through the certificates table directly (that would need a public SELECT
-- policy exposing every row). Instead it goes through a SECURITY DEFINER
-- function that returns only the safe public fields for one matching code.
create or replace function public.verify_certificate(p_verification_code text)
returns table (
  student_name text,
  certificate_name text,
  course_title text,
  certificate_number text,
  issued_at timestamptz,
  status text
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select
      trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as student_name,
      c.certificate_name,
      co.title as course_title,
      c.certificate_number,
      c.issued_at,
      case when c.revoked_at is null then 'valid' else 'revoked' end as status
    from public.certificates c
    join public.profiles p on p.id = c.user_id
    join public.courses co on co.id = c.course_id
    where c.verification_code = p_verification_code;
end;
$$;

-- Callable by anyone, including unauthenticated visitors, since this is the
-- public certificate-verification page.
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ============================================================================
-- submit_assessment_attempt — server-evaluated scoring
-- ============================================================================
-- p_answers shape: { "<question_id>": "<selected_option_id>", ... }
-- The function looks up correct answers from assessment_answer_keys (which
-- the calling client cannot read directly), computes the score itself, and
-- writes the attempt row. The score returned to the client is the same
-- score that was written — the client never supplies a score.
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
  v_score int;
  v_passed boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select a.passing_score into v_passing_score
  from public.assessments a
  where a.id = p_assessment_id and a.is_published;

  if v_passing_score is null then
    raise exception 'Assessment not found or not published';
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

grant execute on function public.submit_assessment_attempt(uuid, jsonb) to authenticated;

-- ============================================================================
-- issue_certificate_if_eligible — server-controlled, idempotent issuance
-- ============================================================================
create or replace function public.issue_certificate_if_eligible(p_course_id uuid)
returns table (
  certificate_number text,
  verification_code text,
  issued_at timestamptz,
  already_issued boolean
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_certification_name text;
  v_total_lessons int;
  v_completed_lessons int;
  v_assessment_id uuid;
  v_has_passed_attempt boolean;
  v_existing record;
  v_cert_number text;
  v_verification_code text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  -- Idempotency: if already issued, just return the existing certificate.
  select * into v_existing from public.certificates
  where user_id = v_user and course_id = p_course_id;

  if found then
    return query select v_existing.certificate_number, v_existing.verification_code, v_existing.issued_at, true;
    return;
  end if;

  -- Must be enrolled.
  if not exists (select 1 from public.enrollments where user_id = v_user and course_id = p_course_id) then
    raise exception 'Not enrolled in this course';
  end if;

  select certification_name into v_certification_name from public.courses where id = p_course_id;
  if v_certification_name is null then
    raise exception 'Course not found';
  end if;

  -- All published lessons in the course must be completed.
  select count(*) into v_total_lessons
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.course_id = p_course_id and l.is_published;

  select count(*) into v_completed_lessons
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  join public.modules m on m.id = l.module_id
  where m.course_id = p_course_id and l.is_published and lp.user_id = v_user and lp.completed;

  if v_total_lessons = 0 or v_completed_lessons < v_total_lessons then
    raise exception 'Course lessons are not fully complete';
  end if;

  -- Must have at least one passed attempt on the course's assessment.
  select id into v_assessment_id from public.assessments where course_id = p_course_id and is_published limit 1;
  if v_assessment_id is null then
    raise exception 'No published assessment configured for this course';
  end if;

  select exists (
    select 1 from public.assessment_attempts
    where user_id = v_user and assessment_id = v_assessment_id and passed
  ) into v_has_passed_attempt;

  if not v_has_passed_attempt then
    raise exception 'Assessment has not been passed yet';
  end if;

  -- Generate a human-readable certificate number and an unguessable
  -- verification code, retrying on the (extremely unlikely) collision.
  loop
    v_cert_number := 'CAFP-' || to_char(now(), 'YYYY') || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8));
    exit when not exists (select 1 from public.certificates where certificate_number = v_cert_number);
  end loop;

  loop
    v_verification_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 16));
    exit when not exists (select 1 from public.certificates where verification_code = v_verification_code);
  end loop;

  insert into public.certificates (user_id, course_id, certificate_name, certificate_number, verification_code)
  values (v_user, p_course_id, v_certification_name, v_cert_number, v_verification_code);

  update public.enrollments
  set status = 'completed', completed_at = now()
  where user_id = v_user and course_id = p_course_id;

  return query select v_cert_number, v_verification_code, now(), false;
end;
$$;

grant execute on function public.issue_certificate_if_eligible(uuid) to authenticated;

-- pgcrypto's gen_random_bytes requires the extension (already enabled above
-- via pgcrypto for gen_random_uuid — gen_random_bytes ships with the same
-- extension).

-- ============================================================================
-- founding_class_interests
-- ============================================================================
create table if not exists public.founding_class_interests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  professional_role text,
  learning_reason text,
  ai_experience_level text,
  created_at timestamptz not null default now()
);

alter table public.founding_class_interests enable row level security;

-- Public (including anonymous visitors) may submit interest, but may not
-- read any submissions back — this is a write-only public form.
create policy "founding_class_interests: public insert" on public.founding_class_interests
  for insert with check (true);

-- ============================================================================
-- launch_subscribers
-- ============================================================================
create table if not exists public.launch_subscribers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.launch_subscribers enable row level security;

create policy "launch_subscribers: public insert" on public.launch_subscribers
  for insert with check (true);

-- Handle "already subscribed" gracefully at the application layer by
-- catching the unique-constraint violation on email (see
-- lib/data/marketing.ts) rather than exposing a SELECT policy here.
