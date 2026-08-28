# Launch-Day Smoke Test

## Automated first pass

Run the HTTP-level deployment check before the manual browser steps below:

```bash
BASE_URL=https://your-domain.com npm run smoke:production
```

All 11 checks must pass. This command never signs in, purchases a course, or
prints credentials; the manual acceptance steps remain required.

A fast, ~10-minute check to run immediately after deploying to production
— **not** a replacement for the full pre-launch acceptance test at
`/admin/acceptance-test` (run that first, before this ever matters). This
is what to run right after a deploy, or after any change to production
configuration, to catch a broken deployment quickly.

Use real production URLs and — for the payment step — a real Stripe test
transaction if the academy is still in test mode, or accept that step is
skipped once live.

## The 10-minute check

1. **Homepage loads** — visit the production URL. Confirm the page
   renders with no visible error and the navigation works.
2. **Catalog loads** — visit `/courses`. Confirm at least one published
   course appears.
3. **Course page loads** — open that course. Confirm price, description,
   and the enrollment CTA are correct.
4. **Signup works** — create a new test account. Confirm you land on the
   dashboard.
5. **Login works** — log out, log back in with that account.
6. **Dashboard loads** — confirm no error, even with zero enrollments.
7. **Admin login works** — log in as an administrator account. Confirm
   `/admin` loads with real (not placeholder) numbers.
8. **Launch Readiness is green** — visit `/admin/launch-readiness`.
   Confirm no unexpected "Needs Attention" items (some may be expected —
   e.g. Resend, if intentionally not configured yet).
9. **A protected route redirects correctly** — while signed out, visit
   `/dashboard`. Confirm a redirect to `/login`.
10. **Not-found page is branded** — visit a nonexistent URL (e.g.
    `/this-page-does-not-exist`). Confirm the branded 404 page appears,
    not a raw framework error page.

If everything above passes, the deployment is healthy enough to proceed
with — or continue — real traffic. If anything fails, treat it as a
launch blocker and check the corresponding section of
`docs/production-launch-runbook.md` and `/admin/launch-readiness` before
continuing.

## What this deliberately does not check

This smoke test does not re-verify the full payment-to-certificate
journey, refund handling, or cross-course security boundaries — those are
covered in depth by `/admin/acceptance-test` and should be run in full
before the *first* production launch and after any change to payment,
enrollment, or certificate logic. This document is for routine
"did the deploy work" confidence, not a substitute for that.
