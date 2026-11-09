import "server-only";
import { pruneRateLimits } from "../rate-limit";
import type { ArgumentRole } from "@prisma/client";
import { db } from "../db";
import { clock } from "../clock";
import { gameConfig } from "../config";
import { formatCaseNumber } from "@/lib/text";
import { CLAIMED_STATUS, OPEN_STATUS } from "./cases";
import { closeDeliberation } from "./verdict";
import { notify } from "./progress";

/** Returns abandoned claims (past expiry + grace) to the docket. */
export async function expireStaleClaims(limit = 100): Promise<number> {
  const now = clock.now();
  const cutoff = new Date(now.getTime() - gameConfig.claimGraceMs);
  const stale = await db.case.findMany({
    where: { status: { in: ["DEFENSE_CLAIMED", "PROSECUTION_CLAIMED"] }, claimExpiresAt: { lt: cutoff } },
    select: { id: true, number: true, status: true, claimedById: true },
    take: limit,
  });
  let expired = 0;
  for (const c of stale) {
    const role: ArgumentRole = c.status === "DEFENSE_CLAIMED" ? "DEFENSE" : "PROSECUTION";
    const done = await db.$transaction(async (tx) => {
      const res = await tx.case.updateMany({
        where: { id: c.id, status: CLAIMED_STATUS[role], claimedById: c.claimedById, claimExpiresAt: { lt: cutoff } },
        data: { status: OPEN_STATUS[role], claimedById: null, claimExpiresAt: null },
      });
      if (res.count === 0) return false;
      await tx.caseClaim.updateMany({
        where: { caseId: c.id, role, outcome: "ACTIVE" },
        data: { outcome: "EXPIRED", resolvedAt: now },
      });
      if (c.claimedById) {
        await notify(tx, c.claimedById, {
          type: "CLAIM_EXPIRED",
          title: `Your claim on Case No. ${formatCaseNumber(c.number)} expired`,
          body: "You ran out of time, so the case went back on the docket. Better luck next trial!",
          href: role === "DEFENSE" ? "/defend" : "/prosecute",
        });
      }
      return true;
    });
    if (done) expired++;
  }
  return expired;
}

export async function closeDueDeliberations(limit = 50) {
  const now = clock.now();
  const due = await db.case.findMany({
    where: { status: "DELIBERATION", moderationState: "VISIBLE", deliberationEndsAt: { lte: now } },
    select: { id: true },
    orderBy: { deliberationEndsAt: "asc" },
    take: limit,
  });
  const results = { closed: 0, extended: 0 };
  for (const { id } of due) {
    const outcome = await closeDeliberation(id);
    if (outcome.kind === "closed") results.closed++;
    if (outcome.kind === "extended") results.extended++;
  }
  return results;
}

export async function runMaintenanceNow() {
  const expired = await expireStaleClaims();
  const { closed, extended } = await closeDueDeliberations();
  return { expired, closed, extended };
}

const globalForMaintenance = globalThis as unknown as { lastMaintenance?: number; lastPrune?: number; maintenanceRunning?: Promise<unknown> };

/**
 * Throttled maintenance for page loads: at most every 20 seconds per process.
 * Failures are logged, never surfaced to the page.
 */
export async function runMaintenance() {
  const now = Date.now();
  if (globalForMaintenance.maintenanceRunning) return;
  if (globalForMaintenance.lastMaintenance && now - globalForMaintenance.lastMaintenance < 20_000) return;
  globalForMaintenance.lastMaintenance = now;
  // Old rate-limit windows (and view-dedupe keys) are pruned hourly from here too, so the table
  // stays small even when the cron endpoint isn't configured.
  const prune = !globalForMaintenance.lastPrune || now - globalForMaintenance.lastPrune > 3_600_000;
  if (prune) globalForMaintenance.lastPrune = now;
  globalForMaintenance.maintenanceRunning = Promise.all([runMaintenanceNow(), prune ? pruneRateLimits() : null])
    .catch((e) => console.error("[maintenance] failed", e))
    .finally(() => {
      globalForMaintenance.maintenanceRunning = undefined;
    });
  await globalForMaintenance.maintenanceRunning;
}

/** Bring a single case up to date before rendering it. */
export async function refreshCase(caseId: string) {
  const c = await db.case.findUnique({
    where: { id: caseId },
    select: { status: true, deliberationEndsAt: true, claimExpiresAt: true },
  });
  if (!c) return;
  const now = clock.now();
  if (c.status === "DELIBERATION" && c.deliberationEndsAt && c.deliberationEndsAt <= now) {
    await closeDeliberation(caseId).catch((e) => console.error("[refreshCase] close failed", e));
  }
  if (
    (c.status === "DEFENSE_CLAIMED" || c.status === "PROSECUTION_CLAIMED") &&
    c.claimExpiresAt &&
    c.claimExpiresAt.getTime() + gameConfig.claimGraceMs < now.getTime()
  ) {
    await expireStaleClaims().catch((e) => console.error("[refreshCase] expire failed", e));
  }
}
