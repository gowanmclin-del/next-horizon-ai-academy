# Phase 19 Handoff

## Verified Complete

The project now installs, lints, typechecks, and creates an optimized Next.js
production build successfully. This replaces the code-review-only verification
used in Phases 1–18 with an observed build pass against installed dependencies.

## Still Requires the Owner's Live Services

1. Apply `supabase/phase17.sql` and then `supabase/phase18.sql` to the real
   Supabase project.
2. Confirm module and lesson reordering through the Course Builder.
3. Configure production Supabase, Stripe, Resend, and site URL environment
   variables using `.env.example` and `docs/OWNER-ACTION-GUIDE.md`.
4. Run the launch-day smoke test with real student, payment, email, and admin
   accounts.

## Recommended Phase 20

Perform a controlled framework dependency upgrade to eliminate the current
Next.js/PostCSS audit findings, then rerun lint, typecheck, build, and the
critical authentication/payment smoke tests. Treat this as a deliberate major
version migration rather than an automatic `npm audit fix`.

