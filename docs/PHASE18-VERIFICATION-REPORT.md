# Phase 18 Verification Report

Exact commands run, exact results. Nothing here is claimed to have passed
unless it actually did.

## Environment

- Node: v22.22.2
- npm: 10.9.7
- This sandbox has no network access to the npm registry (confirmed with a fresh attempt during this phase — see below). This has been true in every phase of this project.

## `npm install`

**Command:** `npm install`

**Result:** Failed.

```
npm error code E403
npm error 403 403 Forbidden - GET https://registry.npmjs.org/@supabase%2fssr
npm error 403 In most cases, you or one of your dependencies are requesting
npm error 403 a package version that is forbidden by your security policy, or
npm error 403 on a server you do not have access to.
```

No `node_modules` directory exists. No `package-lock.json` was generated.

## `npm run typecheck`

**Command:** `npm run typecheck` (runs `tsc --noEmit`)

**Result:** Ran (unlike lint/build below), but against zero installed
dependencies. `npm run <script>` falls back to a `tsc` binary found on the
system `PATH` when none exists in `node_modules/.bin` — in this sandbox
that's a standalone global TypeScript install (v6.0.3), not this
project's pinned `^5.5.3`. It read the project's own real `tsconfig.json`
(auto-discovered, since no `-p` flag is passed), producing 3,231 error
lines.

**Important correction to how this project has reported typecheck
results in every phase before this one:** in Phases 9 through 17, I
substituted a *custom* `tsconfig.check.json` (using `"jsx": "react-jsx"`)
for this same global `tsc` binary, rather than running the project's
real `tsconfig.json` directly. That substitute happened to mask a whole
category of noise that the project's *actual* configuration
(`"jsx": "preserve"`, the standard Next.js setting, which relies on the
`next` TypeScript plugin and `@types/react`'s JSX namespace augmentation
to resolve implicit children from JSX nesting) surfaces instead. Running
the real `npm run typecheck` script for the first time in this phase
exposed that gap in my own prior verification process.

**What the 3,231 raw error lines actually break down to, after filtering
the same well-understood missing-package categories this project has
excluded since Phase 9** (`TS7026`, `TS2307`, `TS2503`, `TS2591`,
`TS7006`, `TS7031`, `TS2688`, "Cannot find module", etc. — all caused by
`@types/node`, `@types/react`, `next`, `@supabase/*`, `stripe`, `tailwindcss`
being uninstallable here): **41 lines remain**, every single one of which
is one of exactly two patterns:

1. **`TS2741: Property 'children' is missing`** (36 instances) — every one is a component invoked with children passed via ordinary JSX nesting (e.g. `<DevBanner>text</DevBanner>`, `<StatusMessage tone="error">text</StatusMessage>`), which is completely standard, valid React. TypeScript can only correctly recognize this pattern with `@types/react`'s JSX namespace augmentation present — without it, under `"jsx": "preserve"` specifically, it falls back to structural-only prop checking and doesn't see the nested children as satisfying the `children` prop.
2. **`TS2322` on a `key` prop** (5 instances, in `components/admin/CourseBuilder.tsx` and three dashboard pages) — the same `key`-prop artifact documented and re-confirmed unchanged in every phase since Phase 9, for the identical reason (no `@types/react`).

**Confirmed by direct inspection: zero errors exist outside these two
categories.** Both are consequences of the same missing dependency
(`@types/react`), manifesting differently depending on which `jsx`
compiler setting is in effect — not two different problems, and not a
real code defect either way. No source file was changed in response to
these; changing working, standard React code to work around a
missing-type-declaration artifact would make the code worse, not better.

**Honest bottom line:** this is still not equivalent to `npm run
typecheck` passing for real. It is stronger evidence than my prior
substitute checks, because it now uses the project's actual
`tsconfig.json`, but it is not proof — a real run with `@types/react`,
`@types/node`, and `next` actually installed is the only way to know for
certain.

## `npm run lint`

**Command:** `npm run lint` (runs `next lint`)

**Result:** Failed immediately.

```
sh: 1: next: not found
```

No lint output was produced. Cannot claim ESLint passes.

## `npm run build`

**Command:** `npm run build` (runs `next build`)

**Result:** Failed immediately.

```
sh: 1: next: not found
```

No build output was produced. **Cannot claim the application builds.**

## `npm audit --omit=dev`

**Command:** `npm audit --omit=dev`

**Result:** Failed — requires a lockfile that only a successful `npm install` produces.

```
npm error code ENOLOCK
npm error audit This command requires an existing lockfile.
npm error audit Try creating one first with: npm i --package-lock-only
npm error audit Original error: loadVirtual requires existing shrinkwrap file
```

No dependency vulnerability data was produced.

## Static checks performed as substitutes (not equivalent to the commands above)

- Brace/paren balance across all `.ts`/`.tsx` files plus `middleware.ts` — clean, no imbalance.
- Byte-for-byte `diff` of all twelve prior SQL migration files against the pre-Phase-18 versions — confirmed unchanged; only `supabase/phase18.sql` was added.
- Manual code review of the reorder-function fix, the three `Promise.all` sites, and the refund dialog's accessibility behavior (see `PHASE18-NOTES.md`).

## What This Report Does Not Claim

- That `npm run build` would succeed with real dependencies installed.
- That ESLint would report zero errors on a real run.
- That any dependency has zero known vulnerabilities — `npm audit` never ran.
- That the 41 filtered TypeScript error lines are the *only* thing a real, fully-dependency-installed typecheck would report — they are the only thing *this* run reported after excluding well-understood missing-package noise, which is a narrower claim.
