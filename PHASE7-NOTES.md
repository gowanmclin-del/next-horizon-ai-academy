# Phase 7 Notes — Academy Administration

## 1. What Was Added
A protected `/admin` section for academy staff: a real-data dashboard,
student management with a searchable list and per-student detail view,
enrollment management with a secure complimentary-enrollment workflow,
order viewing with status filters, a course overview, and a certificates
list — all gated by a database-backed `admin` role rather than a
hardcoded email address, verified server-side at every layer.

## 2. Files/Routes Added or Modified

**Added:**
- `supabase/phase7.sql` — the migration (see Database Changes below).
- `lib/data/admin.ts` — `requireAdmin()` (the authorization gate) plus every admin read query.
- `lib/actions/admin.ts` — `searchStudents`, `grantComplimentaryEnrollment`, `revokeEnrollment` Server Actions.
- `app/admin/layout.tsx` — calls `requireAdmin()` before rendering anything under `/admin`.
- `app/admin/page.tsx` — dashboard.
- `app/admin/students/page.tsx`, `app/admin/students/[id]/page.tsx`.
- `app/admin/enrollments/page.tsx`.
- `app/admin/orders/page.tsx`.
- `app/admin/courses/page.tsx`.
- `app/admin/certificates/page.tsx`.
- `components/admin/AdminNav.tsx`, `components/admin/GrantEnrollmentForm.tsx`.
- `PHASE7-NOTES.md` (this file).

**Modified:**
- `middleware.ts` — `/admin/*` added to the protected-route matcher (session check only; see "Admin Authorization Approach" below for why the role check lives elsewhere).
- `README.md`, `docs/database-schema.md` — Phase 7 sections appended.

**Not modified:** every Phase 1–6 route, component, Server Action, and SQL
function — Phase 7 only adds.

## 3. Database Changes
See `supabase/phase7.sql` in full, and the Phase 7 addendum in
`docs/database-schema.md`. Summary:
- `profiles.role` (`'student'` default, `'admin'` allowed).
- `is_admin(uuid)` — the shared authorization-check function.
- A `BEFORE UPDATE` trigger on `profiles` that silently blocks any
  non-admin from changing `role`, including via a direct API call.
- `enrollments`: `enrollment_type`, `granted_by`, `admin_note`,
  `updated_at`; `status` check constraint widened to add `'revoked'`.
- Six new `"... : admin read all"` SELECT policies (`profiles`,
  `enrollments`, `orders`, `certificates`, `lesson_progress`, `courses`).
- `admin_grant_enrollment()` / `admin_revoke_enrollment()` — the only
  paths that can create or revoke a non-Stripe enrollment.

Nothing is dropped; the one non-purely-additive change is the widened
`enrollments.status` check constraint, which only adds allowed values.

## 4. Security/RLS Changes
- **Six new read-only RLS policies**, each gated by `is_admin(auth.uid())`. No admin INSERT/UPDATE/DELETE policy was added to any table — every administrative write goes through a SECURITY DEFINER function.
- **The self-escalation-prevention trigger** is the single most important addition in this phase — without it, the pre-existing `"profiles: update own"` policy would let any student grant themselves admin access via a direct API call, since RLS alone can't restrict a single column within an otherwise-permitted row update.
- **`admin_grant_enrollment`/`admin_revoke_enrollment`** are `authenticated`-callable (unlike Phase 6's webhook functions, which are `service_role`-only — there's no webhook context here, the caller is a real signed-in admin), but each checks `is_admin(auth.uid())` as its very first line and raises a clean exception otherwise.

## 5. Admin Authorization Approach
Three independent layers, matching the brief's "do not rely solely on
hiding navigation links":
1. `middleware.ts` — requires *a* signed-in session for `/admin/*` (redirects to `/login` otherwise). Does not check role — see the comment in that file for why (avoiding a DB round-trip on every request to every protected route, not just admin ones).
2. `app/admin/layout.tsx` → `requireAdmin()` — the real gate. Reads `profiles.role` server-side and redirects non-admins to `/dashboard` *before generating any admin page's HTML*. Wraps every `/admin/*` route automatically via Next.js's layout nesting.
3. `lib/actions/admin.ts` mutations independently re-check `profiles.role` themselves, and the SQL functions they call check `is_admin()` a third time inside the database.

