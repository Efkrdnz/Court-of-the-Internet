import type { MetadataRoute } from "next";
import { appConfig } from "@/server/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/moderation", "/settings", "/notifications", "/defend/", "/prosecute/", "/api/"] }],
    sitemap: `${appConfig.siteUrl}/sitemap.xml`,
  };
}
