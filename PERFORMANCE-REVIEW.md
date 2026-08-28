# Phase 17 Performance Review

## Method
Code-level review only — no real `npm run build`, Lighthouse run, or
query-plan analysis was possible in this environment (see
`PHASE17-NOTES.md` for why). Findings below are either a specific,
applied fix (a real sequential-fetch pattern found by reading the actual
code) or a documented characteristic with a clear reason it wasn't
changed in this pass.

## 1. N+1 / Sequential Query Patterns — Found and Fixed

### `getMyEnrolledCourses()` (`lib/data/progress.ts`)
**Before**: a `for...of` loop `await`-ed `getCourseBySlug()` once per
enrolled course, one at a time. Each `getCourseBySlug()` call itself does
multiple Supabase round trips (see next item) — so a student enrolled in
N courses waited roughly N times as long as a student enrolled in one,
purely from network round-trip serialization, not from any actual data
dependency between courses.

**Fixed**: replaced with `Promise.all()` over the same course list — every
enrolled course's data now fetches concurrently. Same per-course logic,
same filtering (skips anything that fell back to static content),
identical result shape — purely a parallelization change.

**Where this matters**: this function feeds the main student dashboard,
the "My Courses" page, and the certificates page — the three pages most
likely to be visited by every returning student, every session.

### `getCourseBySlug()` (`lib/data/courses.ts`)
**Before**: after fetching the course row, `moduleRows` (modules +
nested lessons) and `assessmentRow` were fetched in two sequential
`await` calls — but neither depends on the other, only on the already-
fetched `courseRow.id`.

**Fixed**: both now run inside a single `Promise.all()`. Since this
function is called once per enrolled course by the fix above, this
savings compounds: a student enrolled in 3 courses previously made up to
9 sequential round trips (3 courses × 3 queries each, serialized both
across and within courses) and now makes at most 3 round-trip *rounds*
(one per course, each round itself now parallel internally, and all three
course rounds now also parallel with each other).

### `EnrolledCourseSummaryCard` (`components/dashboard/EnrolledCourseSummaryCard.tsx`)
**Before**: `getCompletedLessonSlugs(course)` and `getMyCertificate(course.id)`
were awaited one after the other, despite neither depending on the
other's result.

**Fixed**: both now run inside `Promise.all()`. The subsequent
conditional `hasPassedAssessment()` call was deliberately left as a
sequential, conditional `await` — it only runs when `pct === 100`, and
parallelizing it with the two calls above would mean *always* fetching
assessment-attempt data even for the common case of a student who hasn't
finished the course yet, which is strictly more database load for the
typical case in exchange for a marginal latency win in the uncommon case.
This was a deliberate trade-off, not an oversight.

### `CertificateCard` (`components/dashboard/CertificateCard.tsx`)
**Reviewed, not changed.** This component's sequential structure
(`getMyCertificate()` first, then *only if no certificate exists* fetch
progress) is a deliberate short-circuit, not an N+1 pattern — if a
certificate is already issued, there's no reason to also fetch lesson
progress at all. Changing this to run both in parallel would mean
fetching progress data unnecessarily on every view for a student who's
already completed the course, which is worse, not better.

## 2. Database Indexes

Reviewed every table's query patterns against its indexes. **No missing
index was found** — Phase 12 already added indexes for the columns
actually filtered on in admin queries (`enrollments.course_id`,
`enrollments.user_id`, `enrollments.status`,
`assessment_attempts.user_id`, `assessment_attempts.assessment_id`,
`certificates.course_id`), and several other frequently-queried columns
are already covered by `unique` constraints, which Postgres backs with an
index automatically: `courses.slug`, `orders.stripe_checkout_session_id`,
`orders.stripe_payment_intent_id`, `lesson_progress(user_id, lesson_id)`,
`certificates(user_id, course_id)`. No new index was added in this
phase's migration — only CHECK constraints (see
`DATA-INTEGRITY-REVIEW.md`), which are unrelated to query performance.

## 3. Image Optimization

Confirmed (via grep, re-checked from Phase 14's equivalent finding) that
**no raw `<img>` tag exists anywhere in the codebase** — the entire
visual design is Tailwind/CSS-based (gradients, borders, spacing), and
the one placeholder that would eventually hold a real photo (the founder
section) already has documented instructions to use `next/image` when a
real photo is added (`components/FounderSection.tsx`, added in this same
phase — see `PHASE17-NOTES.md`). No image-optimization work was needed
because there are currently no images to optimize.

## 4. Bundle Size

**Not assessed.** A real bundle-size analysis requires an actual
`next build` (which produces the `.next/` output and its build
statistics) — this sandbox cannot run that (see `PHASE17-NOTES.md`).
Dependencies were reviewed for obvious bloat: `stripe`, `resend`, and the
two `@supabase/*` packages are all necessary, actively-used, server-only
or minimally-client-side dependencies — nothing was found that looks like
dead weight, but this is a code-review-level judgment, not a measured one.

## 5. Client-Side Data-Fetching Architecture (documented, not changed)

Most authenticated pages (dashboard, learn, assessment, most of `/admin`)
are Client Components that fetch their own data via `useEffect` after
mount, rather than Server Components fetching data before the page is
sent to the browser. This is a real, legitimate performance
characteristic — it means an extra round trip (JS bundle loads, then
data-fetching starts) compared to a fully server-rendered page — but
converting this architecture to Server Components throughout would be a
large-scale rewrite touching dozens of files across every phase of this
project, exactly the kind of "unproven, high-risk, large rewrite" the
Phase 17 brief explicitly asks this pass to avoid. **Logged as a known
architectural characteristic and a reasonable candidate for a dedicated
future phase, not addressed here.**

## Summary

Two real, low-risk fixes applied (parallelizing three independent
sequential-fetch patterns across two files). No missing index found. No
image-optimization work needed. Bundle size and the broader client-fetch
architecture question are honestly documented as unassessed / out of
scope for this pass, respectively, rather than glossed over.
