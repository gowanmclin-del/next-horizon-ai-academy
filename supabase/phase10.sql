-- ============================================================================
-- Next Horizon AI Academy — Phase 10 migration (multi-course creation)
-- ============================================================================
-- Run this AFTER schema.sql, seed.sql, phase5.sql, phase5.1.sql, phase6.sql,
-- phase7.sql, phase8.sql, and phase9.sql, against the same database. Fully
-- additive: one new function, zero new tables, zero new columns, zero new
-- RLS policies, zero changes to any prior migration file.
--
-- Why no new RLS policy is needed: "courses: public read published"
-- (schema.sql) already restricts public visibility to status = 'published'
-- for ANY course, not just AI-101 — it was never AI-101-specific. A newly
-- created draft course is invisible to anon/authenticated the same way any
-- other draft course already is. "courses: admin read all" (phase7.sql)
-- already lets admins see every course regardless of status. Course
-- *creation* itself only needed a write path, which is the function below.
--
-- This has NOT been executed against a live database in this environment
-- (no network access here — see PHASE10-NOTES.md).
-- ============================================================================

create or replace function public.admin_create_course(
  p_title text,
  p_slug text,
  p_short_description text,
  p_description text,
  p_price_cents integer,
  p_status text,
  p_certification_name text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_course_id uuid;
  v_is_paid boolean;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Title is required';
  end if;
  -- is_valid_slug() was defined in supabase/phase9.sql — reused here
  -- rather than redefined, per the "do not modify prior migrations"
  -- instruction; it's still available since phase9.sql runs first.
  if p_slug is null or not public.is_valid_slug(p_slug) then
    raise exception 'Slug must be lowercase letters, numbers, and hyphens only (e.g. "ai-201-advanced-prompting")';
  end if;
  if p_status not in ('draft', 'published', 'archived') then
    raise exception 'Invalid status: %', p_status;
  end if;
  if p_price_cents is not null and p_price_cents < 0 then
    raise exception 'Price cannot be negative';
  end if;

  v_is_paid := p_price_cents is not null and p_price_cents > 0;

  begin
    insert into public.courses (
      slug, title, short_description, description, status,
      price_cents, currency, is_paid, certification_name
    )
    values (
      p_slug, p_title, p_short_description, p_description, p_status,
      p_price_cents, 'usd', v_is_paid, p_certification_name
    )
    returning id into v_course_id;
  exception
    when unique_violation then
      raise exception 'A course with that slug already exists';
  end;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (
    auth.uid(), 'course_created', 'course', v_course_id,
    jsonb_build_object('title', p_title, 'slug', p_slug, 'status', p_status)
  );

  return v_course_id;
end;
$$;

grant execute on function public.admin_create_course(text, text, text, text, integer, text, text) to authenticated;
