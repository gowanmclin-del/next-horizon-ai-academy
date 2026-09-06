# Phase 22 — Corporate Partnership Launch Module

Added a complete organization-facing funnel without changing the student purchase/enrollment flow.

## New public routes
- `/organizations` — corporate partnership landing page
- `/organizations/founding-partners` — Founding Corporate Partner Program
- `/organizations/ai-foundations-pilot` — AI Foundations Pilot
- `/organizations/readiness-assessment` — scored workforce readiness assessment
- `/organizations/capability-statement` — printable one-page capability statement
- `/organizations/partnership-inquiry` — corporate inquiry form

## Data changes
Run `supabase/phase22.sql` after prior migrations. It adds two write-only public lead tables:
- `corporate_partnership_inquiries`
- `ai_readiness_assessments`

## Important launch note
The forms require the existing Supabase public environment configuration. If Supabase is not configured, they fail safely with a user-facing message instead of losing a submission silently.

## Suggested owner checks
1. Apply `supabase/phase22.sql` in Supabase SQL Editor.
2. Deploy to preview/staging.
3. Submit one readiness assessment and one partnership inquiry.
4. Confirm rows appear in Supabase.
5. Verify mobile layout and keyboard accessibility.
6. Use the browser print dialog on `/organizations/capability-statement` and confirm it fits acceptably on one page; adjust print scaling if needed.
7. Replace proposal-based copy with final corporate pricing only after delivery scope is finalized.
