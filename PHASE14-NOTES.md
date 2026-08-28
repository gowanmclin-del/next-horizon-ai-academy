# Phase 14 Notes — Launch Polish & Observability

## Scope note
No brief was provided for this phase. Phase 13's own `PHASE13-NOTES.md`
explicitly recommended: "Phase 14 should be a launch polish /
observability phase only: production error monitoring, analytics,
legal/contact final review, SEO metadata, and launch-day smoke-test
notes. Do not add major course-platform features before the
payment-to-certificate path is proven live." This phase follows that
recommendation directly, stated as an assumption at the start of the
work rather than silently adopted.

## Files Added
- `lib/monitoring.ts`, `lib/analytics.ts` — graceful-degradation wrappers.
- `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` — branded error/404 boundaries; none of these existed before.
- `app/sitemap.ts`, `app/robots.ts` — neither existed before.
- `components/marketing/CoursesCatalogClient.tsx`, `components/marketing/AI101PageClient.tsx` — extracted client bodies (see "SEO" below).
- `docs/launch-day-smoke-test.md`.
- `PHASE14-NOTES.md` (this file).

## Files Modified
- `app/privacy/page.tsx`, `app/terms/page.tsx` — full rewrite (see "Legal Pages" below).
- `app/courses/page.tsx`, `app/courses/ai-101/page.tsx` — replaced with thin Server Component wrappers exporting metadata; original interactive body moved verbatim to the new `components/marketing/` files (confirmed identical by diff, aside from the function name).
- `app/courses/[slug]/page.tsx` — added `generateMetadata()`.
- `app/about/page.tsx`, `app/contact/page.tsx`, `app/resources/page.tsx`, `app/certifications/page.tsx`, `app/start-learning/page.tsx`, `app/network/page.tsx` — added per-page `export const metadata`.
- `app/signup/page.tsx`, `components/EnrollmentCTA.tsx`, `components/dashboard/CertificateCard.tsx`, both assessment pages — added `track()` calls at five conversion points.
- `.env.example` — documented the two new optional variables.
- `README.md` — Phase 14 section, title bump, Architecture Notes updated.

## Database Changes
**None.** Confirmed by diff — every one of the twelve SQL files (ten
numbered migrations, the seed, and the optional fixture) is byte-for-byte
identical to the uploaded Phase 13 delivery.

## Security Checks Performed
- Grepped `lib/monitoring.ts` and `lib/analytics.ts` for any reference to `SECRET`, `SERVICE_ROLE`, `STRIPE_SECRET`, or `RESEND_API_KEY` — none found. Both files only ever check the presence of their own optional, non-secret configuration variables.
- Confirmed `app/robots.ts` disallows `/admin`, `/dashboard`, `/api`, and all four auth routes.
- Confirmed `app/sitemap.ts` never references `admin` or `dashboard` — it only ever lists the static marketing routes and published course slugs (queried the same way the public catalog already does, via the anon-scoped server client, RLS-restricted to `status = 'published'`).
- Confirmed the two extracted marketing client components introduce no new data access — they are the exact original code, unchanged.

## Legal Pages — What Changed and Why
Both `/privacy` and `/terms` were, until this phase, their literal Phase 2
placeholder text — written when the site had no accounts, no payments,
and no data collection, and never updated despite Phase 6 onward adding
real Stripe payments, real Supabase-stored learner accounts and progress,
real transactional email via Resend, and a real admin system with
audit logging. This is a genuine gap for a site processing real payments.

**What I did**: rewrote both pages to accurately describe the platform's
actual current data practices — what's collected, which third parties
(Supabase, Stripe, Resend) are involved and why, how academy
administrators can access student records and that every sensitive
action they take is permanently logged, and how certificate verification
works publicly. **What I deliberately did not do**: present this as final,
legally-binding text. I am not a lawyer, this project has not had legal
review, and I'm not qualified to certify compliance with any specific
regulatory framework (GDPR, CCPA, or others). Both pages now open with a
clearly labeled "Draft — Pending Legal Review" notice saying exactly
that, and recommending real legal counsel before public launch. This
follows the same honesty standard used throughout every prior phase's
security/limitations sections — describing what's actually true rather
than overclaiming readiness.

`/contact` was reviewed but not substantially rewritten — it still says
a "direct academy contact channel will be connected before public
launch," which remains accurate since no real contact email exists to
put there. This is flagged under "Owner Action Still Required" below
rather than fabricated.

