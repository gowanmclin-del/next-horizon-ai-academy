-- ============================================================================
-- Next Horizon AI Academy — Phase 8 migration (audit log, admin promotion,
-- Stripe refunds, course metadata editing)
-- ============================================================================
-- Run this AFTER schema.sql, seed.sql, phase5.sql, phase5.1.sql, phase6.sql,
-- and phase7.sql, against the same database. Fully additive: no table
-- dropped, no column removed, no existing data destroyed. The only
-- previously-defined functions touched are admin_grant_enrollment() and
-- admin_revoke_enrollment() (Phase 7), replaced via CREATE OR REPLACE
-- purely to add an audit-log entry — their authorization logic and
-- behavior are otherwise unchanged.
--
-- This has NOT been executed against a live database in this environment
-- (no network access here — see PHASE8-NOTES.md).
-- ============================================================================

-- ============================================================================
-- 1. admin_audit_log
-- ============================================================================
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_admin_id_idx on public.admin_audit_log (admin_id);

alter table public.admin_audit_log enable row level security;

-- Admins can read the log; there is deliberately NO insert/update/delete
-- policy for any client role at all, for anyone, including admins. Every
-- row is written by a SECURITY DEFINER function (admin_log_action, or
-- inline inserts inside admin_promote_user / admin_grant_enrollment /
-- admin_revoke_enrollment / admin_mark_order_refunded below), which are
-- owned by the database itself and bypass this restriction internally —
-- the same pattern already established for every other sensitive write in
-- this codebase. This means the log cannot be edited or deleted through
-- the API by anyone, admin included, short of direct database access —
-- appropriate for an audit trail.
create policy "admin_audit_log: admin read" on public.admin_audit_log
  for select using (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- admin_log_action — general-purpose logger for actions that need to be
-- recorded from application code BEFORE a multi-step process completes
-- (specifically: "refund initiated," logged before the Stripe API call,
-- per Phase 8 brief section 3/5). Checks is_admin() itself, so it's safe
-- to grant directly to `authenticated`.
-- ----------------------------------------------------------------------------
create or replace function public.admin_log_action(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_metadata);
end;
$$;

grant execute on function public.admin_log_action(text, text, uuid, jsonb) to authenticated;

-- ============================================================================
-- 2. admin_promote_user — the only way a profile's role can become 'admin'
-- ============================================================================
-- Note this is a DIFFERENT enforcement point than the Phase 7
-- prevent_role_self_escalation trigger — that trigger stops a raw UPDATE
-- from changing role; this function is the sanctioned path an admin uses
-- to promote someone, and it fires the same trigger when it runs its own
-- UPDATE (harmlessly — the trigger sees the calling admin's auth.uid(),
-- confirms they're already an admin, and lets the change through). Both
-- layers independently arrive at "only an existing admin can create
-- another admin."
create or replace function public.admin_promote_user(p_target_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_target_role text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if p_target_user_id is null then
    raise exception 'Invalid user id';
  end if;

  select role into v_target_role from public.profiles where id = p_target_user_id;
  if v_target_role is null then
    raise exception 'User not found';
  end if;
  if v_target_role = 'admin' then
    raise exception 'User is already an admin';
  end if;

  update public.profiles set role = 'admin' where id = p_target_user_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'admin_promoted', 'profile', p_target_user_id, '{}'::jsonb);
end;
$$;

grant execute on function public.admin_promote_user(uuid) to authenticated;

-- ============================================================================
-- 3. Phase 7 enrollment functions — add audit logging (behavior unchanged)
-- ============================================================================
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

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (
    auth.uid(), 'enrollment_granted', 'enrollment', v_enrollment_id,
    jsonb_build_object('student_id', p_student_id, 'course_id', p_course_id, 'enrollment_type', p_enrollment_type, 'note', p_note)
  );

  return v_enrollment_id;
end;
$$;

grant execute on function public.admin_grant_enrollment(uuid, uuid, text, text) to authenticated;

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

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'enrollment_revoked', 'enrollment', p_enrollment_id, jsonb_build_object('note', p_note));
end;
$$;

grant execute on function public.admin_revoke_enrollment(uuid, text) to authenticated;

-- ============================================================================
-- 4. admin_mark_order_refunded — the ONLY way an order's status can become
--    'refunded'. Called AFTER the Stripe refund API call has already
--    succeeded (see lib/actions/admin.ts refundOrder()) — this function
--    itself never talks to Stripe, it only records the outcome.
-- ============================================================================
create or replace function public.admin_mark_order_refunded(
  p_order_id uuid,
  p_revoke_enrollment boolean,
  p_stripe_refund_id text,
  p_note text default null
)
returns table (order_id uuid, enrollment_revoked boolean)
language plpgsql
security definer set search_path = public
as $$
declare
  v_order public.orders;
  v_revoked boolean := false;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  -- Atomic guard: only a currently-'paid' order can transition to
  -- 'refunded'. If this order was already refunded (e.g. a duplicate
  -- request slipped through), this UPDATE matches zero rows and the
  -- function raises rather than silently double-processing — protecting
  -- against accidentally recording the same refund twice even if the
  -- Stripe call itself somehow ran twice.
  update public.orders
  set status = 'refunded', refunded_at = now()
  where id = p_order_id and status = 'paid'
  returning * into v_order;

  if v_order.id is null then
    raise exception 'Order not found or not refundable (already refunded, or not paid)';
  end if;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (
    auth.uid(), 'refund_completed', 'order', p_order_id,
    jsonb_build_object('stripe_refund_id', p_stripe_refund_id, 'amount_cents', v_order.amount_cents, 'currency', v_order.currency, 'note', p_note)
  );

  if p_revoke_enrollment then
    update public.enrollments
    set status = 'revoked'
    where order_id = p_order_id and status <> 'revoked'
    returning true into v_revoked;

    if v_revoked then
      insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
      values (auth.uid(), 'enrollment_revoked_refund', 'order', p_order_id, jsonb_build_object('note', p_note));
    end if;
  end if;

  return query select p_order_id, coalesce(v_revoked, false);
end;
$$;

grant execute on function public.admin_mark_order_refunded(uuid, boolean, text, text) to authenticated;

-- ============================================================================
-- 5. admin_update_course — limited metadata editing (Phase 8 brief section 9)
-- ============================================================================
-- Deliberately narrow: title, description, price, and publish status only.
-- Does not touch modules/lessons/assessment content — a full
-- course-authoring system is explicitly out of scope for this phase.
create or replace function public.admin_update_course(
  p_course_id uuid,
  p_title text,
  p_description text,
  p_price_cents integer,
  p_status text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('draft', 'published', 'archived') then
    raise exception 'Invalid status: %', p_status;
  end if;
  if p_price_cents is not null and p_price_cents < 0 then
    raise exception 'Price cannot be negative';
  end if;

  update public.courses
  set title = p_title,
      description = p_description,
      price_cents = p_price_cents,
      status = p_status,
      updated_at = now()
  where id = p_course_id;

  if not found then
    raise exception 'Course not found';
  end if;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'course_updated', 'course', p_course_id, jsonb_build_object('title', p_title, 'status', p_status));
end;
$$;

grant execute on function public.admin_update_course(uuid, text, text, integer, text) to authenticated;
