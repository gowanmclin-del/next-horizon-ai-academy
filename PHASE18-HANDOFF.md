# Phase 18 Handoff

## Verified in Code
- The exact Phase 17/Phase 9 conflict exists as reported (confirmed by grep before any fix was written).
- `supabase/phase18.sql`'s replacement functions preserve every existing authorization check (`is_admin(auth.uid())`, checked first, unchanged), the existing "submitted IDs exactly match the parent's children" validation (tightened to also reject duplicates), and the existing admin audit logging (unchanged insert statements).
- The offset-based reorder technique is collision-free and always-positive by construction (see `PHASE18-NOTES.md` section 1 for the reasoning) — verified by code review, not live execution.
- All twelve prior SQL migration files are byte-for-byte unchanged (`diff`-confirmed).
- The three Phase 17 `Promise.all` changes are behaviorally equivalent to their pre-Phase-17 sequential versions; two real pre-existing error-handling gaps were found and fixed in the process (see `PHASE18-NOTES.md` section 5).
- The `RefundOrderButton` dialog's Escape/focus-trap/focus-return behavior is now consistent with its own Cancel button's `disabled={submitting}` guard (see `PHASE18-NOTES.md` section 6).
- Brace/paren balance clean across all files.

## Verified by Commands
- `npm install`: **failed** (403, no registry access — see `docs/PHASE18-VERIFICATION-REPORT.md` for exact output).
- `npm run typecheck`: **ran** (unlike lint/build), using the project's real `tsconfig.json` for the first time in this project's history rather than a substitute config. After filtering well-understood missing-dependency noise, 41 lines remain, and every one of them is confirmed to be one of two known artifact patterns caused by `@types/react` being uninstallable here (see the verification report for the full breakdown) — not a real code defect.
- `npm run lint`: **failed immediately** (`next: not found`).
- `npm run build`: **failed immediately** (`next: not found`). **The application has never actually built in this environment.**
- `npm audit --omit=dev`: **failed** (no lockfile).

## Requiring a Live Supabase Test
- Running `supabase/phase17.sql` then `supabase/phase18.sql` against a real database, in that order.
- Reordering a course's modules and a module's lessons through the admin Course Builder UI, confirming no constraint-violation error occurs (this is the actual defect this phase exists to fix — it has not been observed to be fixed, only reasoned through).
- The five SQL verification queries at the bottom of `supabase/phase18.sql` (constraint existence, position uniqueness/sequentiality, a rejected out-of-bounds value, and the unauthorized-access test).
- The duplicate-ID and nonexistent-parent validation fixes — neither has ever executed against a real database.

## Requiring Browser Testing
- The `RefundOrderButton` fix: pressing Escape while a refund is submitting should now do nothing (previously it closed the dialog); this has not been observed in a real browser.
- The two dashboard pages' new `.catch()` error states — never observed to actually render (would require a real network failure to trigger).
- The `EnrolledCourseSummaryCard`/`CertificateCard` error states — same.
- A full production build has never run, so no page in this application has ever been rendered by a real Next.js build in this environment, at any phase.

## Owner Actions Before Launch
1. Run `phase17.sql` then `phase18.sql`, together, in that order, against your real Supabase project (see the README's "Migration Sequencing" section).
2. On a machine with real internet access, run `npm install`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm audit --omit=dev` — this is the first time in this project's history any of these would run against real dependencies. Report back anything that fails.
3. After running the migrations, test module and lesson reordering in the Course Builder directly — this is the specific fix this phase makes, and it has not been observed working.
4. Everything already listed in `docs/OWNER-ACTION-GUIDE.md` and `docs/PHASE15-LAUNCH-CHECKLIST.md` from prior phases remains outstanding.

## Known Limitations / Deferred Technical Debt
- The `app/courses/ai-101/...` vs. `app/courses/[slug]/...` route duplication remains, unchanged from Phase 10/11/12's documented decision — not touched this phase, per the brief's instruction to leave it unless it causes a real build/routing problem (it does not).
- No rate limiting exists anywhere in the application (documented in Phase 17's `SECURITY-AUDIT-REPORT.md`, unchanged this phase).
- This project has never had a successful `npm install` or `npm run build` in any phase. Every verification claim in every phase's notes, including this one, has been a code-review-level substitute, not an observed pass.

## Recommendation
Do not consider this project ready for staging deployment until a real
`npm install && npm run build` has actually succeeded, and the reorder
fix in `supabase/phase18.sql` has been confirmed working against a real
Supabase database. Both are one-time, mechanical steps — nothing in this
handoff suggests a design problem, only that the code has never been
executed in a real environment.
