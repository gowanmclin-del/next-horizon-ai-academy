# Phase 15 Launch Checklist

_Updated in Phase 16 — see `PHASE16-NOTES.md` for what changed._
_Updated in Phase 18 — see `PHASE18-NOTES.md` for what changed._

Work through this in order. Each box should only be checked once you've
actually confirmed it, not just configured it. See `docs/OWNER-ACTION-GUIDE.md`
for step-by-step instructions on the external-service items referenced here.

## Before Deployment

- [ ] Latest code is deployed to a staging or preview environment first, not directly to production.
- [ ] `.env.example` has been reviewed and every variable your deployment needs has a real value planned.
- [ ] No `.env.local` or real secret value has been committed to the repository.

## Supabase

- [ ] Supabase project created.
- [ ] All migration files run, in order, from `schema.sql` through `phase18.sql` (`phase17.sql` and `phase18.sql` must be run together, in that order, with nothing in between — see the README's "Migration Sequencing" section).
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in the hosting environment.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set — **server-only**, confirm it does not appear in any `NEXT_PUBLIC_`-prefixed variable.
- [ ] At least one administrator account promoted (see Owner Action Guide, step 3).
- [ ] `/admin/launch-readiness` shows "Ready" for Supabase Configuration and Database Tables/Migrations.
- [ ] As an admin, reorder a course's modules and reorder a module's lessons in the Course Builder — confirm both succeed with no error (this specifically verifies the Phase 18 reorder-function fix on real data).

## Stripe

- [ ] Stripe account created, currently in **Test mode**.
- [ ] `STRIPE_SECRET_KEY` (test) set in the hosting environment.
- [ ] Webhook endpoint created pointing at `/api/webhooks/stripe`, subscribed to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, and `charge.refunded`.
- [ ] `STRIPE_WEBHOOK_SECRET` set in the hosting environment.
- [ ] A real test-mode purchase completed successfully (card `4242 4242 4242 4242`).
- [ ] The resulting order appears in `/admin/orders` with status "Paid."
- [ ] The resulting enrollment appears on the student's dashboard.
- [ ] `/admin/launch-readiness` shows "Ready" for Stripe Configuration and Stripe Webhook Configuration.
- [ ] Confirmed `NEXT_PUBLIC_SITE_URL` is set correctly by temporarily unsetting it and confirming checkout fails with a clear error, not a broken redirect (optional but recommended once, in staging only — remember to set it back).

## Resend (optional but recommended)

- [ ] Resend account created and sending domain verified.
- [ ] `RESEND_API_KEY` and `EMAIL_FROM` set in the hosting environment.
- [ ] A real test enrollment produced a real received email.
- [ ] If skipping Resend for now: confirmed the platform still works correctly without it (emails are skipped, not a hard failure — this is expected).

## Domain / DNS

- [ ] Production domain added in the hosting provider.
- [ ] DNS records added at the domain registrar per the hosting provider's instructions.
- [ ] Domain resolves to the live site over HTTPS.
- [ ] Resend's domain-verification DNS records added (if using Resend).

## Environment Variables

- [ ] `NEXT_PUBLIC_SITE_URL` set to the real production domain (not localhost, not a preview URL, not a placeholder like `example.com`). **Checkout will not work at all without this set correctly** — as of Phase 16, it's validated before every Checkout Session is created.
- [ ] `NEXT_PUBLIC_CONTACT_EMAIL` set to a real, monitored email address (or deliberately left unset if a contact channel isn't ready — the Contact page degrades gracefully either way).
- [ ] Every variable in `.env.example` has been considered — either set, or deliberately left unset with a known consequence (see `docs/OWNER-ACTION-GUIDE.md`).
- [ ] `/admin/launch-readiness` shows "Ready" for Production Application URL, Checkout Configuration, and Academy Contact Information.

## Deployment

- [ ] Production build completes successfully in the hosting provider's build step (see `PHASE15-HANDOFF.md` for why this could not be verified in the sandbox that produced this phase).
- [ ] Site loads at the production domain with no console errors on the homepage.
- [ ] Favicon appears correctly in the browser tab.

## Post-Deployment Smoke Test

Run `docs/launch-day-smoke-test.md` in full against the real production URL.

- [ ] All 10 items in that checklist pass.

## Mobile Test

- [ ] Homepage and navigation usable on an iPhone-sized screen.
- [ ] Signup/login usable on a phone.
- [ ] Checkout entry (course page → Stripe redirect) usable on a phone.
- [ ] Dashboard usable on a phone.
- [ ] A lesson page usable on a phone (sidebar collapses correctly).
- [ ] The assessment page usable on a phone.
- [ ] The certificate page usable on a phone.
- [ ] Key admin screens (`/admin`, `/admin/orders`, `/admin/students`) usable on a phone.

## Security Test

- [ ] Signed-out visitor requesting `/dashboard` is redirected to `/login`.
- [ ] Signed-in, unenrolled student cannot view a paid course's lesson content.
- [ ] A student cannot reach any `/admin/*` route.
- [ ] A revoked enrollment loses lesson and assessment access.
- [ ] Enrollment in one course does not grant access to a second course.
- [ ] An assessment submission for a course the student isn't enrolled in is rejected.
- [ ] A duplicate Stripe webhook delivery (resend the same event from the Stripe Dashboard) does not create a duplicate enrollment.
- [ ] `/verify` correctly distinguishes a valid certificate from a made-up code.

## Final Go-Live Approval

- [ ] Every box above is checked.
- [ ] `/admin/acceptance-test` has been run in full at least once against this production environment.
- [ ] Privacy Policy and Terms of Use have been reviewed by qualified legal counsel (see `PHASE14-NOTES.md` — these remain labeled drafts until this happens).
- [ ] A real contact email/channel is live on `/contact`.
- [ ] Owner has decided whether to switch Stripe to Live mode now or continue testing in Test mode.
- [ ] **Sign-off:** _________________________ (name) _________________________ (date)

Once every item above is checked and signed off, the academy is ready for
real students.
