# Phase 11 Notes — Generic Learner Delivery

## Everything Added
- Dynamic lesson delivery for any course: `/courses/[slug]/learn`, `/courses/[slug]/learn/[lessonSlug]`.
- Dynamic assessments for any course: `/courses/[slug]/assessment`.
- A generalized student dashboard: every enrolled course now appears, not just AI-101.
- `hasCourseAccess()`, a shared helper making "revoked enrollments don't grant access" an actual enforced rule instead of an assumption.
- One security fix to a Phase 4 function (`submit_assessment_attempt`), via `CREATE OR REPLACE`.

## Routes Added
- `/courses/[slug]/learn`
- `/courses/[slug]/learn/[lessonSlug]`
- `/courses/[slug]/assessment`

## Routes Modified
- `/courses/ai-101/learn/[lessonSlug]` — enrollment check now uses `hasCourseAccess()` instead of a bare `Boolean(enrollment)`, so a revoked enrollment correctly loses access (previously it didn't).
- `/courses/ai-101/assessment` — **gained an enrollment gate that didn't exist before at all.** Previously any signed-in student could reach and attempt this page regardless of enrollment (though see the SQL fix below — the score itself couldn't be forged even before this UI fix, since scoring already happened server-side; what was missing was the *access* gate and, separately, the *authorization* check inside the scoring function itself).
- `/dashboard`, `/dashboard/courses`, `/dashboard/certificates` — fully rewritten around every enrolled course, not a hardcoded single course.

## Components Added
`EnrolledCourseSummaryCard`, `CertificateCard` — self-contained, per-course dashboard cards, each fetching its own progress/certificate data so the parent pages just map over a course list.

## Database Functions Added / Changed
`submit_assessment_attempt()` — replaced via `CREATE OR REPLACE` in
`supabase/phase11.sql` (originally defined in `schema.sql`, Phase 4). This
is the only SQL change in this phase: no new table, no new column, no new
RLS policy.

## Security Decisions

**The most important finding in this phase**: `submit_assessment_attempt()`
checked that the caller was authenticated and that the assessment existed
and was published — but never checked that the caller was actually
enrolled in the assessment's course. This was already true in the
single-course version of the app (AI-101 only), but Phase 11's brief
explicitly calls out "prevent students from taking assessments for courses
they don't own" as a requirement, and inspecting the actual function
confirmed this wasn't yet enforced anywhere, client or server. Fixed by
adding an enrollment check (`status <> 'revoked'`) as the very next thing
the function does after confirming the assessment exists, before any
scoring logic runs.

**Also found**: the `Enrollment` TypeScript type still only listed the
four original status values from Phase 4, even though Phase 9's migration
widened the actual database constraint to also allow `'revoked'` and
`'refunded'`. This meant `getEnrollment()`'s callers were doing
`Boolean(enrollment)` checks that treated a revoked enrollment exactly the
same as an active one — a real access-control bug, now fixed via the new
`hasCourseAccess()` helper, applied consistently across both the new
generic routes and the pre-existing AI-101 routes.

**Two hardcoded-AI-101 bugs found via a full-codebase grep for the string
`"ai-101"`** (not directly requested, but a natural consequence of
verifying nothing else was silently AI-101-specific): `updateCourse()`'s
Next.js cache revalidation always targeted `/courses/ai-101` regardless of
which course was actually edited by an admin; the enrollment-confirmation
and course-completion transactional emails always linked to
`/courses/ai-101/learn` and `/courses/ai-101/assessment` regardless of the
course the email was actually about. Both fixed — the first by threading
`courseSlug` through `updateCourse`/`EditCourseForm`, the second by adding
a small `getCourseSlug()` lookup helper in `lib/actions/email.ts` used at
all three email-template call sites.

## Course-Completion Architecture

`issue_certificate_if_eligible()` (Phase 6, unchanged) already computed
completion generically — it counts published lessons for the *specific
course id it's given* and checks lesson_progress against that count, never
against any AI-101-specific assumption. The certificate-eligibility logic
never needed to change in this phase; only the *dashboard's* awareness of
which courses to even ask that question about needed fixing.

## `lib/courseData.ts` vs. Database (unchanged from Phase 9/10)

No change to this relationship in Phase 11. The static fixture remains
the offline/unconfigured fallback only; every generic route added here
uses `getPublishedCourseBySlug()` (Phase 10, strict — returns `null`
rather than falling back to the AI-101 fixture for an unrelated slug),
consistent with the precedent already established for the marketing page.

