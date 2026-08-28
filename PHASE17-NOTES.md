# Phase 17 Notes — Full Production Hardening Audit

## Scope
An audit phase, not a feature phase, per the brief. Real code inspection
across security, performance, accessibility, and data integrity — fixes
applied only where a genuine, low-risk, narrowly-scoped issue was found.
No stylistic churn, no unproven rewrites, no speculative "fixes" for
things that were already correct.

## Documents Produced This Phase
- `SECURITY-AUDIT-REPORT.md` — all 7 required areas covered; one real gap (rate limiting) found, assessed, and deliberately deferred with a specific recommendation rather than fixed blind.
- `PERFORMANCE-REVIEW.md` — three real sequential-fetch patterns found and fixed; indexes, images, and bundle size reviewed and found not to need changes (or honestly flagged as unassessable in this environment).
- `ACCESSIBILITY-REVIEW.md` — one real keyboard-accessibility defect found and fixed (the refund confirmation modal); everything else reviewed and confirmed already correct or honestly flagged as unverified.
- `DATA-INTEGRITY-REVIEW.md` — one real gap (missing CHECK constraints on five numeric columns) found and fixed via `supabase/phase17.sql`; everything else confirmed already handled correctly by prior phases.
- `PHASE17-NOTES.md` (this file).

## Every Code Change This Phase, In One Place

**Performance** (`PERFORMANCE-REVIEW.md` has full detail):
- `lib/data/progress.ts` — `getMyEnrolledCourses()` now fetches all enrolled courses concurrently (`Promise.all`) instead of one at a time in a `for` loop.
- `lib/data/courses.ts` — `getCourseBySlug()` now fetches modules/lessons and the course assessment concurrently instead of sequentially.
- `components/dashboard/EnrolledCourseSummaryCard.tsx` — two independent data fetches now run concurrently instead of sequentially.

**Accessibility** (`ACCESSIBILITY-REVIEW.md` has full detail):
- `components/admin/RefundOrderButton.tsx` — added dialog semantics (`role="dialog"`, `aria-modal`, `aria-labelledby`), Escape-to-close, a focus trap, and focus management on open/close.

**Data integrity** (`DATA-INTEGRITY-REVIEW.md` has full detail):
- `supabase/phase17.sql` — new migration adding CHECK constraints to `courses.price_cents`, `courses.sale_price_cents`, `modules.position`, `lessons.position`, `lessons.duration_minutes`. Purely additive; no prior migration file touched (confirmed by diff).

**Security**: no code change — the one real finding (no rate limiting) was assessed and documented rather than fixed, since a proper fix requires an infrastructure decision (see `SECURITY-AUDIT-REPORT.md` section 6) that's out of scope to make unilaterally in an audit pass.

## What Was Reviewed and Found Already Correct (No Change Made)
- RLS enabled on every table, no overly-permissive policy — re-verified with a cross-reference script, not just re-asserted.
- No secret value reachable from client code — re-verified via import-graph inspection.
- CSRF protection — inherent to this project's exclusive use of Server Actions for mutations; the one Route Handler (the Stripe webhook) is correctly protected by HMAC signature verification instead, which is the appropriate mechanism for a server-to-server webhook.
- Admin audit logging — confirmed still insert-only, no delete/edit path for any role.
- Duplicate certificate issuance, concurrent-enrollment races — both already prevented by unique constraints and idempotent SECURITY DEFINER functions from Phase 6.
- Deletion safety — Phase 9's progress-aware module/lesson deletion guards confirmed unchanged and correct; noted that no course-deletion function exists at all, so this isn't a currently-exploitable gap.
- Focus-visible styling, ARIA on every collapsible nav toggle, image alt text — all confirmed correct by direct inspection (not assumed).

## Database Migration Summary
One new file, `supabase/phase17.sql` — five `ADD CONSTRAINT ... CHECK`
statements across three tables. No new table, no new column, no RLS
change, no prior migration file modified (confirmed via `diff` against
the Phase 16 delivery — all twelve prior SQL files are byte-for-byte
identical).

## Verification Performed
- Full TypeScript check (the same global-`tsc` substitute used since Phase 15, for the same reason: `npm install` fails in this sandbox — see below) across all files touched this phase plus the full existing codebase — zero new errors; only the same 5 pre-existing `key`-prop artifacts documented since Phase 9.
- Brace/paren balance check — clean.
- `diff` confirmation that all twelve prior SQL files are unchanged.
- A cross-reference script confirming every table has RLS enabled.
- An import-graph check confirming no server-only credential file is reachable from client code.
- A script confirming every `outline-none` usage has a compensating focus style.
- A search confirming the refund modal was the only `fixed inset-0` overlay in the codebase (so the accessibility fix is complete, not partial).

## What Could Not Be Verified Live
Everything that requires a real npm install, a real build, a real
browser, or a real database connection — unchanged limitation from every
prior phase of this project. Specifically for this phase: the two
performance fixes have not been measured (no real network/database to
time); the accessibility fix has not been tested with a real screen
reader or keyboard-only user; the new CHECK constraints have never
executed against a live database (though see `DATA-INTEGRITY-REVIEW.md`
for why they should apply cleanly); color contrast was reviewed visually,
not measured with a real contrast-ratio tool.

## `npm install` / Build Status
Re-attempted immediately before finishing this phase — still fails with
the same `403 Forbidden` from `registry.npmjs.org` documented in every
prior phase. No real `npm run build`, `npm run lint`, or `npm audit` has
ever succeeded in this project. This remains the single most important
outstanding verification gap, unchanged from Phase 16's handoff.

## Recommended Phase 18 Priorities
1. The standing recommendation from every recent phase: a real `npm install && npm run build` on a machine with internet access, followed by the live verification checklist.
2. Add real rate limiting at the infrastructure layer for checkout creation, search actions, and the two anonymous-accessible marketing-form Server Actions (see `SECURITY-AUDIT-REPORT.md` section 6 for the specific recommendation).
3. A measured color-contrast pass and a real screen-reader pass over the admin area, now that the one custom modal is keyboard-accessible.
4. If a course-deletion feature is ever added, apply the same progress-aware safety pattern Phase 9 established for modules/lessons — do not add a bare `DELETE`.
