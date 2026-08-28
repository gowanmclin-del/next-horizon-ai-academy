# Phase 16 Notes — Full-Stack Dependency, Build & Compliance Audit

## Scope
An audit-and-harden pass per the brief — no new features, no database
migrations (confirmed unnecessary and confirmed untouched by diff).

## 1. Dependency Audit

**Next.js**: bumped `14.2.5` → `14.2.35` in `package.json`, with
`eslint-config-next` bumped to match (Next.js's own convention requires
this package to track the same version as `next` itself). This is a
patch-level change within the same minor version — no other dependency
required a change based on the brief's stated concern (an outdated Next.js
patch version, specifically).

**`npm audit`**: could not run in this sandbox — no lockfile exists,
because `npm install` cannot reach the registry (see
`docs/PHASE16-VERIFICATION-REPORT.md`). This is a real, honestly-reported
gap, not a "ran clean" claim — the owner or CI system needs to run this
for real. See `PHASE16-HANDOFF.md`.

## 2. Build Verification

`npm run build`, `npm run lint`, and the real `npm run typecheck` script
could not execute — all three ultimately require `node_modules`, which
requires `npm install`, which fails in this sandbox (confirmed with a
fresh attempt, documented with the exact error text in
`docs/PHASE16-VERIFICATION-REPORT.md`). Substituted a global TypeScript
compiler pointed directly at the project's source as the closest available
approximation — full results, including the exact filtered/unfiltered
output, are in that report.

## 3. ESLint Fixes

Manually inspected all 8 files named in the brief, using a script that
distinguishes real JSX text-node content from string literals and JSX
attribute values (the `react/no-unescaped-entities` rule only fires on
the former). Found and fixed **6 genuine violations**:

| File | Violation | Fix |
|---|---|---|
| `app/admin/acceptance-test/page.tsx` | `"Critical journey"` (literal quotes in JSX text) | `&quot;Critical journey&quot;` |
| `app/admin/launch-readiness/page.tsx` | `a "Ready" status` (literal quotes in JSX text) | `&quot;Ready&quot;` |
| `app/contact/page.tsx` | `academy's organizational programs` | rewritten during the contact-page rebuild (see section 7) |
| `app/reset-password/page.tsx` | `passwords can't be updated here` | `can&rsquo;t` |
| `components/Newsletter.tsx` | `academy's subscriber system` | `academy&rsquo;s` |
| `components/admin/RefundOrderButton.tsx` | `becomes "Revoked"` (literal quotes in JSX text) | `&quot;Revoked&quot;` |

`app/admin/courses/page.tsx` and `components/admin/CourseBuilder.tsx`
were also inspected and contained **zero** actual JSX-text apostrophes or
quotes — every apostrophe/quote in those two files lives inside a plain
JS string literal (e.g. inside a `.ts` object array or a template
literal), which the rule does not flag. I want to be direct that I could
not find a real violation in either file with the detection method
available to me; if a real `next lint` run surfaces something in these
two files that this approach missed, that's a genuine gap in this
phase's verification, documented as such in
`docs/PHASE16-VERIFICATION-REPORT.md`.

A broader sweep across every `.tsx` file in `app/`/`components/` (not
just the 8 named ones) was also run, to catch anything else. It
surfaced several additional regex matches, all confirmed by manual
review to be false positives (TypeScript generic syntax like
`useState<string | null>(...)` being misread as a JSX boundary by the
regex-based approach) — none required a fix.

## 4. Payment Flow Hardening — the real bug

**Found**: `lib/actions/payments.ts` built Stripe's `success_url`/
`cancel_url` via `buildSiteUrl(...) ?? <relative path>`. If
`NEXT_PUBLIC_SITE_URL` was unset or `buildSiteUrl()` otherwise returned
`null`, this silently fell back to a **relative** URL string (e.g.
`/courses/ai-101/purchase/success?session_id={CHECKOUT_SESSION_ID}`).
Stripe's Checkout Session API requires absolute URLs for these fields —
a relative one is simply invalid, meaning a misconfigured deployment
would either have the Stripe API reject the checkout-session-creation
request outright, or (depending on Stripe SDK/API version behavior)
produce a session that could never correctly redirect a paying student
back to the site. Either way, this was silent and only discoverable at
the worst possible moment — a real student mid-purchase.

**Fixed**: added `getValidatedSiteUrlForCheckout()` to
`lib/email/site-url.ts` — deliberately separate from the existing
`getSiteUrl()`/`buildSiteUrl()` (which remain unchanged and are still
correct for their use case: email CTA links, where "omit the button" is
an acceptable degradation). The new function:
- Requires `NEXT_PUBLIC_SITE_URL` to be set and parse as a valid URL.
- Requires `http:` or `https:` protocol.
- In production (`NODE_ENV === "production"`), requires `https:` and
  rejects `localhost`/`127.0.0.1`/`::1` — while still allowing
  `http://localhost:3000` in non-production environments, since that is
  the normal, expected way to test Stripe checkout locally with
  `stripe listen` forwarding webhooks to a dev server.