## Tests Performed
- Full TypeScript check across all 104 `.ts`/`.tsx` files plus `middleware.ts`. One genuine type error was found and fixed (the stale `Enrollment.status` union, described above) — after that fix, only the same category of pre-existing `key`-prop artifact remains (now 5 instances of the identical missing-`@types/react` cause already documented in `PHASE9-NOTES.md`/`PHASE10-NOTES.md`; confirmed each is a standard, correct `key={...}` usage).
- Brace/paren balance check across all 104 files — clean.
- Dollar-quote balance check across all ten SQL files — all even.
- **Byte-for-byte `diff` confirmation** that all nine prior migration files (`schema.sql` through `phase10.sql`) are unchanged from the Phase 10 delivery.
- Security sweep: confirmed zero new RLS policies in `phase11.sql`; confirmed the new enrollment check is present in the replaced function; confirmed neither server-only credential file is reachable from any client component; confirmed every client-side query scoped to "the current user's own data" actually filters by `user_id = auth.uid()` (the admin-viewing-a-student's-data queries in `lib/data/admin.ts` are the sole, correct exception, gated by admin-only RLS); confirmed `hasCourseAccess()` is applied at all four learn/assessment access points.
- A full-codebase grep for `"ai-101"` outside its own dedicated route folder, to catch any other latent hardcoding — found and fixed the two bugs described above; the remaining matches (the homepage's Featured Course section, the `/courses` empty-state link, the `/start-learning` page, and the static-fallback import/comment in `lib/data/courses.ts`) are all intentional AI-101-specific marketing content or the documented fallback mechanism, not bugs.
- **`npm install` / `npm run build` / `npm run lint` were NOT run.** This sandbox has no network access to the npm registry, reconfirmed immediately before packaging (403 from `registry.npmjs.org`), consistent with every prior phase.

## Anything Requiring Live Supabase Testing
- The new `submit_assessment_attempt()` enrollment check has never executed against a live database — the `status <> 'revoked'` comparison and its interaction with the existing scoring logic are standard plpgsql but genuinely unverified live.
- The full success-test workflow described in the brief — create → build → publish → purchase → dashboard → lessons → progress → assessment unlock → pass → complete → certificate — has not been walked through end to end live for a *second* course (only AI-101 has ever been exercised, in earlier phases, and even that was never live-tested in this sandbox).
- `getMyEnrolledCourses()`'s multi-enrollment loop (fetching full course data per enrollment) is unverified against an account with more than one enrollment.
- The revoked-enrollment fix (`hasCourseAccess()`) has not been observed to actually block a revoked student from reaching lesson/assessment content live.

## Anything Still Requiring Stripe Testing
Nothing new in this phase touches Stripe directly — Phase 10 already
verified checkout is slug-generic, and Phase 8's refund flow is
unmodified. The dashboard change means a student's *dashboard* now
reflects enrollments from any course's purchase, which is a downstream
consequence worth re-checking live but isn't new Stripe-facing code.

## Known Limitations
- No UI change was made to explicitly celebrate "course completed" beyond what already existed (the completion email, and the dashboard's status label) — a more prominent in-app completion moment could be a nice future addition but wasn't required here.
- `getMyEnrolledCourses()` does one full `getCourseBySlug()` fetch per enrolled course sequentially — fine for a student enrolled in a handful of courses, but not optimized for a hypothetical student enrolled in dozens.
- The dashboard's top-level stat cards were simplified to just "Courses Enrolled" (see the Phase 10→11 rewrite) rather than aggregating percent-complete/lessons-completed across all courses — each course's own card shows that detail instead, to avoid duplicating the per-course progress-fetch logic at the page level.

## Recommended Phase 12 Priorities
1. Live-verify this phase's two security fixes specifically — the assessment-ownership check and the revoked-enrollment access block — since they're the highest-stakes changes here.
2. Walk the full success-test workflow end to end with a genuinely second course (not AI-101) once connected to live Supabase/Stripe.
3. Consider a lightweight admin view of "which students are enrolled in which courses and their real-time progress" now that the underlying data model fully supports multiple courses (partially covered already by `/admin/students/[id]`, but a cross-course view doesn't yet exist).
4. Revisit whether `app/courses/ai-101/...`'s hardcoded routes should eventually be retired in favor of the generic ones now that both exist and behave identically, or kept permanently as documented in Phase 10.
