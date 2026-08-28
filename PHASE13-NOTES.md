# Phase 13 Notes — Production Integration & Launch Control

## Goal
Phase 13 deliberately adds no new student product scope. It converts the Phase 12 launch-readiness work into a repeatable production runbook and acceptance-test surface.

## Files added
- `app/admin/acceptance-test/page.tsx` — repeatable core-journey, edge-case, security, mobile, and release-signoff checklist.
- `docs/production-launch-runbook.md` — exact production deployment order, environment-variable map, Stripe webhook requirements, go/no-go criteria, and post-launch smoke test.
- `PHASE13-NOTES.md` — this handoff.

## Files modified
- `components/admin/AdminNav.tsx` — adds Acceptance Test navigation.
- `lib/data/admin.ts` — strengthens launch-readiness checks for service-role presence, Stripe mode, production URL quality, and clearer blocking configuration.
- `app/admin/launch-readiness/page.tsx` — adds a go/no-go summary and link to the acceptance test.
- `.env.example` — clarifies test/live Stripe mode and production URL requirements.
- `package.json` — adds a repeatable `npm run typecheck` script.
- `README.md` — adds the Phase 13 production-launch section.

## Database changes
None. Phase 13 does not alter tables, policies, functions, or existing migrations.

## Owner actions still required
The application cannot self-provision external services. The owner must provide a real Supabase project, deployment host, Stripe account/webhook, Resend domain/key, and production domain. Phase 13 makes those dependencies explicit and verifiable without exposing their secret values.

## Recommended next phase
After the Phase 13 checklist is executed successfully against real services, Phase 14 should be a launch polish / observability phase only: production error monitoring, analytics, legal/contact final review, SEO metadata, and launch-day smoke-test notes. Do not add major course-platform features before the payment-to-certificate path is proven live.

## Verification performed in this sandbox
- `package.json` parsed successfully after adding the `typecheck` script.
- Phase 13 routes and navigation were manually reviewed for balanced JSX structure and valid internal paths.
- The global `tsc --noEmit` command was attempted. It cannot produce a meaningful project typecheck in this sandbox because project dependencies/types are not installed (`next/link` and React JSX type declarations are unresolved), causing repository-wide missing-module/JSX errors before application-level checking can be trusted.
- No live Supabase, Stripe, Resend, DNS, or deployed-domain test was possible here. Those are intentionally the owner-side acceptance steps documented by this phase.
