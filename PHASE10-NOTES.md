# Phase 10 Notes — Multi-Course Platform

## Everything Added
- Course creation from the admin dashboard (`/admin/courses/new`), redirecting into the existing Phase 9 Course Builder on success.
- A dynamic public course catalog (`/courses`) that loads published courses from Supabase.
- A dynamic public course marketing page (`/courses/[slug]`), reusable for any course.
- Generic Stripe purchase success/canceled pages (`/courses/[slug]/purchase/...`) so a newly created paid course can be purchased end to end without hand-written routes.
- One new database function, `admin_create_course()`.

## Routes Added
- `/admin/courses/new`
- `/courses/[slug]`
- `/courses/[slug]/purchase/success`
- `/courses/[slug]/purchase/canceled`

## Routes Modified
- `/admin/courses` — added a prominent Create Course button, and Edit/Public View links per course.
- `/courses` — rewritten from a static hardcoded page to a dynamic catalog.
- `/admin/activity` — added human-readable labels for `course_created`, plus an inline "Created course: [Title]" description matching the brief's suggested format.

## Routes Explicitly NOT Modified (and why)
- `/courses/ai-101`, `/courses/ai-101/learn/[lessonSlug]`, `/courses/ai-101/assessment`, `/courses/ai-101/purchase/success`, `/courses/ai-101/purchase/canceled` — all untouched, still their own hardcoded files. See "AI-101 Compatibility Decisions" below.

## Components Added
`CreateCourseForm`, `DynamicCoursePageClient` (the client-rendered body of the new `/courses/[slug]` page).

## Database Functions Added
`admin_create_course(title, slug, short_description, description, price_cents, status, certification_name)` — `supabase/phase10.sql`. Reuses `is_valid_slug()` from `phase9.sql` rather than redefining it.

## Database Policies Added or Changed
**None.** Zero new RLS policies were needed — confirmed by grep, `phase10.sql`
contains no `create policy` statement at all. `"courses: public read
published"` (schema.sql, Phase 4) already scoped visibility to `status =
'published'` for *any* course, not specifically AI-101; a newly created
draft course is invisible to the public the exact same way any other
draft course already was. `"courses: admin read all"` (Phase 7) already
covers admin visibility into new courses regardless of status.

## Security Decisions
- **Schema field discipline**: the brief listed several optional fields (featured status, level, duration, thumbnail) "if the current schema already provides an appropriate structure." None of these columns exist on `courses`. Per the brief's own instruction not to invent unnecessary fields, none were added — `admin_create_course()` only writes columns that already existed before this phase (`title`, `slug`, `short_description`, `description`, `status`, `price_cents`, `currency`, `is_paid`, `certification_name`). `is_paid` is derived automatically (`price_cents > 0`), not admin-supplied, avoiding a state where the two could disagree.
- **Duplicate slugs**: caught via Postgres's own unique constraint on `courses.slug` (already existed) and translated to a specific, human-readable error inside `admin_create_course()`'s exception handler, rather than a generic failure.
- **Two-layer authorization preserved**: `createCourse()` (`lib/actions/admin.ts`) calls the existing `assertAdmin()` before ever calling the RPC; `admin_create_course()` independently checks `is_admin(auth.uid())` again — identical to every function added in Phases 7–9.
- **Draft-course leak prevention, verified two ways**: the public catalog (`getPublishedCourses()`) filters `status = 'published'` in its own query; the dynamic route's server-side existence check (in `app/courses/[slug]/page.tsx`) does the same filter *again* independently before calling `notFound()`. Even if one of these filters were ever removed by accident, the other — plus the underlying RLS policy itself — would still prevent a draft course from being publicly visible.

## Dynamic Course Architecture
`getCourseBySlug()` (Phase 6, unchanged) was already fully generic — not
AI-101-specific — and already the live source of truth whenever Supabase
is configured, falling back to the static `lib/courseData.ts` fixture
only when it isn't. Phase 10 adds two new functions rather than modifying
that one:
- `getPublishedCourses()` — for the catalog; returns `[]` (not the AI-101 fixture) when unconfigured, since there's no meaningful "catalog" to show offline beyond the AI-101 page's own dedicated fallback.
- `getPublishedCourseBySlug()` — a **strict** version for the new dynamic route: returns `null` for a genuinely missing/unpublished slug instead of falling back to the AI-101 fixture. This distinction matters — `getCourseBySlug()`'s fallback behavior exists specifically so the *AI-101* pages never break, and reusing it as-is for an arbitrary slug would have caused a nonexistent course to incorrectly render AI-101's content instead of 404ing.

