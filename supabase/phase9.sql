-- ============================================================================
-- Next Horizon AI Academy — Phase 9 migration (admin demotion + course
-- authoring: modules, lessons, safe deletion, reordering)
-- ============================================================================
-- Run this AFTER schema.sql, seed.sql, phase5.sql, phase5.1.sql, phase6.sql,
-- phase7.sql, and phase8.sql, against the same database. Fully additive:
-- no table dropped, no column removed, no existing data destroyed, no prior
-- migration file modified. Every function here is new — Phase 8's functions
-- are untouched.
--
-- This has NOT been executed against a live database in this environment
-- (no network access here — see PHASE9-NOTES.md).
--
-- ----------------------------------------------------------------------------
-- WHY DELETION IS SAFETY-GATED (read before reviewing admin_delete_module /
-- admin_delete_lesson below)
-- ----------------------------------------------------------------------------
-- schema.sql defines:
--   lessons.module_id  references modules(id) ON DELETE CASCADE
--   lesson_progress.lesson_id references lessons(id) ON DELETE CASCADE
-- So deleting a module cascades through its lessons and silently destroys
-- every student's lesson_progress history for those lessons — including
-- completions that may already be reflected in an issued certificate's
-- eligibility. A student's certificate record itself is untouched (it has
-- no FK to lessons/modules), but the underlying evidence of how they
-- earned it would vanish, which is not an acceptable trade for routine
-- content editing.
--
-- Both admin_delete_lesson() and admin_delete_module() therefore check for
-- ANY existing lesson_progress row before allowing a hard delete, and
-- reject with a clear message recommending unpublish instead if any is
-- found. This is a deliberate, documented design decision — see
-- PHASE9-NOTES.md "Module/lesson deletion safety decision."
-- ============================================================================

-- ============================================================================
-- 0. Admin read access to modules and lessons (missing from Phase 7/8)
-- ============================================================================
-- Phase 7 added "courses: admin read all" but never a matching policy for
-- modules/lessons — without this, an admin could see a draft *course* but
-- not the draft/unpublished modules and lessons inside a course, which
-- would make the Course Builder unable to display or edit unpublished
-- content at all. This closes that gap. Still read-only — authoring
-- writes continue to go exclusively through the SECURITY DEFINER
-- functions below, never a client INSERT/UPDATE/DELETE policy.
create policy "modules: admin read all" on public.modules
  for select using (public.is_admin(auth.uid()));

create policy "lessons: admin read all" on public.lessons
  for select using (public.is_admin(auth.uid()));

