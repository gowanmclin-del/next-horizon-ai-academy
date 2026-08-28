-- ============================================================================
-- Next Horizon AI Academy — Phase 18 migration (reorder-function fix)
-- ============================================================================
-- Run this AFTER schema.sql through phase17.sql, against the same
-- database. Fully additive in the schema sense (no table, column, or RLS
-- change) — the only change is a CREATE OR REPLACE of two existing
-- functions (admin_reorder_modules, admin_reorder_lessons, originally
-- defined in supabase/phase9.sql), following the exact same
-- replace-don't-edit pattern already used in phase8.sql, phase9.sql, and
-- phase11.sql for shared functions. No prior migration *file* is
-- modified.
--
-- This has NOT been executed against a live database in this environment
-- (no network access here — see PHASE18-NOTES.md).
--
-- ----------------------------------------------------------------------------
-- THE DEFECT THIS FIXES
-- ----------------------------------------------------------------------------
-- Phase 17 (supabase/phase17.sql) added:
--   alter table public.modules add constraint modules_position_check check (position >= 1);
--   alter table public.lessons add constraint lessons_position_check check (position >= 1);
--
-- The original admin_reorder_modules()/admin_reorder_lessons()
-- (Phase 9) reordered atomically by first moving every row to a
-- *negative* position (`position = -position`), to guarantee no
-- collision with the unique (course_id, position)/(module_id, position)
-- constraint while assigning final positions in a second pass. After
-- Phase 17's CHECK constraints exist, that same UPDATE statement fails
-- immediately — a negative position is now invalid by definition. Applied
-- in the documented order (phase9.sql then phase17.sql), reordering
-- modules or lessons would have been completely broken from that point
-- on: every call would raise a check-constraint-violation error.
--
-- ----------------------------------------------------------------------------
-- THE FIX
-- ----------------------------------------------------------------------------
-- Replace the negative-position trick with a large *positive* offset
-- instead: `position = position + 1000000`. This preserves every
-- property the negative trick provided:
--   - Collision-free: since the original positions for a given parent
--     were already unique (enforced by the existing unique constraint),
--     adding the same constant to every one of them preserves that
--     uniqueness — no two shifted rows can collide with each other.
--   - Always positive: original position >= 1 (enforced by Phase 17)
--     plus a positive offset is always positive — the CHECK constraint
--     is satisfied at every intermediate step, not just the final state.
--   - Never collides with the final target range: final positions are
--     always 1..N (N = the number of children), and the offset
--     (1,000,000) is many orders of magnitude larger than any realistic
--     course/module's child count, so the temporary range and the final
--     range can never overlap.
-- Because every child of the parent is included in the reorder (enforced
-- by the existing count/membership validation, tightened below), *all*
-- of that parent's rows move to the temporary range together before any
-- row is assigned its final position — so the assignment loop can never
-- collide with a row still sitting at an old "real" position either.
--
-- ----------------------------------------------------------------------------
-- ADDITIONAL ISSUES FOUND DURING THIS REVIEW (fixed here, not previously
-- caught)
-- ----------------------------------------------------------------------------
-- 1. DUPLICATE IDs in p_ordered_ids were never rejected. The original
--    validation only checked (a) the array length matches the child
--    count, and (b) every array element belongs to the parent — neither
--    check catches a duplicate paired with a missing id (e.g. [A, A, C]
--    submitted instead of [A, B, C]). Under the original two-phase
--    logic, this would silently leave the omitted child (B) stranded at
--    its temporary/negative position forever, with no error raised —
--    a real, silent data-integrity bug, independent of the Phase 17
--    constraint issue. Fixed by explicitly comparing the array's
--    distinct-element count against its raw length.
-- 2. INVALID PARENT IDs (a course_id or module_id that doesn't exist)
--    previously produced a silent no-op rather than a clear error when
--    paired with an empty ordered-ids array (0 expected = 0 submitted
--    passes the old check even though the parent itself doesn't exist).
--    Fixed by an explicit existence check up front.
-- 3. CONCURRENT REQUESTS on the same parent: Postgres's normal row-level
--    locking already serializes two concurrent calls that touch the same
--    rows — the second call simply waits for the first transaction to
--    commit, then proceeds against the now-updated state. Both calls
--    still individually satisfy every constraint at every step; no
--    special handling was needed or added for this case beyond what
--    Postgres already guarantees. Documented here rather than silently
--    assumed.
-- ============================================================================

create or replace function public.admin_reorder_modules(p_course_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
  v_pos int;
  v_expected_count int;
  v_distinct_count int;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  if not exists (select 1 from public.courses where id = p_course_id) then
    raise exception 'Course not found';
  end if;

  select count(*) into v_expected_count from public.modules where course_id = p_course_id;
  if v_expected_count <> coalesce(array_length(p_ordered_ids, 1), 0) then
    raise exception 'Reorder list does not match the module count for this course';
  end if;
  if exists (
    select 1 from unnest(p_ordered_ids) as id
    where id not in (select id from public.modules where course_id = p_course_id)
  ) then
    raise exception 'Reorder list contains a module that does not belong to this course';
  end if;

  -- Reject duplicate ids — see "Additional issues found" above.
  select count(distinct id) into v_distinct_count from unnest(p_ordered_ids) as id;
  if v_distinct_count <> coalesce(array_length(p_ordered_ids, 1), 0) then
    raise exception 'Reorder list contains a duplicate module id';
  end if;

  -- Phase 1: shift every affected row into a temporary positive range,
  -- guaranteed collision-free with both the existing positions and the
  -- final 1..N target range — see "THE FIX" above for why this is safe.
  update public.modules set position = position + 1000000 where course_id = p_course_id;

  -- Phase 2: assign final 1..N positions in the submitted order. At this
  -- point every module for this course is at a temporary (7-digit+)
  -- position, so this loop can never collide with the unique
  -- (course_id, position) constraint.
  v_pos := 1;
  foreach v_id in array p_ordered_ids loop
    update public.modules set position = v_pos where id = v_id;
    v_pos := v_pos + 1;
  end loop;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'modules_reordered', 'course', p_course_id, jsonb_build_object('order', p_ordered_ids));
end;
$$;

grant execute on function public.admin_reorder_modules(uuid, uuid[]) to authenticated;

create or replace function public.admin_reorder_lessons(p_module_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
  v_pos int;
  v_expected_count int;
  v_distinct_count int;
  v_course_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  if not exists (select 1 from public.modules where id = p_module_id) then
    raise exception 'Module not found';
  end if;

  select count(*) into v_expected_count from public.lessons where module_id = p_module_id;
  if v_expected_count <> coalesce(array_length(p_ordered_ids, 1), 0) then
    raise exception 'Reorder list does not match the lesson count for this module';
  end if;
  if exists (
    select 1 from unnest(p_ordered_ids) as id
    where id not in (select id from public.lessons where module_id = p_module_id)
  ) then
    raise exception 'Reorder list contains a lesson that does not belong to this module';
  end if;

  -- Reject duplicate ids — see "Additional issues found" above.
  select count(distinct id) into v_distinct_count from unnest(p_ordered_ids) as id;
  if v_distinct_count <> coalesce(array_length(p_ordered_ids, 1), 0) then
    raise exception 'Reorder list contains a duplicate lesson id';
  end if;

  -- Same offset-based two-phase approach as admin_reorder_modules above.
  update public.lessons set position = position + 1000000 where module_id = p_module_id;

  v_pos := 1;
  foreach v_id in array p_ordered_ids loop
    update public.lessons set position = v_pos where id = v_id;
    v_pos := v_pos + 1;
  end loop;

  select course_id into v_course_id from public.modules where id = p_module_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'lessons_reordered', 'module', p_module_id, jsonb_build_object('course_id', v_course_id, 'order', p_ordered_ids));
end;
$$;

grant execute on function public.admin_reorder_lessons(uuid, uuid[]) to authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these manually in the Supabase SQL Editor after applying phase17.sql
-- and phase18.sql, in order, against a real database. None of these run
-- automatically as part of the migration itself.

-- 1. Confirm all five Phase 17 constraints exist.
select conname, conrelid::regclass as table_name, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in (
  'courses_price_cents_check',
  'courses_sale_price_cents_check',
  'modules_position_check',
  'lessons_position_check',
  'lessons_duration_minutes_check'
)
order by conname;
-- Expect: exactly 5 rows returned.

-- 2. After reordering modules/lessons through the admin Course Builder UI
--    (or by calling the RPCs directly as an authenticated admin), confirm
--    every position is positive, unique, and sequential (1..N with no
--    gaps) per course/module:
select course_id, array_agg(position order by position) as positions
from public.modules
group by course_id
having array_agg(position order by position) <> array(select generate_series(1, count(*)) from public.modules m2 where m2.course_id = modules.course_id);
-- Expect: zero rows — any row returned indicates a course whose module
-- positions are not a clean 1..N sequence.

select module_id, array_agg(position order by position) as positions
from public.lessons
group by module_id
having array_agg(position order by position) <> array(select generate_series(1, count(*)) from public.lessons l2 where l2.module_id = lessons.module_id);
-- Expect: zero rows — same check, for lessons within each module.

-- 3. Confirm the CHECK constraints reject an out-of-bounds value directly
--    (run each in its own transaction you intend to roll back — these
--    are meant to fail):
--    begin;
--    update public.modules set position = -1 where id = (select id from public.modules limit 1);
--    -- Expect: ERROR — new row for relation "modules" violates check constraint "modules_position_check"
--    rollback;

-- 4. Confirm unauthorized users cannot invoke admin reordering. This
--    cannot be verified by a context-free SQL query — it requires
--    attempting the RPC as a specific authenticated (non-admin) session.
--    In the Supabase SQL Editor, you can simulate this with:
--    select set_config('request.jwt.claims', json_build_object('sub', '<a real student user id>')::text, true);
--    select public.admin_reorder_modules('<any course id>', array['<any module id>']::uuid[]);
--    -- Expect: ERROR — Not authorized
--    (Reset the session afterward — do not leave request.jwt.claims set.)
