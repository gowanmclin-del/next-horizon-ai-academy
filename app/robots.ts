import type { MetadataRoute } from "next";

function getBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  return configured ? configured.replace(/\/+$/, "") : "https://NextHorizonAIAcademy.com";
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/api", "/login", "/signup", "/forgot-password", "/reset-password"],
    },
    sitemap: `${getBaseUrl()}/sitemap.xml`,
  };
}
