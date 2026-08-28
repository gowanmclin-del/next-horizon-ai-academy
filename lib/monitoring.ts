// ---------------------------------------------------------------------------
// ERROR MONITORING (Phase 14)
// ---------------------------------------------------------------------------
// No external monitoring SDK is installed in this environment (no network
// access to add one — see PHASE14-NOTES.md). This file is the same
// graceful-degradation shape already used for Resend (lib/email/resend.ts)
// and Stripe: it works today (logs to the server console, which every
// hosting platform captures), and becomes a real integration later by
// filling in the dynamic import below — no call site changes needed.
//
// Safe to import from both client and server code. Never throws; a
// monitoring failure must never break the feature that triggered it.
// ---------------------------------------------------------------------------

export function isErrorMonitoringConfigured(): boolean {
  // Checked as a generic name rather than a specific vendor's env var,
  // since no vendor is chosen yet. Rename to match whichever provider is
  // actually adopted (e.g. SENTRY_DSN) when this is wired up for real.
  return Boolean(process.env.ERROR_MONITORING_DSN || process.env.NEXT_PUBLIC_ERROR_MONITORING_DSN);
}

interface ReportContext {
  route?: string;
  digest?: string;
  extra?: Record<string, unknown>;
}

export function reportError(error: unknown, context: ReportContext = {}): void {
  // Always log server-side (or to the browser console client-side) — this
  // is the one thing that works with zero configuration, and every major
  // hosting platform (Vercel, etc.) captures server console output.
  console.error("[error]", context.route ? `[${context.route}]` : "", error, context.extra ?? "");

  if (!isErrorMonitoringConfigured()) return;

  // Placeholder for a real provider. Intentionally not implemented against
  // a specific SDK since none is installed — see PHASE14-NOTES.md
  // "Error monitoring" for what to fill in here once one is chosen
  // (e.g. dynamically importing @sentry/nextjs and calling captureException).
}
