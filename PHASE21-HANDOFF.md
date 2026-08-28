# Phase 21 Handoff

## Run Before Production Deployment

1. Add the real environment variables from `.env.example` to the hosting
   service. Do not send or paste secret values into chat.
2. Run `npm run check:env:production` in the configured deployment environment.
3. Run `npm run verify:release`.
4. Deploy.
5. Run `BASE_URL=https://your-domain.com npm run smoke:production`.
6. Sign in as an administrator and complete every item at
   `/admin/acceptance-test`.

## Current External Blockers

The supplied project copy contains no production environment values, correctly.
Therefore Phase 21 cannot execute real database migrations, Stripe payments,
webhook enrollment, Resend delivery, or certificate issuance against your
accounts. Those are owner-controlled live-service actions.

## Recommended Phase 22

After the production variables and database migrations are in place, use the
live results to fix any integration failures. Also install the announced
Next.js 15.5.24 security patch when it becomes available, then rerun the Phase
21 release gate and production smoke test.

