import "server-only";
import type { Tx } from "../db";
import { clock } from "../clock";

/**
 * Dismisses one player's open reports on a case whose row the caller has locked, and keeps
 * the case's reporter count in step. Used when the reporter is banned or deletes their account,
 * so their reports stop counting toward the queue and auto-review.
 */
export async function dismissReporterOnLockedCase(tx: Tx, caseId: string, reporterId: string) {
  await tx.report.updateMany({ where: { caseId, reporterId, status: "OPEN" }, data: { status: "DISMISSED", resolvedAt: clock.now() } });
  const stillOpen = await tx.report.findMany({ where: { caseId, status: "OPEN" }, select: { reporterId: true }, distinct: ["reporterId"] });
  await tx.case.update({ where: { id: caseId }, data: { openReports: stillOpen.length } });
}

/** Dismisses all of a player's open reports, locking each case in ascending id order. */
export async function withdrawOpenReports(tx: Tx, reporterId: string) {
  const reports = await tx.report.findMany({ where: { reporterId, status: "OPEN" }, select: { caseId: true }, distinct: ["caseId"], orderBy: { caseId: "asc" } });
  for (const { caseId } of reports) {
    await tx.$queryRaw`SELECT "id" FROM "Case" WHERE "id" = ${caseId} FOR UPDATE`;
    await dismissReporterOnLockedCase(tx, caseId, reporterId);
  }
}
