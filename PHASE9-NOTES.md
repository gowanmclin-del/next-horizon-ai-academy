# Phase 9 Notes — Admin Demotion & Course Authoring

## Everything Added
- Safe administrator demotion at `/admin/admins`, with database-enforced last-admin protection.
- A full Course Builder inside `/admin/courses/[id]`: create/edit/delete/reorder for both modules and lessons.
- A dedicated lesson edit route, `/admin/courses/[id]/lessons/[lessonId]`.
- Two RLS gaps closed (admin read access to `modules`/`lessons` — see "Security Decisions").

## Routes Added
- `/admin/courses/[id]/lessons/[lessonId]` — dedicated lesson editor.

## Routes Modified
- `/admin/admins` — added a Demote action per administrator.
- `/admin/courses/[id]` — added the full Course Content / Course Builder section below the existing metadata editor.
- `/admin/activity` — added human-readable labels for all new Phase 9 action types.

## Components Added
`DemoteAdminButton`, `CourseBuilder` (the main authoring interface — contains `ModuleForm`, `ModuleCard`, `LessonForm`, and `LessonRow` as internal components), `EditLessonForm`.

## Database Functions Added
`is_valid_slug`, `admin_demote_user`, `admin_create_module`, `admin_update_module`,
`admin_delete_module`, `admin_create_lesson`, `admin_update_lesson`,
`admin_delete_lesson`, `admin_reorder_modules`, `admin_reorder_lessons` — all
in `supabase/phase9.sql`, all new (no Phase 5–8 function was replaced or
modified). Two RLS policies added: `"modules: admin read all"` and
`"lessons: admin read all"` — see below for why.

## Security Decisions

**A real gap found and closed**: Phase 7 added `"courses: admin read all"`
but never a matching policy for `modules` or `lessons`. Without it, an
admin's ordinary RLS-scoped read of a draft lesson or a lesson inside an
unpublished course would have returned nothing — the Course Builder would
have been unable to display or edit exactly the content most likely to be
mid-edit. Fixed by adding two new read-only policies in `phase9.sql`,
following the identical pattern already established for every other table
(`is_admin(auth.uid())`, `SELECT` only).

**No client write policy was added anywhere.** Every mutation — module/
lesson create, update, delete, reorder, and admin demotion — goes through
a SECURITY DEFINER function. Confirmed by grep: `phase9.sql` contains
exactly two `create policy` statements, both `SELECT`.

**Every new function checks `is_admin(auth.uid())` as its first
substantive line** (9 of the 10 new functions — `is_valid_slug` is a pure
formatting helper with no data access, so it has nothing to authorize).

## Last-Admin Protection Design

`admin_demote_user()` counts admins (`SELECT count(*) FROM profiles WHERE
role = 'admin'`) and rejects the request if that count is `1`, before
making any change. This single check handles both cases the brief asked
for without special-casing: demoting *someone else* when you're the only
admin is rejected (count = 1), and demoting *yourself* when you're the
only admin is rejected the same way (also count = 1) — while demoting
yourself when a second admin exists succeeds (count = 2, dropping to 1
afterward, which is fine). This is enforced entirely in the database
function; the UI's disabled "Last admin — cannot demote" state is a
courtesy, not the actual protection.

## Course-Authoring Architecture

Every mutation follows the same two-layer pattern used throughout this
codebase since Phase 7: `lib/actions/admin.ts` calls `assertAdmin()`
(re-reading `profiles.role` from the caller's own session) before ever
calling a database function, and that function independently checks
`is_admin(auth.uid())` again. Slugs are validated both client-side
(a lightweight `slugify()` helper for the auto-generate-then-editable UX)
and server-side (`is_valid_slug()`, a strict regex — the client-side
version is only for convenience, never trusted). Duplicate slug/position
conflicts are caught via Postgres's own unique-constraint violations,
translated into a specific, readable error rather than a generic failure.

## Module/Lesson Deletion Safety Decision

This was the most important design decision in this phase. Inspecting
`schema.sql` confirmed: `lessons.module_id REFERENCES modules(id) ON
DELETE CASCADE`, and `lesson_progress.lesson_id REFERENCES lessons(id) ON
DELETE CASCADE`. A naive `admin_delete_module()` would therefore silently
destroy every enrolled student's completion history for every lesson in
that module the moment an admin cleaned up a typo in a module title's
neighboring lesson.

**Decision**: both `admin_delete_module()` and `admin_delete_lesson()`
check for any existing `lesson_progress` row (module version: joined
through all lessons in the module) before allowing a hard delete, and
raise a clear exception recommending unpublishing instead if any student
has ever interacted with the content. There is no override, admin or
otherwise — a lesson/module with real student history literally cannot be
deleted through this system, only unpublished (which the existing
`is_published false` / draft mechanism already supports cleanly, and
which does not touch `lesson_progress` at all).

This is stricter than "prefer archival" — it's "require archival when
there's anything to protect, permit deletion freely otherwise" (e.g. a
module created five minutes ago with no lessons yet, or a lesson no
student has opened, deletes normally). Module deletion additionally
requires an explicit two-step UI confirmation regardless of progress
status, since it can cascade to multiple lessons even when none of them
individually have progress.

