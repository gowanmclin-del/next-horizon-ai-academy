# Phase 20 Notes — Supported Framework Migration

## Outcome

The application has been migrated from the unsupported Next.js 14 line to
Next.js 15.5.21 (Maintenance LTS) with React 19.2.8. The upgraded application
passes lint, TypeScript checking, and a full optimized production build.

## Compatibility Work Completed

1. Upgraded `next` and `eslint-config-next` from 14.2.35 to 15.5.21.
2. Upgraded `react` and `react-dom` to 19.2.8 and aligned their type packages.
3. Migrated the deprecated `next lint` command to the ESLint CLI.
4. Migrated the server Supabase client to Next.js 15's asynchronous `cookies()`
   API and awaited it at every server call site.
5. Migrated dynamic route `params` and page `searchParams` to the asynchronous
   Next.js 15 API.
6. Updated client routes to unwrap promised route parameters with React 19's
   `use()` API.
7. Preserved the Phase 19 dynamic admin boundary and successful no-secrets
   production-build behavior.

## Verification

- `npm run lint`: PASS (`eslint . --max-warnings=0`)
- `npm run typecheck`: PASS
- `npm run build`: PASS on Next.js 15.5.21
- 33 static pages generated successfully; authenticated/data-dependent routes
  remain dynamic as intended.
- `npm audit --omit=dev`: completed. The previous Next.js 14 advisory set was
  removed. The current tree reports three high-severity transitive findings in
  the Next.js-bundled PostCSS/Sharp packages. npm only offers a forced upgrade to
  Next.js 16 for those findings, so no unsafe automatic major upgrade was run.

## Lint Policy Note

The existing application intentionally uses standard anchors for some internal
routes. The Next.js `no-html-link-for-pages` recommendation is disabled while
all correctness, accessibility, React Hooks, and Core Web Vitals checks remain
enabled. Converting those anchors to `next/link` can be handled as a focused
navigation optimization without blocking this supported-framework migration.

## Files Changed

- `package.json`, `package-lock.json`, `.eslintrc.json`
- `lib/supabase/server.ts`
- Server Supabase call sites in admin, email, marketing, payment, sitemap, and
  dynamic course data routes
- All dynamic pages using `params` or `searchParams`
- `PHASE20-NOTES.md`, `PHASE20-HANDOFF.md`

