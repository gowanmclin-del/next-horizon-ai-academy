-- ============================================================================
-- Next Horizon AI Academy — Phase 17 migration (data-integrity hardening)
-- ============================================================================
-- Run this AFTER schema.sql through phase12.sql, against the same
-- database. Purely additive: adds CHECK constraints to existing columns,
-- no new tables, no new columns, no RLS change, no prior migration file
-- touched.
--
-- This has NOT been executed against a live database in this environment
-- (no network access here — see PHASE17-NOTES.md).
--
-- ----------------------------------------------------------------------------
-- WHY THIS MIGRATION EXISTS
-- ----------------------------------------------------------------------------
-- Reviewing courses/modules/lessons found that price, duration, and
-- position values are validated only inside the admin SECURITY DEFINER
-- functions (admin_create_course, admin_update_course,
-- admin_create_module/lesson, admin_update_module/lesson — see
-- supabase/phase8.sql, phase9.sql, phase10.sql) — never enforced by a
-- database-level CHECK constraint. Since those functions are the only
-- sanctioned write path for these tables (no client INSERT/UPDATE policy
-- exists on courses/modules/lessons — confirmed in every phase since
-- Phase 6), this was not an exploitable gap from the browser. It is,
-- however, a real defense-in-depth gap: a bug in one of those functions,
-- or any future server-side script that writes to these tables directly
-- (bypassing the functions), would have had nothing at the database layer
-- stopping a negative price or a zero-length lesson from being saved.
--
-- These constraints are safe to add against existing data specifically
-- because every row currently in these tables was written through the
-- same functions that already enforce these exact bounds — if adding any
-- constraint below ever fails on a real database, that failure itself is
-- valuable information (it means a row exists outside the bounds the app
-- has always enforced, worth investigating directly rather than silently
-- accommodating).
-- ============================================================================

alter table public.courses
  add constraint courses_price_cents_check check (price_cents is null or price_cents >= 0),
  add constraint courses_sale_price_cents_check check (sale_price_cents is null or sale_price_cents >= 0);

alter table public.modules
  add constraint modules_position_check check (position >= 1);

alter table public.lessons
  add constraint lessons_position_check check (position >= 1),
  add constraint lessons_duration_minutes_check check (duration_minutes >= 1 and duration_minutes <= 300);
