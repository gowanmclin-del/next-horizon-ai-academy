-- ============================================================================
-- Next Horizon AI Academy — Phase 6 migration (payments & paid enrollment)
-- ============================================================================
-- Run this AFTER schema.sql, seed.sql, phase5.sql, and phase5.1.sql, against
-- the same database. Additive in every place except one deliberate,
-- necessary policy change on `enrollments` — see "SECURITY-CRITICAL POLICY
-- CHANGE" below. No table is dropped and no existing data is destroyed.
--
-- This has NOT been executed against a live database in this environment
-- (no network access here — see PHASE6-NOTES.md).
-- ============================================================================

-- ============================================================================
-- 1. Course pricing fields
-- ============================================================================
alter table public.courses
  add column if not exists price_cents integer,
  add column if not exists sale_price_cents integer,
  add column if not exists currency text not null default 'usd',
  add column if not exists is_paid boolean not null default false,
  add column if not exists enrollment_open boolean not null default true,
  add column if not exists stripe_product_id text,
  add column if not exists stripe_price_id text;

-- AI-101 becomes the academy's first paid course. stripe_product_id/
-- stripe_price_id are left NULL deliberately — see PHASE6-NOTES.md
-- "Stripe setup" for why checkout still works without them (the checkout
-- creation code falls back to Stripe's price_data with price_cents when no
-- stripe_price_id is configured) and how to fill them in once a real
-- Stripe product/price exists.
update public.courses
set is_paid = true,
    price_cents = 4900,
    currency = 'usd'
where slug = 'ai-101';

-- ============================================================================
-- 2. orders table
-- ============================================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  amount_cents integer not null check (amount_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'canceled', 'refunded')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_course_id_idx on public.orders (course_id);
create index if not exists orders_status_idx on public.orders (status);

alter table public.orders enable row level security;

-- Students may read their own order history (e.g. the purchase-success
-- page polling for status), but there is deliberately NO insert/update/
-- delete policy for `authenticated` or `anon` here. Every write to this
-- table happens through the SECURITY DEFINER functions below — a pending
-- order is created by create_pending_order() (acting as the student, but
-- computing the amount itself from the course's canonical price, never
-- from client input), and every subsequent status transition happens only
-- through process_stripe_payment_event(), which is callable only by the
-- service_role connection used inside the Stripe webhook handler — never
-- by a plain authenticated/anon session, and never reachable from the
-- browser.
create policy "orders: read own" on public.orders
  for select using (auth.uid() = user_id);

-- ============================================================================
-- 3. enrollments: payment reference + SECURITY-CRITICAL POLICY CHANGE
-- ============================================================================
alter table public.enrollments
  add column if not exists order_id uuid references public.orders (id) on delete set null;

create index if not exists enrollments_order_id_idx on public.enrollments (order_id);

-- SECURITY-CRITICAL POLICY CHANGE
-- ---------------------------------------------------------------------------
-- The Phase 4 "enrollments: insert own" policy let any authenticated
-- student insert an enrollment row for themselves in any published course.
-- That was safe when every course was free, but AI-101 is now paid (see
-- step 1 above) — left unchanged, that policy would let a student grant
-- themselves free access to a paid course by calling the Supabase REST API
-- directly, bypassing Stripe entirely.
--
-- This replaces that policy with a narrower one that only allows
-- self-service enrollment INSERT for courses that are NOT paid. Paid-course
-- enrollment now happens exclusively through process_stripe_payment_event()
-- below, which only the webhook's service_role connection can call. This is
-- a deliberate tightening required to make the payment model secure, not a
-- destructive change — free-course enrollment (the only kind that existed
-- before Phase 6) behaves exactly as before.
drop policy if exists "enrollments: insert own" on public.enrollments;

create policy "enrollments: insert own free course" on public.enrollments
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.status = 'published' and c.is_paid = false
    )
  );

