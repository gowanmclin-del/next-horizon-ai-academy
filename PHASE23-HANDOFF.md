# Phase 23 Handoff — Corporate Lead Management

## What Phase 23 adds

Phase 23 turns the Phase 22 corporate lead-capture pages into an operational admin pipeline.

### Admin routes
- `/admin/corporate` — corporate partnership pipeline with filtering, pipeline counts, priorities, and follow-up visibility.
- `/admin/corporate/[id]` — lead detail, status/priority management, next follow-up, and internal notes.
- `/admin/corporate/readiness` — AI Workforce Readiness assessment inbox.
- `/admin/corporate/readiness/[id]` — assessment detail and follow-up management.

### Pipeline stages
`new → contacted → qualified → proposal → pilot → partner → closed`

### Lead priority
`low / normal / high / urgent`

### Readiness follow-up
`new → reviewed → contacted → converted → closed`

## Database migration

Run **after Phase 22**:

```sql
supabase/phase23.sql
```

Phase 23:
- adds admin-only read policies for corporate inquiries and readiness assessments;
- adds lead priority, notes, follow-up date, and updated timestamp;
- expands the partnership status constraint to include `pilot` and `partner`;
- adds readiness follow-up fields;
- adds SECURITY DEFINER admin RPCs for controlled updates;
- records pipeline changes in the existing admin audit log;
- adds indexes for pipeline/follow-up queries.

## Deployment order
1. Confirm Phase 22 migration was applied.
2. Run `supabase/phase23.sql` in Supabase SQL Editor.
3. Deploy the Phase 23 application code.
4. Sign in as an existing Academy admin.
5. Open `/admin/corporate`.
6. Submit one test `/organizations/partnership-inquiry` form and confirm it appears as `New`.
7. Change its status/priority, add a follow-up date and notes, then save.
8. Confirm the change persists after refresh.
9. Submit one `/organizations/readiness-assessment` test and verify it appears under `/admin/corporate/readiness`.
10. Update follow-up status and confirm the change persists.
11. Check `/admin/activity` for the corporate/readiness audit entries.

## Verification note
A clean local `npm ci` could not complete in the available execution window, and the subsequent TypeScript command also exceeded the tool timeout. Do not treat this package as release-verified until the normal deployment environment runs:

```bash
npm ci
npm run verify:release
```

No claim of a successful production build is made in this handoff.

## Recommended Phase 24
Add corporate lead notifications and follow-up workflow:
- email alert to Academy leadership when a high-value inquiry arrives;
- optional auto-acknowledgement to the organization;
- due-follow-up dashboard section;
- proposal/pilot value fields so the pipeline can track potential and won revenue;
- export/reporting for outreach and impact metrics.
