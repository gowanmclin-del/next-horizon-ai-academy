"use client";

// ---------------------------------------------------------------------------
// ANALYTICS (Phase 14)
// ---------------------------------------------------------------------------
// No analytics provider is installed in this environment. This wrapper is
// inert by default: track() is always safe to call, and does nothing at
// all — no script loads, no request fires, no cookie is set — unless
// NEXT_PUBLIC_ANALYTICS_ID is explicitly configured. This is a deliberate
// privacy-by-default choice, not just a placeholder: the academy should
// decide on a provider and, if it requires cookie consent in the
// jurisdictions it operates in, add a consent mechanism before this is
// ever turned on for real. See PHASE14-NOTES.md "Analytics."
// ---------------------------------------------------------------------------

export function isAnalyticsConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ANALYTICS_ID);
}

type AnalyticsEvent =
  | "signup_completed"
  | "enrollment_started"
  | "enrollment_completed"
  | "assessment_passed"
  | "certificate_issued";

export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}): void {
  if (!isAnalyticsConfigured()) return;

  // Placeholder for a real provider (Plausible, PostHog, GA4, etc.) once
  // one is chosen — intentionally not implemented against a specific SDK
  // since none is installed here. Fill in below; every call site in the
  // app already calls track(), so no call-site changes will be needed.
  if (process.env.NODE_ENV !== "production") {
    console.log("[analytics]", event, properties);
  }
}