## `lib/courseData.ts` vs. Database Content Strategy

No migration work was needed here, and I want to be precise about why.
Inspecting `lib/data/courses.ts`'s `getCourseBySlug()` (unchanged since
Phase 6) confirmed it already:
1. Queries Supabase for the course, its modules, and lessons first, whenever Supabase is configured.
2. Falls back to the static `lib/courseData.ts` definition **only** when Supabase isn't configured, or the query itself fails.

So `lib/courseData.ts` has only ever been the offline/unconfigured
dev-preview fallback since Phase 6 — it is not a second source of truth
that a live deployment reads from, and there was nothing to "migrate."
Phase 9's authoring mutations (creating, editing, deleting, reordering
modules and lessons through the new Course Builder) write directly to the
same `modules`/`lessons` tables `getCourseBySlug()` already reads from, so
they take effect for real students immediately once Supabase is
connected — no additional Phase 10 migration step is required for basic
content to flow through correctly. `lib/courseData.ts` itself was left
completely untouched, per the brief.

What Phase 10 (or later) could still meaningfully add on the learner-facing
side: dynamic course *listing* (currently `/courses/ai-101` is a
hardcoded route; adding new courses through the Course Builder doesn't
yet give them a public marketing page), and possibly moving the seed
data's authorship (`supabase/seed.sql`) to be re-creatable through the
Course Builder itself rather than raw SQL. Neither was in scope here.

## Tests Completed
- Full TypeScript check across all 93 `.ts`/`.tsx` files plus `middleware.ts`. Two errors surfaced (`Property 'key' does not exist...` on `<ModuleCard key=... />` and `<LessonRow key=... />`) — these are a known artifact of `@types/react` not being installable offline (React's JSX type declarations are what teach TypeScript that `key` is always valid on any component; without them resolving, TypeScript treats it as an unrecognized prop). `key` is standard, correct React usage in both spots. No other errors survived the same filtering used in every prior phase (which excludes only well-understood missing-package noise).
- Brace/paren balance check across all 93 files — clean.
- Dollar-quote balance check across all eight SQL files — all even.
- Confirmed byte-for-byte, via `diff`, that `schema.sql`, `phase7.sql`, and `phase8.sql` are unchanged from the Phase 8 delivery — no prior migration file was modified.
- Security sweep: confirmed (by checking the actual import graph, not just string search) that neither server-only credential file is reachable from any client component; confirmed exactly two `create policy` statements exist in `phase9.sql`, both read-only; confirmed 9 of 10 new functions check `is_admin()` (the tenth, `is_valid_slug`, is a pure helper with nothing to authorize); confirmed the last-admin count check and both progress-aware deletion guards are present in the SQL text.
- **`npm install` / `npm run build` / `npm run lint` were NOT run** — this sandbox has no network access to the npm registry, reconfirmed immediately before packaging (403 from `registry.npmjs.org`), consistent with every prior phase.

## Anything Requiring Live Supabase Testing
- `admin_demote_user()`'s last-admin count check, and its interaction with the Phase 7 self-escalation trigger during the role-change UPDATE, have never executed against a real database.
- The two-phase atomic reorder functions (`admin_reorder_modules`/`admin_reorder_lessons`) — the negative-position intermediate step avoiding a unique-constraint violation — is standard Postgres technique but genuinely unverified live.
- The progress-aware deletion blocks (`admin_delete_module`/`admin_delete_lesson`) have never been exercised against a lesson with real `lesson_progress` rows.
- The two new `"admin read all"` policies on `modules`/`lessons` have not been confirmed to actually surface draft content to an admin session live.
- Duplicate slug/position error handling (the `unique_violation` catch blocks) is standard plpgsql but unverified live.

## Anything Still Requiring Stripe Testing
Nothing new in this phase touches Stripe — Phase 8's refund flow is
unmodified. Re-verifying it still works (per the brief's regression list)
is covered by the Live Verification Checklist in `README.md`, item 24, but
no new Stripe-specific code was written here.

## Known Limitations
- No admin UI exists to add an entirely new course from scratch (only AI-101 exists; the Course Builder edits an existing course's modules/lessons, and course *creation* itself still requires direct SQL, matching how `admin_update_course` from Phase 8 already only edits, never creates).
- No bulk import/export for course content.
- Reordering is manual (▲/▼ per item), not drag-and-drop, per the brief's explicit preference.

## Recommended Phase 10 Priorities
1. Run the Live Verification Checklist in `README.md` — nothing here has executed against a live database.
2. Admin-facing course *creation* (not just editing) — a small, natural extension of `admin_update_course`.
3. Dynamic course listing on the public marketing site, so a newly authored course doesn't require a hand-written route like `app/courses/ai-101/page.tsx`.
4. Consider whether `supabase/seed.sql`'s role as the only way to bootstrap a new course's initial content should eventually be replaceable by the Course Builder itself.