## AI-101 Compatibility Decisions
**No routing conflict, by construction, not by careful ordering.** Next.js
App Router always resolves an exact static segment match ahead of a
sibling dynamic segment — `app/courses/ai-101/` (static) and
`app/courses/[slug]/` (dynamic) coexist at the same directory level with
zero special-casing required; `/courses/ai-101` always resolves to the
static folder, `/courses/anything-else` always resolves to `[slug]`. The
same reasoning applies one level deeper for the purchase routes. This was
verified by reading Next.js's documented route-resolution precedence
rules, not by executing the dev server (see Tests Performed).

**Nothing under `app/courses/ai-101/` was edited in this phase** — not the
marketing page, not `/learn`, not `/assessment`, not the existing purchase
pages. AI-101 continues to work exactly as it did at the end of Phase 9.

## Stripe / Multi-Course Limitations
`createCheckoutSession()` was already parameterized by course slug before
this phase — no changes were needed there. The only real gap was that
only AI-101 had `/purchase/success` and `/purchase/canceled` pages for
Stripe to redirect back to; Phase 10 closes that gap with generic
versions. **A newly created paid course can therefore already be
purchased end to end**, with no further checkout work required.

**What remains AI-101-specific, deferred to Phase 11 per the brief's
explicit guidance to avoid unnecessary regression risk**: the actual
learning delivery routes. `/courses/ai-101/learn/[lessonSlug]` and
`/courses/ai-101/assessment` are not yet generalized to
`/courses/[slug]/learn/...` / `/courses/[slug]/assessment`. A new course
authored through the Course Builder and purchased through the new dynamic
checkout flow does not yet have anywhere for the student to actually take
the lessons or the assessment. This is the single most important
Phase 11 priority — see below.

## Tests Performed
- Full TypeScript check across all 99 `.ts`/`.tsx` files plus `middleware.ts` — the only two errors present are the same known `key`-prop artifacts already documented in `PHASE9-NOTES.md` (missing `@types/react` offline resolution), confirmed identical count (2) before and after this phase's changes — no new TypeScript issues introduced.
- Brace/paren balance check across all 99 files — clean.
- Dollar-quote balance check across all nine SQL files — all even.
- **Byte-for-byte `diff` confirmation** that all eight prior migration files (`schema.sql` through `phase9.sql`) are unchanged from the Phase 9 delivery.
- Security sweep: confirmed zero new RLS policies; confirmed `admin_create_course()` checks `is_admin()`; confirmed neither server-only credential file (`lib/supabase/admin.ts`, `lib/stripe/server.ts`) is imported by any client component (only by the existing three server-only files, unchanged from Phase 8/9); confirmed the published/draft filter is applied independently in two places for the dynamic route.
- **`npm install` / `npm run build` / `npm run lint` were NOT run.** This sandbox has no network access to the npm registry, reconfirmed immediately before packaging (403 from `registry.npmjs.org`), consistent with every prior phase.

## Anything Requiring Live Supabase Testing
- `admin_create_course()` has never executed against a real database — the unique-constraint-violation catch block, in particular, is standard plpgsql but genuinely unverified live.
- The Next.js route-precedence claim (static `ai-101` folder always wins over dynamic `[slug]` sibling) is based on documented, stable Next.js behavior, not on actually running `npm run dev` and requesting both URLs.
- The full "create → build → publish → appears on /courses → visitor opens dynamic page" workflow described as the Phase 10 success standard has not been walked through live.
- The server-side existence check in `app/courses/[slug]/page.tsx` (a Server Component query via `lib/supabase/server.ts`) has not been confirmed to correctly trigger Next.js's `notFound()` behavior live.

## Anything Requiring Live Stripe Testing
- No real Stripe Checkout Session has been created for a non-AI-101 course.
- The generic `/courses/[slug]/purchase/success` page's status-polling behavior is identical code to the already-shipped AI-101 version, but has not itself been exercised with a real webhook-confirmed payment for a different course.

## Known Limitations
- New courses can be created and purchased, but **cannot yet be learned or assessed** through a generic route — see "Stripe / Multi-Course Limitations" above. This is the headline limitation of this phase.
- No level/duration/thumbnail/featured metadata — deliberately not added, per the brief's own instruction not to invent fields the schema doesn't already support.
- No admin UI to *un*-create (delete) a course, only create and edit metadata (Phase 8) / author content (Phase 9).

## Recommended Phase 11 Priorities
1. **Generalize the learner-facing routes** — `/courses/[slug]/learn/[lessonSlug]` and `/courses/[slug]/assessment` — so a newly created and purchased course actually has somewhere for a student to learn. This is the natural, necessary next step to make the Phase 10 workflow complete end to end, and was the piece most deliberately deferred here.
2. Once the learn/assessment routes are generalized, revisit whether `app/courses/ai-101/...` should be migrated onto the generic routes too (retiring the hardcoded version) or intentionally kept as a permanent special case.
3. Admin course deletion/archival workflow (courses can be set to `'archived'` status already, but there's no dedicated UI action for it yet beyond the generic status dropdown in `EditCourseForm`).