-- ============================================================================
-- 4. create_pending_order — student-initiated, amount computed server-side
-- ============================================================================
-- Called by the authenticated student (via the cookie-scoped server
-- Supabase client, never the browser client) when they click a paid
-- course's enrollment CTA. The amount and currency are read from the
-- course row inside this function — the client never supplies a price, so
-- there is no way to check out at an altered amount.
create or replace function public.create_pending_order(p_course_id uuid)
returns table (order_id uuid, amount_cents integer, currency text, stripe_price_id text, course_title text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_course record;
  v_amount integer;
  v_order_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_course from public.courses
  where id = p_course_id and status = 'published';

  if v_course is null then
    raise exception 'Course not found or not published';
  end if;
  if not v_course.is_paid then
    raise exception 'This course is not a paid course';
  end if;
  if not v_course.enrollment_open then
    raise exception 'Enrollment is not currently open for this course';
  end if;
  if exists (select 1 from public.enrollments where user_id = v_user and course_id = p_course_id) then
    raise exception 'Already enrolled in this course';
  end if;

  v_amount := coalesce(v_course.sale_price_cents, v_course.price_cents);
  if v_amount is null then
    raise exception 'Course has no price configured';
  end if;

  insert into public.orders (user_id, course_id, provider, amount_cents, currency, status)
  values (v_user, p_course_id, 'stripe', v_amount, v_course.currency, 'pending')
  returning id into v_order_id;

  return query select v_order_id, v_amount, v_course.currency, v_course.stripe_price_id, v_course.title;
end;
$$;

grant execute on function public.create_pending_order(uuid) to authenticated;

-- ============================================================================
-- 5. attach_checkout_session — records the Stripe session id after creation
-- ============================================================================
-- The Stripe Checkout Session can only be created from Node (via the
-- Stripe SDK, server-only, using STRIPE_SECRET_KEY), which happens after
-- create_pending_order() returns — so the session id has to be attached in
-- a second call. Scoped so a student can only attach a session to an order
-- they themselves own, and only while it's still pending.
create or replace function public.attach_checkout_session(p_order_id uuid, p_session_id text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.orders
  set stripe_checkout_session_id = p_session_id
  where id = p_order_id and user_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Order not found, not pending, or not owned by the caller';
  end if;
end;
$$;

grant execute on function public.attach_checkout_session(uuid, text) to authenticated;

-- ============================================================================
-- 6. process_stripe_payment_event — webhook-only, service_role-only
-- ============================================================================
-- This is the ONLY place an order transitions to 'paid' (or 'failed',
-- 'canceled', 'refunded'), and the ONLY place a paid-course enrollment row
-- is ever created. It is called exclusively from
-- app/api/webhooks/stripe/route.ts, using the Supabase service-role client
-- — never the anon-key client, never reachable from the browser — and only
-- after that route has verified the request's Stripe signature against
-- STRIPE_WEBHOOK_SECRET. There is no auth.uid() available in a webhook
-- request (Stripe doesn't send a Supabase session), so this function is
-- explicitly and exclusively granted to the `service_role` — a plain
-- authenticated or anonymous caller cannot invoke it at all, at any
-- privilege level, so a leaked/guessed checkout session id alone (which is
-- not secret — Stripe puts it in the success-page URL) can never be used
-- to fake a "paid" status. Idempotent: calling this twice with the same
-- session id and status has no additional effect the second time.
create or replace function public.process_stripe_payment_event(
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_new_status text
)
returns table (order_id uuid, applied boolean)
language plpgsql
security definer set search_path = public
as $$
declare
  v_order record;
begin
  if p_new_status not in ('paid', 'failed', 'canceled', 'refunded') then
    raise exception 'Invalid status: %', p_new_status;
  end if;

  select * into v_order from public.orders
  where (p_checkout_session_id is not null and stripe_checkout_session_id = p_checkout_session_id)
     or (p_checkout_session_id is null and p_payment_intent_id is not null and stripe_payment_intent_id = p_payment_intent_id)
  for update;

  if v_order is null then
    return query select null::uuid, false;
    return;
  end if;

  if p_new_status = 'paid' then
    -- Only transition pending -> paid. If already paid (duplicate webhook
    -- delivery) or in any other terminal state, this is a no-op — the
    -- enrollment insert below is skipped too, so no duplicate enrollment
    -- and no re-processing of an already-settled order.
    update public.orders
    set status = 'paid', paid_at = now(), stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id)
    where id = v_order.id and status = 'pending';

    if found then
      insert into public.enrollments (user_id, course_id, order_id, status)
      values (v_order.user_id, v_order.course_id, v_order.id, 'active')
      on conflict (user_id, course_id) do nothing;
      return query select v_order.id, true;
    else
      return query select v_order.id, false;
    end if;

  elsif p_new_status in ('failed', 'canceled') then
    -- Only downgrade from pending — never overwrite an order that's
    -- already paid or refunded because of a late/out-of-order webhook.
    update public.orders
    set status = p_new_status
    where id = v_order.id and status = 'pending';
    return query select v_order.id, found;

  else -- 'refunded'
    -- Only a paid order can be refunded. Refunding does NOT touch the
    -- associated enrollment — see PHASE6-NOTES.md "Refund access policy"
    -- for why that's a deliberate, documented decision rather than an
    -- oversight.
    update public.orders
    set status = 'refunded', refunded_at = now()
    where id = v_order.id and status = 'paid';
    return query select v_order.id, found;
  end if;
end;
$$;

revoke all on function public.process_stripe_payment_event(text, text, text) from public, anon, authenticated;
grant execute on function public.process_stripe_payment_event(text, text, text) to service_role;

-- ============================================================================
-- 7. Explicit-user-id email claim functions for the webhook context
-- ============================================================================
-- The Phase 5.1 claim_enrollment_email()/complete_enrollment_email()/
-- release_enrollment_email() functions all read auth.uid(), which is NULL
-- in a webhook request (no Supabase session). These parallel versions take
-- an explicit user id instead, and — like process_stripe_payment_event —
-- are restricted to service_role only, so they can't be invoked by any
-- ordinary student session. The claim/lease/finalize/release semantics are
-- otherwise identical to Phase 5.1.
create or replace function public.claim_enrollment_email_for_user(p_user_id uuid, p_course_id uuid)
returns table (should_send boolean, first_name text, course_title text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_first_name text;
  v_title text;
begin
  update public.enrollments
  set enrollment_email_claimed_at = now()
  where user_id = p_user_id
    and course_id = p_course_id
    and enrollment_email_sent_at is null
    and (enrollment_email_claimed_at is null or enrollment_email_claimed_at < now() - interval '5 minutes');

  if not found then
    return query select false, null::text, null::text;
    return;
  end if;

  select first_name into v_first_name from public.profiles where id = p_user_id;
  select title into v_title from public.courses where id = p_course_id;

  return query select true, v_first_name, v_title;
end;
$$;

revoke all on function public.claim_enrollment_email_for_user(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_enrollment_email_for_user(uuid, uuid) to service_role;

create or replace function public.complete_enrollment_email_for_user(p_user_id uuid, p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.enrollments
  set enrollment_email_sent_at = now()
  where user_id = p_user_id and course_id = p_course_id and enrollment_email_sent_at is null;
end;
$$;

revoke all on function public.complete_enrollment_email_for_user(uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_enrollment_email_for_user(uuid, uuid) to service_role;

create or replace function public.release_enrollment_email_for_user(p_user_id uuid, p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.enrollments
  set enrollment_email_claimed_at = null
  where user_id = p_user_id and course_id = p_course_id and enrollment_email_sent_at is null;
end;
$$;

revoke all on function public.release_enrollment_email_for_user(uuid, uuid) from public, anon, authenticated;
grant execute on function public.release_enrollment_email_for_user(uuid, uuid) to service_role;