## Error Monitoring & Analytics Architecture
Both `lib/monitoring.ts` and `lib/analytics.ts` are built to the same
shape already proven out for Stripe (`lib/stripe/server.ts`) and Resend
(`lib/email/resend.ts`) across this entire project: a boolean
configuration check, a safe default behavior when unconfigured (log to
console; do nothing, respectively), and one clearly marked spot to fill
in a real SDK later. Neither requires any call-site change when a real
provider is eventually added — `reportError()` and `track()` are already
called from the relevant places.

**Why analytics defaults to fully inert, not just "logs to console" like
monitoring does**: error monitoring failing open (always logging) has no
privacy implication — it's the developer's own error, being logged by the
developer's own hosting platform. Analytics tracking a real visitor's
behavior is different — turning it on by default, even to a placeholder
that "just" logs to the browser console, still establishes the pattern of
firing on every page view before any decision has been made about a
provider or a consent mechanism. Chose to make `track()` a true no-op
until explicitly configured.

## SEO Work
Six previously metadata-less static pages gained real `<title>`/
`<meta description>` tags. The dynamic `/courses/[slug]` route gained
`generateMetadata()`, which runs one additional lightweight indexed
lookup by slug (acceptable overhead, and avoids coupling metadata
generation to the page component's own data-fetching). The catalog and
AI-101 pages required a real refactor since Next.js's `export const
metadata` only works in Server Components, and both were "use client"
files — extracted each one's interactive body verbatim into
`components/marketing/`, then replaced the original file with a thin
Server Component that exports metadata and renders the extracted
component. **Confirmed by direct file comparison (not just visual
inspection) that both extractions are byte-identical to the original,
aside from the function name change.**

## Tests Completed
- Full TypeScript check across all 115 `.ts`/`.tsx` files plus `middleware.ts` — zero new errors; only the same 5 pre-existing `key`-prop artifacts already documented since Phase 9 remain, confirmed identical count before and after this phase's changes.
- Brace/paren balance check across all 115 files — clean.
- Confirmed via `diff` that all twelve SQL files are unchanged from the uploaded Phase 13 delivery.
- Confirmed via `diff` that the full set of file-level changes matches exactly what this phase intended to touch — no accidental edits elsewhere.
- Security sweep as detailed above.
- **`npm install` / `npm run build` / `npm run lint` / `npm run typecheck` were NOT run.** This sandbox has no network access to the npm registry, reconfirmed immediately before packaging (403 from `registry.npmjs.org`), consistent with every prior phase.

## Anything That Could Not Be Tested
- `app/sitemap.ts` and `app/robots.ts` have never been requested from a running server — their output (correct XML/text format, correct absolute URLs) is based on Next.js's documented `MetadataRoute` API, not observed.
- `app/error.tsx`/`app/global-error.tsx` have never actually caught a real thrown error — their behavior is based on Next.js's documented App Router error-boundary convention, not observed.
- `generateMetadata()` on the dynamic course route has not been confirmed to actually populate a rendered `<head>` correctly, or to run efficiently alongside the page component's own data fetch.
- No real error monitoring or analytics provider has been connected — both remain architecturally ready but functionally inert, by design, in this environment.

## Known Limitations
- `/contact` still lacks a real contact email/channel — cannot be fabricated; needs owner input.
- The legal pages are informative drafts, not attorney-reviewed final policies — see above.
- No cookie-consent mechanism exists; analytics must stay off until one does, or until a provider that doesn't require consent in the academy's operating jurisdictions is chosen.

## Owner Action Still Required
1. Provide a real contact email/channel for `/contact`.
2. Have `/privacy` and `/terms` reviewed by qualified legal counsel before public launch.
3. Choose an error-monitoring provider (if desired) and fill in the marked spot in `lib/monitoring.ts`.
4. Choose an analytics provider (if desired), resolve any cookie-consent requirement, and fill in the marked spot in `lib/analytics.ts`.
5. Run the full `/admin/acceptance-test` and this phase's `docs/launch-day-smoke-test.md` against real Supabase/Stripe/Resend before and after each production deploy.

## Recommended Phase 15 Priorities
1. Execute this phase's and Phase 13's testing surfaces (acceptance test, smoke test) against real infrastructure — the standing recommendation of every phase that couldn't run live in this sandbox.
2. Legal review of `/privacy` and `/terms`, and a real `/contact` channel — both genuinely block a responsible public launch, not just a "nice to have."
3. If/when analytics or error monitoring is adopted for real, revisit whether a lightweight cookie-consent banner is needed before enabling `NEXT_PUBLIC_ANALYTICS_ID`.
