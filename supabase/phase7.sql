-- ============================================================================
-- Next Horizon AI Academy — Phase 7 migration (academy administration)
-- ============================================================================
-- Run this AFTER schema.sql, seed.sql, phase5.sql, phase5.1.sql, and
-- phase6.sql, against the same database. Additive except for one widened
-- CHECK constraint on enrollments.status (adds two new allowed values,
-- removes none) — no table dropped, no existing data destroyed.
--
-- This has NOT been executed against a live database in this environment
-- (no network access here — see PHASE7-NOTES.md).
-- ============================================================================

-- ============================================================================
-- 1. profiles.role
-- ============================================================================
alter table public.profiles
  add column if not exists role text not null default 'student'
    check (role in ('student', 'admin'));

-- ----------------------------------------------------------------------------
-- is_admin() — the single source of truth for "is this user an admin?"
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER so it can read `profiles` regardless of the caller's own
-- RLS visibility (needed because it's used INSIDE other RLS policies on
-- `profiles` itself below — a plain `security invoker` function would
-- recurse into the same RLS check it's trying to help evaluate).
create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = p_user_id),
    false
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- SECURITY-CRITICAL: prevent students from promoting themselves to admin
-- ----------------------------------------------------------------------------
-- RLS is row-level, not column-level — the existing "profiles: update own"
-- policy (from schema.sql) lets a student update ANY column on their own
-- row, `role` included, if nothing else stops them. This trigger is that
-- stop: any UPDATE that changes `role` is silently reverted back to the
-- row's previous value unless the calling user is already an admin. This
-- runs for every UPDATE regardless of source (the app's own code, or a
-- student calling the Supabase REST API directly), so it's a real
-- enforcement point, not just a UI restriction.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if not public.is_admin(auth.uid()) then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ----------------------------------------------------------------------------
-- Admin read access to profiles
-- ----------------------------------------------------------------------------
create policy "profiles: admin read all" on public.profiles
  for select using (public.is_admin(auth.uid()));

-- ============================================================================
-- 2. enrollments — admin/complimentary-enrollment fields
-- ============================================================================
alter table public.enrollments
  add column if not exists enrollment_type text not null default 'paid'
    check (enrollment_type in ('paid', 'complimentary', 'scholarship', 'administrative')),
  add column if not exists granted_by uuid references auth.users (id) on delete set null,
  add column if not exists admin_note text,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists enrollments_set_updated_at on public.enrollments;
create trigger enrollments_set_updated_at
  before update on public.enrollments
  for each row execute function public.set_updated_at(); -- reuses the function defined in schema.sql

-- Widen the status values enrollments can represent (Phase 7 brief section
-- 7: Active / Completed / Revoked / Refunded). Adds 'revoked' — 'refunded'
-- already existed as a concept via orders.status but enrollments itself
-- had no matching value, so a refunded order couldn't be reflected on the
-- enrollment row it produced. This does not remove any previously-allowed
-- value, so no existing row can violate the new constraint.
alter table public.enrollments drop constraint if exists enrollments_status_check;
alter table public.enrollments add constraint enrollments_status_check
  check (status in ('enrolled', 'active', 'completed', 'cancelled', 'revoked', 'refunded'));

-- Backfill: every enrollment created before this migration was, by
-- definition, paid (Phase 6 was Stripe-only) — reflect that explicitly
-- rather than leaving historical rows at the new default of 'paid' by
-- coincidence alone. (They already default to 'paid' from the column
-- definition above, so this UPDATE is a no-op today, but is included for
-- clarity and safety if the column default is ever changed later.)
update public.enrollments set enrollment_type = 'paid' where enrollment_type is null;

-- ----------------------------------------------------------------------------
-- Admin read access to enrollments
-- ----------------------------------------------------------------------------
create policy "enrollments: admin read all" on public.enrollments
  for select using (public.is_admin(auth.uid()));

-- ============================================================================
-- 3. Admin read access to orders, certificates, lesson_progress, courses
-- ============================================================================
create policy "orders: admin read all" on public.orders
  for select using (public.is_admin(auth.uid()));

create policy "certificates: admin read all" on public.certificates
  for select using (public.is_admin(auth.uid()));

create policy "lesson_progress: admin read all" on public.lesson_progress
  for select using (public.is_admin(auth.uid()));

-- Admins can see draft/unpublished courses too, not just published ones
-- (the existing "courses: public read published" policy from schema.sql
-- only covers status = 'published').
create policy "courses: admin read all" on public.courses
  for select using (public.is_admin(auth.uid()));

-- ============================================================================
-- 4. admin_grant_enrollment — complimentary/scholarship/administrative access
-- ============================================================================
-- The only way a non-'paid' enrollment can ever be created. Checks
-- is_admin() internally rather than relying on a broad RLS INSERT policy —
-- consistent with how every other sensitive write in this codebase
-- (create_pending_order, issue_certificate_if_eligible,
-- process_stripe_payment_event) is function-gated rather than
-- policy-gated. A student calling this directly gets a clean exception,
-- not a silently-accepted row.
create or replace function public.admin_grant_enrollment(
  p_student_id uuid,
  p_course_id uuid,
  p_enrollment_type text,
  p_note text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_enrollment_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if p_enrollment_type not in ('complimentary', 'scholarship', 'administrative') then
    raise exception 'Invalid enrollment type for an admin grant: %', p_enrollment_type;
  end if;
  if not exists (select 1 from public.profiles where id = p_student_id) then
    raise exception 'Student not found';
  end if;
  if not exists (select 1 from public.courses where id = p_course_id and status = 'published') then
    raise exception 'Course not found or not published';
  end if;
  if exists (select 1 from public.enrollments where user_id = p_student_id and course_id = p_course_id) then
    raise exception 'Student is already enrolled in this course';
  end if;

  insert into public.enrollments (user_id, course_id, status, enrollment_type, granted_by, admin_note, started_at)
  values (p_student_id, p_course_id, 'active', p_enrollment_type, auth.uid(), p_note, now())
  returning id into v_enrollment_id;

  return v_enrollment_id;
end;
$$;

grant execute on function public.admin_grant_enrollment(uuid, uuid, text, text) to authenticated;

-- ============================================================================
-- 5. admin_revoke_enrollment — sets status to 'revoked', preserves history
-- ============================================================================
-- Never deletes the enrollment row or touches the linked order (if any) —
-- see PHASE7-NOTES.md "Refund/access status architecture" for why
-- preserving history here matters.
create or replace function public.admin_revoke_enrollment(p_enrollment_id uuid, p_note text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  update public.enrollments
  set status = 'revoked',
      admin_note = coalesce(p_note, admin_note)
  where id = p_enrollment_id;

  if not found then
    raise exception 'Enrollment not found';
  end if;
end;
$$;

grant execute on function public.admin_revoke_enrollment(uuid, text) to authenticated;
