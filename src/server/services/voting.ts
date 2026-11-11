import "server-only";
import type { VoteChoice } from "@prisma/client";
import { db } from "../db";
import { clock } from "../clock";
import { CourtError, isCourtError } from "../errors";
import { DELIBERATION_TIME_UP, castVote } from "./cases";
import { refreshCase } from "./maintenance";

/**
 * A vote that lands just after the trial's time ran out: whether that means a verdict or the
 * low-participation extension is only settled when the court rules. So rule now, then count the
 * vote if the trial was extended, or say a verdict was read (audit 70 D1: jurors were told
 * "deliberation has closed" about trials that were then extended).
 */
export async function castVoteRuling(userId: string, caseId: string, choice: VoteChoice) {
  try {
    return await castVote(userId, caseId, choice);
  } catch (e) {
    if (!isCourtError(e) || e.message !== DELIBERATION_TIME_UP) throw e;
  }
  await refreshCase(caseId);
  const after = await db.case.findUnique({ where: { id: caseId }, select: { status: true, deliberationEndsAt: true } });
  if (after?.status === "DELIBERATION" && after.deliberationEndsAt && after.deliberationEndsAt > clock.now()) {
    return castVote(userId, caseId, choice);
  }
  throw new CourtError(
    "INVALID_STATE",
    after?.status === "CLOSED" ? "Deliberation has closed: the verdict has been read. Reload to see it." : "Deliberation has closed. Reload to see what the court decided.",
  );
}
