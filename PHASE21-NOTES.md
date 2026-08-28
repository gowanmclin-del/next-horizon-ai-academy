# Phase 21 Notes — Production Integration & Launch Acceptance

## Outcome

Phase 21 adds repeatable, secret-safe release checks for the production
integration step. The project can now validate required service configuration,
run the complete release build gate with one command, and smoke-test a deployed
site's critical public and protected routes.

## Added

### Environment validator

`scripts/validate-env.mjs` checks the presence and safe shape of the Supabase,
Stripe, site URL, email, contact, and monitoring configuration. It never prints
secret values. Production mode rejects localhost and non-HTTPS canonical URLs.

Commands:

```bash
npm run check:env
npm run check:env:production
```

### Deployment smoke test

`scripts/smoke-test.mjs` tests eleven critical production endpoints, including
the homepage, catalog, authentication pages, legal pages, dashboard shell,
server-protected admin area, and branded 404 behavior.

```bash
BASE_URL=https://your-domain.com npm run smoke:production
```

### One-command release gate

```bash
npm run verify:release
```

This runs lint, TypeScript checking, and the optimized production build in
sequence and stops on the first failure.

## Verification Performed

- Missing-production-environment test: PASS — all six required missing groups
  were detected, warnings were separated from blockers, and no values printed.
- `npm run verify:release`: PASS.
- Local production server smoke test: PASS, 11/11 checks.
- Next.js 15.5.21 optimized build: PASS, 33 static pages generated.

## Important Boundary

These automated checks do not invent or test private production credentials.
The payment-to-enrollment-to-certificate acceptance journey still requires the
owner's real Supabase, Stripe test-mode, and Resend configuration.

