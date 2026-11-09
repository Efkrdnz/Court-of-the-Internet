import "server-only";
import { db } from "./db";
import { clock } from "./clock";
import { CourtError } from "./errors";

/**
 * Fixed-window rate limiter stored in Postgres, so it holds across server
 * instances. One atomic upsert per check.
 */
export async function hitRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = clock.now();
  const windowFloor = new Date(now.getTime() - windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count")
    VALUES (${key}, ${now}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" <= ${windowFloor} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" <= ${windowFloor} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "count", "windowStart"`;
  const row = rows[0];
  const count = Number(row.count);
  const resetAt = new Date(new Date(row.windowStart).getTime() + windowSeconds * 1000);
  return { allowed: count <= limit, count, remaining: Math.max(0, limit - count), resetAt };
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  message = "Order in the court! You're doing that too fast. Try again in a moment.",
) {
  if (process.env.DISABLE_RATE_LIMITS === "1") return;
  const result = await hitRateLimit(key, limit, windowSeconds);
  if (!result.allowed) throw new CourtError("RATE_LIMITED", message);
}

/**
 * Read-only check: throws if `key` has already used up `limit` in the current window, without
 * counting this request. Pair with hitRateLimit() to count only the attempts that should count
 * (e.g. failed logins).
 */
export async function assertUnderLimit(key: string, limit: number, windowSeconds: number, message: string) {
  if (process.env.DISABLE_RATE_LIMITS === "1") return;
  const floor = new Date(clock.now().getTime() - windowSeconds * 1000);
  const row = await db.rateLimit.findUnique({ where: { key }, select: { count: true, windowStart: true } });
  if (row && row.windowStart > floor && row.count >= limit) throw new CourtError("RATE_LIMITED", message);
}

/** Periodic cleanup of stale windows. */
export async function pruneRateLimits(olderThanSeconds = 86_400) {
  const cutoff = new Date(clock.now().getTime() - olderThanSeconds * 1000);
  await db.rateLimit.deleteMany({ where: { windowStart: { lt: cutoff } } });
}
