import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { appConfig } from "@/server/config";
import { casePath } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appConfig.siteUrl;
  const cases = await db.case.findMany({
    where: { status: "CLOSED", moderationState: "VISIBLE" },
    orderBy: { closedAt: "desc" },
    take: 5000,
    select: { number: true, slug: true, closedAt: true },
  });
  return [
    ...["", "/archives", "/leaderboards", "/jury", "/defend", "/prosecute", "/confess", "/rules"].map((p) => ({ url: `${base}${p}` })),
    ...cases.map((c) => ({ url: `${base}${casePath(c)}`, lastModified: c.closedAt ?? undefined })),
  ];
}
