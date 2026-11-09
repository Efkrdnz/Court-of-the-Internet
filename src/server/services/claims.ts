import "server-only";
import type { Tx } from "../db";
import { clock } from "../clock";
import { formatCaseNumber } from "@/lib/text";
import { notify } from "./progress";

/**
 * Puts every case matching `where` that is currently claimed back on its docket and closes
 * out the claim records. Used whenever a holder (or the case) leaves play for a reason other
 * than filing: a moderator seals the case, the holder is banned, or the holder deletes their
 * account. Leaving a case "claimed" with no holder would block it forever.
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
  for (const h of held) {
    await tx.case.update({
      where: { id: h.id },
      data: { status: h.status === "DEFENSE_CLAIMED" ? "AWAITING_DEFENSE" : "AWAITING_PROSECUTION", claimedById: null, claimExpiresAt: null },
    });
    await tx.caseClaim.updateMany({ where: { caseId: h.id, outcome: "ACTIVE" }, data: { outcome: "RELEASED", resolvedAt: now } });
    if (holderNotice && h.claimedById) await notify(tx, h.claimedById, { type: "MODERATION", ...holderNotice(h.number) });
  }
  return held.length;
}

export const sealedCaseNotice = (n: number) => ({
  title: `Your claim on Case No. ${formatCaseNumber(n)} was released`,
  body: "A moderator sealed the case, so it can't be argued right now. Your claim slot is free again.",
});