-- ============================================================================
-- 1. admin_demote_user — safe administrator demotion
-- ============================================================================
create or replace function public.admin_demote_user(p_target_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_target_role text;
  v_admin_count int;
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
  if v_target_role <> 'admin' then
    raise exception 'User is not currently an admin';
  end if;

  -- Critical last-admin protection, enforced here in the database — not
  -- only in the UI. Covers both "demote someone else" and "demote myself"
  -- with the same single check: if there is only one admin account total
  -- (regardless of who the caller is), demoting it would leave zero
  -- admins, so it's rejected.
  select count(*) into v_admin_count from public.profiles where role = 'admin';
  if v_admin_count <= 1 then
    raise exception 'Cannot demote the last remaining administrator';
  end if;

  update public.profiles set role = 'student' where id = p_target_user_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (
    auth.uid(), 'admin_demoted', 'profile', p_target_user_id,
    jsonb_build_object('remaining_admins', v_admin_count - 1, 'self_demotion', auth.uid() = p_target_user_id)
  );
end;
$$;

grant execute on function public.admin_demote_user(uuid) to authenticated;

-- ============================================================================
-- 2. Shared slug validation helper
-- ============================================================================
create or replace function public.is_valid_slug(p_slug text)
returns boolean
language sql
immutable
as $$
  select p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$';
$$;

-- ============================================================================
-- 3. Module authoring
-- ============================================================================
create or replace function public.admin_create_module(
  p_course_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_position integer
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_module_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Title is required';
  end if;
  if p_slug is null or not public.is_valid_slug(p_slug) then
    raise exception 'Slug must be lowercase letters, numbers, and hyphens only (e.g. "getting-started")';
  end if;
  if p_position is null or p_position < 1 then
    raise exception 'Position must be a positive integer';
  end if;
  if not exists (select 1 from public.courses where id = p_course_id) then
    raise exception 'Course not found';
  end if;

  begin
    insert into public.modules (course_id, slug, title, description, position)
    values (p_course_id, p_slug, p_title, p_description, p_position)
    returning id into v_module_id;
  exception
    when unique_violation then
      raise exception 'A module with that slug or position already exists in this course';
  end;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'module_created', 'module', v_module_id, jsonb_build_object('course_id', p_course_id, 'title', p_title));

  return v_module_id;
end;
$$;

grant execute on function public.admin_create_module(uuid, text, text, text, integer) to authenticated;

create or replace function public.admin_update_module(
  p_module_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_position integer
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Title is required';
  end if;
  if p_slug is null or not public.is_valid_slug(p_slug) then
    raise exception 'Slug must be lowercase letters, numbers, and hyphens only';
  end if;
  if p_position is null or p_position < 1 then
    raise exception 'Position must be a positive integer';
  end if;
  if not exists (select 1 from public.modules where id = p_module_id) then
    raise exception 'Module not found';
  end if;

  begin
    update public.modules
    set title = p_title, slug = p_slug, description = p_description, position = p_position
    where id = p_module_id;
  exception
    when unique_violation then
      raise exception 'A module with that slug or position already exists in this course';
  end;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'module_updated', 'module', p_module_id, jsonb_build_object('title', p_title));
end;
$$;

grant execute on function public.admin_update_module(uuid, text, text, text, integer) to authenticated;

create or replace function public.admin_delete_module(p_module_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_module public.modules;
  v_lesson_count int;
  v_progress_count int;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select * into v_module from public.modules where id = p_module_id;
  if v_module.id is null then
    raise exception 'Module not found';
  end if;

  select count(*) into v_lesson_count from public.lessons where module_id = p_module_id;

  -- See the file header for why this check exists.
  select count(*) into v_progress_count
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  where l.module_id = p_module_id;

  if v_progress_count > 0 then
    raise exception
      'Cannot delete this module: % of its lessons have recorded student progress. Unpublish the lessons instead of deleting the module.',
      v_progress_count;
  end if;

  delete from public.modules where id = p_module_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (
    auth.uid(), 'module_deleted', 'module', p_module_id,
    jsonb_build_object('course_id', v_module.course_id, 'title', v_module.title, 'lessons_deleted', v_lesson_count)
  );
end;
$$;

grant execute on function public.admin_delete_module(uuid) to authenticated;

-- ============================================================================
-- 4. Lesson authoring
-- ============================================================================
create or replace function public.admin_create_lesson(
  p_module_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_content text,
  p_duration_minutes integer,
  p_position integer,
  p_is_published boolean
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_lesson_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Title is required';
  end if;
  if p_slug is null or not public.is_valid_slug(p_slug) then
    raise exception 'Slug must be lowercase letters, numbers, and hyphens only';
  end if;
  if p_position is null or p_position < 1 then
    raise exception 'Position must be a positive integer';
  end if;
  if p_duration_minutes is null or p_duration_minutes < 1 or p_duration_minutes > 300 then
    raise exception 'Duration must be between 1 and 300 minutes';
  end if;
  if not exists (select 1 from public.modules where id = p_module_id) then
    raise exception 'Module not found';
  end if;

  begin
    insert into public.lessons (module_id, slug, title, description, content, duration_minutes, position, is_published)
    values (p_module_id, p_slug, p_title, p_description, p_content, p_duration_minutes, p_position, coalesce(p_is_published, false))
    returning id into v_lesson_id;
  exception
    when unique_violation then
      raise exception 'A lesson with that slug or position already exists in this module';
  end;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'lesson_created', 'lesson', v_lesson_id, jsonb_build_object('module_id', p_module_id, 'title', p_title));

  return v_lesson_id;
end;
$$;

grant execute on function public.admin_create_lesson(uuid, text, text, text, text, integer, integer, boolean) to authenticated;

create or replace function public.admin_update_lesson(
  p_lesson_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_content text,
  p_duration_minutes integer,
  p_position integer,
  p_is_published boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Title is required';
  end if;
  if p_slug is null or not public.is_valid_slug(p_slug) then
    raise exception 'Slug must be lowercase letters, numbers, and hyphens only';
  end if;
  if p_position is null or p_position < 1 then
    raise exception 'Position must be a positive integer';
  end if;
  if p_duration_minutes is null or p_duration_minutes < 1 or p_duration_minutes > 300 then
    raise exception 'Duration must be between 1 and 300 minutes';
  end if;
  if not exists (select 1 from public.lessons where id = p_lesson_id) then
    raise exception 'Lesson not found';
  end if;

  begin
    update public.lessons
    set title = p_title,
        slug = p_slug,
        description = p_description,
        content = p_content,
        duration_minutes = p_duration_minutes,
        position = p_position,
        is_published = coalesce(p_is_published, is_published)
    where id = p_lesson_id;
  exception
    when unique_violation then
      raise exception 'A lesson with that slug or position already exists in this module';
  end;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'lesson_updated', 'lesson', p_lesson_id, jsonb_build_object('title', p_title, 'is_published', p_is_published));
end;
$$;

grant execute on function public.admin_update_lesson(uuid, text, text, text, text, integer, integer, boolean) to authenticated;

create or replace function public.admin_delete_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_course_id uuid;
  v_progress_count int;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select * into v_lesson from public.lessons where id = p_lesson_id;
  if v_lesson.id is null then
    raise exception 'Lesson not found';
  end if;

  select m.course_id into v_course_id from public.modules m where m.id = v_lesson.module_id;

  -- See the file header for why this check exists.
  select count(*) into v_progress_count from public.lesson_progress where lesson_id = p_lesson_id;

  if v_progress_count > 0 then
    raise exception
      'Cannot delete this lesson: % student(s) have recorded progress on it. Unpublish it instead of deleting it.',
      v_progress_count;
  end if;

  delete from public.lessons where id = p_lesson_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (
    auth.uid(), 'lesson_deleted', 'lesson', p_lesson_id,
    jsonb_build_object('module_id', v_lesson.module_id, 'course_id', v_course_id, 'title', v_lesson.title)
  );
end;
$$;

grant execute on function public.admin_delete_lesson(uuid) to authenticated;

-- ============================================================================
-- 5. Safe reordering — atomic, avoids mid-transaction unique-constraint
--    violations on (course_id, position) / (module_id, position)
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
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
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

  -- Phase 1: move every affected row out of the positive-position range so
  -- phase 2 can never collide with the unique (course_id, position)
  -- constraint, regardless of the target order.
  update public.modules set position = -position where course_id = p_course_id;

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
  v_course_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
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

  update public.lessons set position = -position where module_id = p_module_id;

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
