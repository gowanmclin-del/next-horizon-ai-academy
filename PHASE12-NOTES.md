# Phase 12 Notes — Launch Verification & Academy Operations

## 1. Summary of Files Added
- `supabase/phase12.sql` — the migration (one RLS policy, six indexes).
- `supabase/optional-second-course-fixture.sql` — optional, disposable second-course fixture for manual validation (not part of the required chain, creates no fake student data).
- `app/admin/launch-readiness/page.tsx`.
- `PHASE12-NOTES.md` (this file).

## 2. Summary of Files Modified
- `lib/data/admin.ts` — `getStudentDetail` gained an `assessments` array and per-enrollment `certificateIssuedAt`; `getStudents`/`getEnrollments` gained course/status filters; `getAdminCourseDetail` gained `activeCount`/`completionRate`/`assessmentPassRate`/`certificatesIssued`; `getAdminStats` gained `publishedCourses`/`draftCourses`; new `getLaunchReadiness()` function.
- `app/admin/students/page.tsx`, `app/admin/enrollments/page.tsx` — course/status filter dropdowns.
- `app/admin/students/[id]/page.tsx` — fully reorganized into the five required sections (Student, Enrollments, Progress, Assessments, Certificates), plus the pre-existing Orders section retained.
- `app/admin/courses/[id]/page.tsx` — operational stats block + "View students in this course" link.
- `app/admin/page.tsx` — new dashboard cards (published/draft course counts).
- `components/admin/AdminNav.tsx` — added the Launch Readiness link.
- `README.md`, `docs/database-schema.md` — Phase 12 sections appended.

## 3. Database Migrations Added
`supabase/phase12.sql`:
- **One new RLS policy**: `"assessment_attempts: admin read all"` — see "Security Checks Performed" below for why this was necessary, not optional.
- **Six new indexes**: `enrollments(course_id)`, `enrollments(user_id)`, `enrollments(status)`, `assessment_attempts(user_id)`, `assessment_attempts(assessment_id)`, `certificates(course_id)`. None of these existed before this phase (the only prior enrollments/certificates index was the composite unique constraint on `(user_id, course_id)`, which Postgres can't use efficiently for a single-column filter on `course_id` alone) — needed by the new admin filter and per-course-stats queries.

No table was added, no column was added, no existing policy was modified or dropped, and no prior migration file was edited — confirmed by byte-for-byte `diff` against the Phase 11 delivery (see "Tests Completed").

`supabase/optional-second-course-fixture.sql` is documented separately in the README's "Second-Course Validation Procedure" — it is not part of the numbered migration chain and is not required for the application to function.

## 4. Admin Functionality Added
- Course and enrollment-status filtering on the Students and Enrollments admin pages.
- A reorganized, more complete student detail view with real assessment history (previously entirely inaccessible to any admin — see below).
- Per-course operational metrics: active/completed enrollment counts, completion rate, assessment pass rate, certificates issued, and a direct link to that course's filtered student list.
- Dashboard cards for published/draft course counts.
- A new Launch Readiness page covering all ten configuration areas the brief lists, using only safe status labels.

## 5. Security Checks Performed
- **The most significant finding in this phase**: no RLS policy in any prior phase (4 through 11) ever granted admins read access to `assessment_attempts`. Confirmed by grep before writing any code. This meant the admin student-detail view could not show assessment scores at all — not a UI oversight, a genuine RLS gap blocking a Phase 12 requirement. Fixed with one new read-only policy, identical in shape and risk profile to the six other admin-read policies already in place since Phase 7/9.
- Confirmed via `diff` that all 10 prior migration files (`schema.sql` through `phase11.sql`) are byte-for-byte unchanged.
- Confirmed `phase12.sql` contains exactly one `create policy` statement, and it is `SELECT`-only (grepped for `drop policy` and `using (true)` — both absent).
- Confirmed neither `lib/supabase/admin.ts` nor `lib/stripe/server.ts` is imported by any client component — only by the same three server-only files as every prior phase.
- Confirmed the Launch Readiness page never interpolates a secret's actual value into a displayed string — every Stripe/Supabase-service-role/Resend check uses `Boolean(...)` only. `NEXT_PUBLIC_SITE_URL` is the one value shown directly, which is correct: it's a public setting by its own `NEXT_PUBLIC_` naming, not a secret.
- Re-verified (by code review, not live execution) that Phase 11's two access-control fixes — the assessment-ownership check in `submit_assessment_attempt()` and `hasCourseAccess()`'s revoked-enrollment exclusion — are untouched by this phase's changes.

## 6. Second-Course Validation Results
**No live validation was performed** — this sandbox has no Supabase or
Stripe connection (see "Anything That Could Not Be Tested"). What Phase 12
delivers instead, per the brief's explicit allowance for "a clearly
documented validation procedure": `supabase/optional-second-course-fixture.sql`
(a real, disposable course with real content, zero fake student data) and
a 15-point manual procedure in the README mapped directly to the brief's
15 validation requirements. This procedure has not been executed.

## 7. Legacy Routes Retained/Redirected/Removed
**All AI-101-specific routes were retained; none were redirected or
removed.** Full reasoning and the per-route table are in the README's
"Legacy Route Review" section. Summary: every AI-101 route contains real,
still-in-use behavior (a live marketing page, real learner routes, real
Stripe redirect targets already referenced by in-flight checkout
sessions) — none of it is dead code, so there was nothing safe to
consolidate or remove without risking a real regression for zero
benefit. Next.js's routing precedence already guarantees the static
AI-101 routes and the generic `[slug]` routes never conflict, so no
compatibility shim was needed either.

## 8. Launch-Readiness Findings
Not applicable in this sandbox — `getLaunchReadiness()` requires a live
Supabase connection to report anything beyond "Supabase Configuration:
Needs Attention" (since `isSupabaseConfigured()` is false with no
`.env.local` present here). This is expected and correctly reflects the
current environment; live findings will only be meaningful once the
project is actually deployed with real environment variables.

