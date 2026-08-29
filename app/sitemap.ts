import type { MetadataRoute } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function getBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  return configured ? configured.replace(/\/+$/, "") : "https://NextHorizonAIAcademy.com";
}

const STATIC_ROUTES = [
  "",
  "/about",
  "/courses",
  "/certifications",
  "/corporate-partnerships",
  "/corporate-partnerships/founding-partners",
  "/corporate-partnerships/ai-foundations-pilot",
  "/corporate-partnerships/workforce-readiness",
  "/corporate-partnerships/capability-statement",
  "/corporate-partnerships/inquiry",
  "/career-pathways/salesforce-agentforce",
  "/network",
  "/resources",
  "/contact",
  "/founding-class",
  "/launch-updates",
  "/start-learning",
  "/privacy",
  "/terms",
  "/verify",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
  }));

  // Published course pages — best-effort; a Supabase error here should
  // never break the sitemap route entirely, just fall back to the static
  // list above.
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: courses } = await supabase.from("courses").select("slug").eq("status", "published");
      for (const c of courses ?? []) {
        entries.push({ url: `${base}/courses/${c.slug}`, lastModified: new Date() });
      }
    } catch {
      // Fall through with the static list only.
    }
  }

  return entries;
}
