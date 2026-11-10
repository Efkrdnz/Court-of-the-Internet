import "server-only";
import type { Tx } from "../db";
import { clock } from "../clock";
import { formatCaseNumber } from "@/lib/text";
import { notify } from "./progress";

/**
 * Puts every case matching `where` that is currently claimed back on its docket and closes
 * out the claim records. Used whenever a holder (or the case) leaves play for a reason other
 * than filing: a moderator seals the case, the holder is banned, or the holder deletes their
 * account. Those claims are VOIDED (not RELEASED), so they don't count against the holder's
 * per-case claim limit. Leaving a case "claimed" with no holder would block it forever.
 */
export async function releaseClaims(
  tx: Tx,
  where: { caseId: string } | { userId: string },
  holderNotice?: (caseNumber: number) => { title: string; body: string; href?: string },
) {
  const held = await tx.case.findMany({
    where: {
      status: { in: ["DEFENSE_CLAIMED", "PROSECUTION_CLAIMED"] },
      ...("caseId" in where ? { id: where.caseId } : { claimedById: where.userId }),
    },
    select: { id: true, number: true, status: true, claimedById: true },
  });
  const now = clock.now();
  let released = 0;
  for (const h of held) {
    // Conditional on the state we read: if the holder's filing commits in the meantime, this
    // update re-checks after the row lock, matches nothing, and leaves the filed case alone.
    // (An unconditional write here once sent cases with a filed defense back to the docket.)
    const res = await tx.case.updateMany({
      where: { id: h.id, status: h.status, claimedById: h.claimedById },
      data: { status: h.status === "DEFENSE_CLAIMED" ? "AWAITING_DEFENSE" : "AWAITING_PROSECUTION", claimedById: null, claimExpiresAt: null },
    });
    if (res.count === 0) continue;
    released++;
    await tx.caseClaim.updateMany({ where: { caseId: h.id, outcome: "ACTIVE" }, data: { outcome: "VOIDED", resolvedAt: now } });
    if (holderNotice && h.claimedById) await notify(tx, h.claimedById, { type: "MODERATION", ...holderNotice(h.number) });
  }
  return released;
}

export const sealedCaseNotice = (n: number) => ({
  title: `Your claim on Case No. ${formatCaseNumber(n)} was released`,
  body: "A moderator sealed the case, so it can't be argued right now. Your claim slot is free again.",
});