## 9. Commands Successfully Executed
Only static analysis — see "Tests Completed" below.
`npm install` / `npm run build` / `npm run lint` / `npm run typecheck`
were **not** run. This sandbox has no network access to the npm
registry, reconfirmed immediately before packaging (403 from
`registry.npmjs.org`), consistent with every prior phase. `package.json`
does not currently define a `typecheck` script — noted here rather than
silently assumed; `tsc --noEmit` (this phase's actual static verification
tool) was run directly instead.

## 10. Tests Completed
- Full TypeScript check across all 105 `.ts`/`.tsx` files plus `middleware.ts`. One genuine type error was found and fixed (a Supabase query result resolving to `unknown[]` in `getStudents`'s new filter logic, under this sandbox's offline type-resolution environment) — after the fix, only the same 5 pre-existing `key`-prop artifacts already documented in Phases 9–11 remain (confirmed identical count before/after, and each confirmed to be standard, correct React usage).
- Brace/paren balance check across all 105 files — clean.
- Dollar-quote balance check across all twelve SQL files (ten numbered migrations plus the seed and the optional fixture) — all even.
- Byte-for-byte `diff` confirmation that all ten prior migration files are unchanged from the Phase 11 delivery.
- Security sweep as detailed in section 5 above.

## 11. Anything That Could Not Be Tested
- The new `"assessment_attempts: admin read all"` policy has never executed against a live database.
- The six new indexes have not been confirmed to actually improve query performance (or even build successfully) live — index creation syntax is standard and low-risk, but genuinely unverified.
- `getLaunchReadiness()`'s live Supabase probes (the table-existence checks, admin count, published-course count, certificate-configuration completeness check) have never run against real data.
- The full second-course validation procedure (all 15 points) has not been executed.
- The End-to-End Acceptance Test checklist, including the failed-payment, duplicate-checkout, and revoked-enrollment scenarios, has not been executed.
- Mobile layout for the new filter dropdowns and the Launch Readiness page has been built using the same responsive patterns as the rest of the admin area but not visually verified in a real browser at phone width.

## 12. Environment Variables/Configuration Still Required From the Owner
No new environment variables were introduced in this phase. The full set
required for a real launch (unchanged from prior phases):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (webhook only), `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`,
`NEXT_PUBLIC_SITE_URL`. See `.env.example` and the README's setup steps.

## 13. Manual Supabase Steps
1. Run `supabase/phase12.sql` (after all prior numbered migrations).
2. Optionally run `supabase/optional-second-course-fixture.sql` to validate the multi-course architecture, then optionally delete that course afterward (`delete from courses where slug = 'ai-101-validation-course'` — cascades cleanly).
3. Promote at least one real administrator account (documented since Phase 7 — direct SQL, unchanged).
4. Visit `/admin/launch-readiness` once deployed to confirm the platform sees its own configuration correctly.

## 14. Manual Stripe Steps
None new in this phase. Existing requirement (Phase 6/8): a webhook
endpoint registered in the Stripe Dashboard pointing at
`/api/webhooks/stripe`, subscribed to `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `checkout.session.expired`,
and `charge.refunded`.

## 15. Manual Resend/Email Steps
None new in this phase. Existing requirement (Phase 5): a verified
sending domain and API key, referenced by `RESEND_API_KEY`/`EMAIL_FROM`.
The platform functions correctly without this configured — emails are
skipped (logged, not sent), not a hard failure.

## 16. Recommended Phase 13 Priorities
1. **Execute the full Live Verification Checklist, second-course validation procedure, and End-to-End Acceptance Test** against a real Supabase/Stripe environment — the single highest-priority item, as with every phase that couldn't be tested live in this sandbox.
2. A dedicated "view students enrolled in course X" admin route (currently implemented as a query-param filter on `/admin/students`, which works but a purpose-built view could show course-specific columns more cleanly).
3. Revisit whether `app/courses/ai-101/...`'s hardcoded routes should eventually be retired now that this phase's review confirmed they're fully behaviorally equivalent to the generic ones — a decision, not an action, deferred again per this phase's "don't touch working routes without a functional reason" conclusion.
4. A safe admin-facing way to review/download the End-to-End Acceptance Test results as a repeatable pre-launch runbook, rather than a document the owner reads and executes manually each time.
