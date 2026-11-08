import { timingSafeEqual } from "node:crypto";
import { appConfig } from "@/server/config";
import { runMaintenanceNow } from "@/server/services/maintenance";
import { pruneRateLimits } from "@/server/rate-limit";

/**
 * Production scheduler hook (e.g. Vercel Cron, GitHub Actions, cron + curl):
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/maintenance
 * Expires abandoned claims and closes finished deliberations.
 */
function authorized(req: Request): boolean {
  const secret = appConfig.cronSecret;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handle(req: Request) {
  if (!appConfig.cronSecret) return Response.json({ error: "CRON_SECRET is not configured" }, { status: 404 });
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runMaintenanceNow();
  await pruneRateLimits();
  return Response.json({ ok: true, ...result });
}

export const POST = handle;
export const GET = handle; // Vercel Cron issues GET requests