A student literally never receives admin HTML, and even a request that
somehow bypassed the layout (e.g. a raw Server Action call) would still be
rejected twice more.

## 6. Testing Completed
- Full TypeScript check across all 82 `.ts`/`.tsx` files plus `middleware.ts` — found and fixed two real bugs during review: (1) a broken `count`/`data` destructuring mismatch in the dashboard stats query that would have always shown 0 certificates issued, and (2) several `Map` constructions where Supabase's query-result type wasn't resolving cleanly (fixed with explicit type annotations, matching the defensive pattern already used elsewhere in this codebase for the same offline-type-resolution reason). Also fixed a `notFound()` null-narrowing issue on the student detail page. Zero real errors remain — only expected noise from `@types/node`/`@supabase/supabase-js` not being installable offline.
- Brace/paren balance check across all 82 files — clean.
- Dollar-quote balance check across all six SQL files — all even.
- Security greps: confirmed no `"use client"` file imports `SUPABASE_SERVICE_ROLE_KEY`/`STRIPE_SECRET_KEY`/`lib/supabase/admin`/`lib/stripe/server`; confirmed the admin UI itself (`lib/data/admin.ts`, `lib/actions/admin.ts`) uses only the ordinary RLS-scoped server client, never the service-role client; confirmed every new RLS policy in `phase7.sql` is SELECT-only; confirmed `admin_grant_enrollment`/`admin_revoke_enrollment` both check `is_admin()` internally.
- **`npm install` / `npm run build` / `npm run dev` were NOT run** — this sandbox has no network access to the npm registry, reconfirmed immediately before packaging (403 from `registry.npmjs.org`), consistent with every prior phase.

## 7. Anything Requiring Live Verification
- The self-escalation trigger has never fired against a live database — the logic (`if new.role is distinct from old.role and not is_admin(...) then new.role := old.role`) is standard, well-understood plpgsql, but genuinely untested here. **This is the single highest-priority thing to verify before trusting this in production** — see the README's admin testing procedure, step 3, for the exact test.
- No admin account has ever actually been promoted via the documented `UPDATE profiles SET role = 'admin' ...` statement.
- No complimentary enrollment has been granted against a live database — the "already enrolled" duplicate-handling, the `granted_by`/`admin_note` audit fields, and the resulting access to `/courses/ai-101/learn` are all reasoned through, not observed.
- The admin dashboard's aggregate queries (student/enrollment/revenue counts) have not run against real data — the query shapes are believed correct but unverified live.
- Responsive behavior (admin tables on mobile/tablet) has been built with the same patterns as the rest of the app but not visually verified in a real browser.

## 8. Recommended Phase 8 Priorities
1. **Verify the self-escalation trigger and the full admin testing procedure live** — before anything else.
2. An admin-managed "promote another admin" UI (itself gated by `is_admin()`), so a second administrator doesn't require direct SQL access.
3. A refund action in `/admin/orders` that calls Stripe's refund API server-side and lets an admin decide, per-refund, whether to also revoke the associated enrollment — the data model (`orders.status = 'refunded'`, `enrollments.status = 'revoked'`) already supports this; only the UI and the explicit access-on-refund business rule are missing.
4. A lightweight course-authoring UI, now that `/admin/courses` exists as a read-only foundation.

## Refund/Access Status Architecture (Phase 7 brief section 7)
No automatic Stripe refund action exists in Phase 7, per the brief.
`enrollments.status` can now represent `active`, `completed`, `revoked`,
and (already, since Phase 6) `refunded` on the `orders` side —
`enrollments` doesn't yet have an automated path to `'refunded'`
specifically (Phase 6's webhook only ever sets the *order* to
`'refunded'`; it deliberately does not touch the enrollment — see
`PHASE6-NOTES.md` "Refund access policy"). `admin_revoke_enrollment()`
gives an admin a manual, audited way to set an enrollment to `'revoked'`
today. Orders are never altered or deleted when an enrollment's status
changes — `orders` remains the permanent, untouched payment record in
every case.
