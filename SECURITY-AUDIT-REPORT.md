# Phase 17 Security Audit Report

Scope: re-verification of established security patterns across all prior
phases, plus the specific checks the Phase 17 brief calls out. This is an
audit, not a rebuild — findings below are either "confirmed intact" (no
change needed) or a specific, real gap with a specific recommendation.

## 1. RLS Policies

Re-verified with a script that cross-references every `create table` in
`supabase/*.sql` against every `enable row level security` statement:
**every table has RLS enabled, with no exception.** This has been true
since each table was introduced and remains true after this phase's
changes (which added zero tables and zero RLS policies — the one new SQL
file this phase adds, `phase17.sql`, only adds CHECK constraints).

No RLS policy was found using an unconditional `using (true)` for reads.
The only `with check (true)` policies remain the two deliberate
public-insert-only marketing forms (`founding_class_interests`,
`launch_subscribers`), which have no matching `select` policy — so
nothing written through them can be read back by an unprivileged caller.
This matches every prior phase's audit finding; unchanged.

## 2. Service-Role Key & Secret Exposure

Confirmed (by checking the actual import graph, not just string search,
consistent with the method used in Phases 6–12) that `lib/supabase/admin.ts`
(the service-role client) and `lib/stripe/server.ts` (the Stripe secret
client) are each imported only by their expected server-only files
(`lib/actions/email.ts`, `lib/actions/payments.ts`, `lib/actions/admin.ts`,
and the webhook route) — never by any `"use client"` file. No secret
value is ever interpolated into a string returned to the browser; the
Launch Readiness page's Stripe-mode detection (`sk_live_` vs. `sk_test_`)
checks only the key's *prefix*, never displays the key itself. Unchanged
from every prior phase's finding.

## 3. CSRF Protection on State-Changing Routes

Every state-changing operation in this application goes through a Next.js
Server Action (`"use server"` files under `lib/actions/`) **except one**:
`app/api/webhooks/stripe/route.ts`. Server Actions have built-in CSRF
protection as of Next.js 13.4+ — the framework verifies the request's
`Origin` header matches the deployment's own host before executing the
action, rejecting cross-origin form/fetch submissions automatically. This
requires no additional code in this project; it's inherent to using
Server Actions rather than hand-rolled API routes for mutations.

The one Route Handler, the Stripe webhook, is correctly *not* protected by
a CSRF token — CSRF tokens don't apply to server-to-server webhook calls
(there's no browser session to forge). It's protected the correct way for
its threat model instead: Stripe's HMAC signature verification
(`stripe.webhooks.constructEvent`), confirmed present and checked before
any database write, unchanged from Phase 6.

**No other Route Handler exists in this codebase** — confirmed by
directory listing. There is no unprotected mutation surface.

## 4. Timing Attacks on Sensitive Comparisons

Reviewed the two places a bearer-style secret value is compared:
`verify_certificate(p_verification_code)` and Stripe's own webhook
signature check (`constructEvent`, which Stripe's SDK already implements
with a constant-time comparison internally — not this project's code to
audit).

`verify_certificate()` does a plain indexed equality lookup
(`where verification_code = p_verification_code`) against a value
generated as `upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 16))` —
16 hex characters from 8 cryptographically random bytes, 64 bits of
entropy (`supabase/schema.sql`). A btree equality lookup is not
constant-time in the strict cryptographic sense, but at this entropy
level, and given realistic network/database jitter, the practically
exploitable information leak from timing a single lookup is negligible —
this is the same trade-off made industry-wide for indexed lookup tokens
with comparable entropy (e.g. API keys, invite codes), as distinct from
password comparisons specifically, which do warrant constant-time
handling and are correctly delegated to Supabase Auth's own
implementation rather than any custom code in this project. **Assessed as
acceptable risk given the entropy level; not changed.** A genuinely
constant-time SQL comparison is impractical to implement correctly and
would not meaningfully improve real-world security at this entropy level.

## 5. Admin Action Audit Logging

Re-confirmed `admin_audit_log` (Phase 8) has exactly one RLS policy
(admin `select` only) and **no insert/update/delete policy for any client
role, including admins** — every row is written by the SECURITY DEFINER
function performing the action itself, never a standalone write. No admin,
however privileged their session, can edit or delete an audit log entry
through the application. Unchanged from Phase 8's original implementation;
re-verified here, not modified.

## 6. Rate Limiting — Real Gap, Not Fixed This Phase

**Finding**: grepped the entire codebase for any rate-limiting
implementation (middleware-based, in-memory, or otherwise) — found none.
Every Server Action (student search, checkout creation, admin
grant/revoke, refunds, etc.) can be called as many times as a signed-in
session's own request rate allows, with no application-level throttle.

**Mitigating factors already in place**:
- Supabase Auth's own signup/login/password-reset endpoints have their
  own built-in rate limiting, external to this project's code.
- Every admin-only action requires an authenticated admin session (itself
  gated by the Phase 7 role system) — an anonymous attacker cannot reach
  those endpoints at all, only a compromised or malicious admin account
  could abuse them, which is a different threat model than public-facing
  abuse.
- `create_pending_order()`/checkout creation is bounded by requiring
  authentication and by Stripe's own API-level controls; repeated calls
  create additional `pending` orders (harmless rows, never charged) rather
  than any exploitable state.

**Why this wasn't fixed in this phase**: rate limiting is properly an
infrastructure-level decision (a platform feature like Vercel's built-in
protections, a CDN/WAF like Cloudflare, or a shared store like Upstash
Redis for a custom in-app limiter) — implementing an in-memory
per-instance rate limiter in a serverless Next.js deployment would be
either ineffective (each function invocation could be a cold instance
with no shared memory) or would require introducing a new external
dependency (a Redis-backed store) that hasn't been provisioned or decided
on. Building this blind, without that infrastructure decision, would risk
exactly the kind of "large-scale, unproven change" the brief asks this
phase to avoid.

**Recommendation for a future phase**: add rate limiting at the
infrastructure layer (hosting-provider-level, or an Upstash-backed
middleware check) for at minimum: checkout creation, student/admin search
actions, and the public marketing-form Server Actions
(`submitFoundingClassInterest`, `submitLaunchSubscriber`) — the last two
being the only genuinely anonymous-accessible write surface in the app.

## 7. Additional Spot-Checks Performed

- **No new RLS policies or database writes were introduced by this
  phase's two real fixes** (the Stripe checkout URL validation and the
  performance parallelization changes) — both are pure logic/reliability
  changes to existing, already-reviewed code paths, confirmed by diff to
  touch no SQL file's *policies* (only `phase17.sql`'s new CHECK
  constraints, which are structural, not access-control).
- Confirmed the new `phase17.sql` CHECK constraints (see
  `DATA-INTEGRITY-REVIEW.md`) don't weaken anything — they only narrow
  what values are accepted, and only for the four numeric columns already
  validated identically at the application layer.

## Summary

No new RLS gap, no new secret exposure, no new CSRF surface, no
regression in audit logging. One real, pre-existing gap (rate limiting)
was found, assessed, and deliberately not fixed blind in this pass —
documented with a specific recommendation instead. Nothing else in this
audit surfaced a change requiring code.
