import type { MetadataRoute } from "next";
import { appConfig } from "@/server/config";

// SITE_URL is read at runtime (like the sitemap), so changing it needs no rebuild.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/moderation", "/settings", "/notifications", "/defend/", "/prosecute/", "/api/"] }],
    sitemap: `${appConfig.siteUrl}/sitemap.xml`,
  };
}
