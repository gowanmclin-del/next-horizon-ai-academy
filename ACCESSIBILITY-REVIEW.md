# Phase 17 Accessibility Review

## Method
Manual code review against WCAG-relevant patterns — no automated audit
tool (axe, Lighthouse) was available to run in this environment (no
network access, no installed browser automation). Findings are either a
real, applied fix or a specific pattern confirmed acceptable by direct
inspection, not a general "looks fine" assertion.

## 1. Keyboard Accessibility of Custom Components — Found and Fixed

**Finding**: `components/admin/RefundOrderButton.tsx` renders a custom
modal (a `fixed inset-0` overlay) with **no dialog semantics, no
Escape-to-close, no focus trap, and no focus management** on open or
close. A keyboard-only user opening this dialog would have their focus
remain wherever it was before the click, could tab straight past the
dialog into page content behind the overlay, and had no keyboard way to
dismiss it at all (only a mouse click on "Cancel"). This is the **only**
modal-style component in the entire codebase (confirmed by searching for
the `fixed inset-0` pattern across every file) — every other interactive
surface in the app (forms, dropdowns, the mobile nav menus) is a normal
in-flow element with standard tab order, not a custom overlay requiring
special handling.

**Fixed**: added, all in `components/admin/RefundOrderButton.tsx`:
- `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing at the dialog's own heading.
- Focus moves to the dialog's first focusable element when it opens.
- Focus returns to the "Refund" trigger button when the dialog closes (by any method).
- `Escape` closes the dialog.
- Tab/Shift+Tab now cycle within the dialog's own focusable elements while it's open, rather than allowing focus to escape into the page behind it.

This is a self-contained, narrowly-scoped fix to one component — no other
file needed to change, and no existing behavior (the refund confirmation
flow itself) was altered.

## 2. Focus Indicators

**Reviewed, confirmed acceptable — no change made.** A large number of
interactive elements use `focus:outline-none` paired with a compensating
focus style. Ran a script checking every single `outline-none` usage in
the codebase for a paired `focus:border-*`, `focus:ring-*`, or
`focus-visible` class: **every one of the 65 occurrences has a
compensating focus style** — this is a deliberate, consistently-applied
design pattern (swap the default browser outline for a colored border
change on focus), not a set of individually-broken elements. This
satisfies WCAG 2.4.7 (Focus Visible) as a documented judgment call, not
an oversight — though a future phase could consider adding a `box-shadow`
ring in addition to the border-color change for higher visual contrast,
which would be an enhancement, not a fix for a defect.

## 3. Color Contrast

**Reviewed at the code level, not measured with a contrast-ratio tool**
(none was available in this environment). The academy's core palette
(`horizon-navy` `#0F172A` on white/`horizon-cloud` `#F8FAFC` backgrounds,
white text on `horizon-navy`/`horizon-blue` `#2563EB` backgrounds) are all
high-contrast combinations by visual inspection and by the hex values
themselves (very dark navy text on near-white backgrounds, and white text
on colors dark enough to read clearly) — but this is not a substitute for
an actual measured contrast ratio. **Flagged as unverified, not
confirmed compliant**, rather than asserting a pass without a real
measurement. Recommend running a real contrast checker (e.g. the axe
browser extension, or WebAIM's contrast checker against the specific hex
pairs) as part of the live verification this project has needed since
Phase 4.

## 4. ARIA Labels on Interactive Controls

Checked every collapsible/toggle button in the codebase:
- `components/Header.tsx`'s mobile menu button — has `aria-label`, `aria-expanded`, `aria-controls`. Confirmed correct, unchanged.
- `components/dashboard/DashboardNav.tsx`'s mobile menu button — has `aria-expanded`, `aria-controls`. Confirmed correct, unchanged.
- `components/learn/CourseSidebar.tsx`'s mobile "Course Menu" toggle — has `aria-expanded`; no separate `aria-label` needed since the button has its own visible text ("Course Menu" / "Hide Course Menu"), which already provides an accessible name.
- `components/admin/AdminNav.tsx` — no collapsible toggle exists at all (uses `flex-wrap` for responsive layout rather than a hamburger menu), so there was nothing to check here.

No gap found in this category.

## 5. Semantic HTML & Heading Hierarchy

Spot-checked the homepage, dashboard, and a representative admin page.
Each uses a single `<h1>` (via `PageHero`'s title prop, or the page's own
top-level heading in the dashboard/admin layouts) with `<h2>`s for major
sections and `<h3>`s where a section has sub-groupings — consistent,
correctly nested hierarchy in the pages checked. A full page-by-page audit
of all ~40 routes was not performed given this phase's time constraints;
this is a sampling, not exhaustive coverage.

## 6. Images and Alternative Text

**No raw `<img>` tag exists anywhere in the codebase** (confirmed by
grep, consistent with the same finding in Phase 14) — the entire visual
design is CSS/Tailwind-based. The one `role="img"` element in the app
(the founder-photo placeholder in `components/FounderSection.tsx`) has an
explicit, descriptive `aria-label`. When a real photo is eventually added
(see the inline instructions added to that component this phase), the
`next/image` snippet provided already includes a proper `alt` attribute.
No gap found.

## Summary

One real, meaningful accessibility defect was found and fixed (the
refund confirmation modal's complete lack of keyboard/focus-management
support) — this was a genuine gap that would have actually blocked a
keyboard-only admin from safely using that specific feature. Everything
else reviewed was either already correct (ARIA on nav toggles, alt text,
heading structure in the pages sampled) or is honestly flagged as
unverified rather than asserted (color contrast, without a real
measurement tool).