- Returns a discriminated `{ ok: true; origin } | { ok: false; error }`
  result rather than `string | null`, so the call site cannot
  accidentally treat a failure as "just build a relative URL instead."

`createCheckoutSession()` now calls this validator **before** calling
`create_pending_order()` — per the brief's explicit requirement to avoid
leaving orphaned pending orders in the database when checkout can't
actually proceed. If validation fails, the function returns immediately
with a clear error and touches the database not at all.

## 5. Launch-Readiness & Reporting Consistency

`getLaunchReadiness()` (`lib/data/admin.ts`) previously used its own,
separate, looser site-URL check (regex-based HTTPS/localhost detection)
that could disagree with what actually gates checkout. It now calls the
exact same `getValidatedSiteUrlForCheckout()` used by the real checkout
path — computed once and reused across the "Checkout Configuration" and
"Production Application URL" checks, so these two readiness rows can
never contradict each other or the actual runtime behavior.

Also added: detection of known placeholder/example domains
(`nexthorizonaiacademy.com` — this codebase's own fallback placeholder
from `app/layout.tsx`/`app/sitemap.ts`/`app/robots.ts`, plus
`example.com`, `yourdomain.com`, `yoursite.com`) so a site URL that is
technically valid HTTPS but is still an unedited placeholder is correctly
flagged as "Needs Attention," not silently marked "Ready."

## 6. Contact Information Flow

**Found**: `/contact` said "A direct academy contact channel will be
connected before public launch" — true, but with no actual mechanism to
ever change that once a real address existed.

**Fixed**: added `NEXT_PUBLIC_CONTACT_EMAIL` (documented in
`.env.example`). When set to a syntactically valid email address, the
Contact page shows a real `mailto:` link. When unset or invalid, it shows
a professional "being finalized" message — the exact same honest
degradation pattern already used throughout this project (Stripe,
Resend, error monitoring, analytics all follow the same shape: configured
→ real behavior, unconfigured → honest, non-broken fallback). **No email
address was fabricated.** Also added a new "Academy Contact Information"
row to `/admin/launch-readiness`.

## 7. Duplicated Route Structure — Documented, Not Rewritten

`app/courses/ai-101/...` (hardcoded) and `app/courses/[slug]/...`
(generic) still both exist and are behaviorally equivalent, as documented
in Phase 10/11's own notes. This phase reviewed that decision again per
the brief's instruction and reached the same conclusion: retiring the
hardcoded AI-101 routes now would be a real-traffic-affecting change with
no functional benefit (both route sets already work correctly and never
conflict, by Next.js's own static-vs-dynamic route precedence), and doing
so was explicitly out of scope for an audit phase focused on
dependency/build/compliance hardening. **Logged here as acknowledged
technical debt, not fixed in this phase** — see
`PHASE16-HANDOFF.md` for the recommended next-phase disposition.

## 8. Founder Photo Placeholder

Not replaced (no real photo exists to use, and fabricating a professional
headshot would be dishonest and inappropriate for a real business's
about page). Instead, `components/FounderSection.tsx` now has inline,
copy-pasteable instructions for exactly how to swap in a real photo when
one becomes available — a `next/image` snippet, the expected file path,
and a note that this is the only place it needs to change.

## 9. Legal / Compliance Documentation

Reviewed `/privacy` and `/terms` (rewritten in Phase 14, still labeled
"Draft — Pending Legal Review") — no change made; that label remains
accurate and appropriate, and this phase's dependency/build focus did not
surface any new compliance-relevant finding. `/contact` is covered above.

## Files Changed
- `package.json` — Next.js + `eslint-config-next` version bump.
- `lib/email/site-url.ts` — new `getValidatedSiteUrlForCheckout()`.
- `lib/actions/payments.ts` — uses the new validator; no relative-URL fallback.
- `lib/data/admin.ts` — launch-readiness reuses the validator; new placeholder-domain and contact-email checks.
- `app/contact/page.tsx` — real `NEXT_PUBLIC_CONTACT_EMAIL` support.
- `components/FounderSection.tsx` — founder-photo replacement instructions.
- `app/admin/acceptance-test/page.tsx`, `app/admin/launch-readiness/page.tsx`, `app/reset-password/page.tsx`, `components/Newsletter.tsx`, `components/admin/RefundOrderButton.tsx` — unescaped-entity fixes.
- `.env.example`, `README.md`, `docs/OWNER-ACTION-GUIDE.md`, `docs/PHASE15-LAUNCH-CHECKLIST.md` — updated for the corrected Stripe URL behavior and the new contact-email variable.
- `docs/PHASE16-VERIFICATION-REPORT.md`, `PHASE16-NOTES.md`, `PHASE16-HANDOFF.md` — new.

## Files Explicitly NOT Changed
Every `supabase/*.sql` file (confirmed by diff) — no database change was
necessary for anything in this phase's scope.
