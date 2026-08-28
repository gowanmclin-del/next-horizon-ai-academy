// Used only from server-side code (Server Actions / lib/email) to build
// absolute links inside transactional emails. Never hardcodes localhost or
// a guessed production domain — if NEXT_PUBLIC_SITE_URL isn't set, callers
// get null back and should omit the CTA button/link rather than emit a
// broken or misleading URL.
export function getSiteUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) return null;
  return url.replace(/\/+$/, ""); // strip trailing slash
}

export function buildSiteUrl(path: string): string | null {
  const base = getSiteUrl();
  if (!base) return null;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

// ---------------------------------------------------------------------------
// STRICT VALIDATION FOR STRIPE CHECKOUT (Phase 16)
// ---------------------------------------------------------------------------
// Stripe Checkout Sessions require absolute success_url/cancel_url values —
// a relative path is silently wrong (Stripe will reject the request, or in
// some SDK versions throw at request-build time). Phase 15 shipped a bug
// here: buildSiteUrl() returning null (unset/misconfigured site URL) fell
// back to a *relative* path instead of failing loudly. This function is the
// fix — used only by lib/actions/payments.ts, and deliberately stricter
// than getSiteUrl()/buildSiteUrl() above (which are fine for email links,
// where "omit the CTA" is an acceptable degradation; silently starting a
// Stripe Checkout Session that can never correctly redirect the student
// back is not).
function isLocalhostHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export type SiteUrlValidation = { ok: true; origin: string } | { ok: false; error: string };

export function getValidatedSiteUrlForCheckout(): SiteUrlValidation {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw || !raw.trim()) {
    return {
      ok: false,
      error: "NEXT_PUBLIC_SITE_URL is not configured. Checkout requires a valid absolute application URL — see .env.example.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, error: "NEXT_PUBLIC_SITE_URL is not a valid URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "NEXT_PUBLIC_SITE_URL must start with http:// or https://." };
  }

  const isProduction = process.env.NODE_ENV === "production";

  // http:// (and localhost) are allowed in non-production environments —
  // this is the normal, expected way to test Stripe checkout locally
  // during development (e.g. with `stripe listen` forwarding webhooks to
  // http://localhost:3000). Neither is acceptable once actually deployed.
  if (isProduction && parsed.protocol !== "https:") {
    return { ok: false, error: "NEXT_PUBLIC_SITE_URL must use https:// in production." };
  }
  if (isProduction && isLocalhostHostname(parsed.hostname)) {
    return { ok: false, error: "NEXT_PUBLIC_SITE_URL cannot be localhost in production." };
  }

  // Normalize to just the origin — drops any accidental trailing path,
  // query string, or fragment the owner might have pasted in by mistake.
  const origin = `${parsed.protocol}//${parsed.host}`;
  return { ok: true, origin };
}
