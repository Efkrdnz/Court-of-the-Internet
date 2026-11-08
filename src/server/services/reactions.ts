import "server-only";
import type { ReactionType } from "@prisma/client";
import { db } from "../db";
import { clock } from "../clock";
import { CourtError, isUniqueViolation } from "../errors";
import { REACTION_COUNTER_FIELD, reactionWeight } from "@/lib/reactions";
import { assertActiveUser, grantAchievements } from "./progress";

export const LEGENDARY_THRESHOLD = 10;

/** Toggles a reaction. Returns whether it is now active and the new counts. */
export async function toggleReaction(userId: string, caseId: string, type: ReactionType) {
  try {
    return await db.$transaction(async (tx) => {
      await assertActiveUser(tx, userId);
      const c = await tx.case.findUnique({
        where: { id: caseId },
        select: { status: true, moderationState: true, accusedId: true, attorneyId: true, prosecutorId: true, anonymous: true },
      });
      if (!c || c.moderationState !== "VISIBLE") throw new CourtError("NOT_FOUND", "That case could not be found.");
      if (c.status !== "DELIBERATION" && c.status !== "CLOSED") {
        throw new CourtError("INVALID_STATE", "Reactions open once both sides have argued.");
      }
      if ([c.accusedId, c.attorneyId, c.prosecutorId].includes(userId)) {
        throw new CourtError("INELIGIBLE", "You can't react to your own case. Let the public decide how funny you are.");
      }
      const field = REACTION_COUNTER_FIELD[type];
      const weight = reactionWeight(type);
      const existing = await tx.reaction.findUnique({
        where: { caseId_userId_type: { caseId, userId, type } },
        select: { id: true },
      });
      if (existing) {
        await tx.reaction.delete({ where: { id: existing.id } });
        await tx.$executeRawUnsafe(
          `UPDATE "Case" SET "${field}" = GREATEST(0, "${field}" - 1), "reactionScore" = GREATEST(0, "reactionScore" - $1) WHERE "id" = $2`,
          weight,
          caseId,
        );
      } else {
        await tx.reaction.create({ data: { caseId, userId, type, createdAt: clock.now() } });
        await tx.case.update({
          where: { id: caseId },
          data: { [field]: { increment: 1 }, reactionScore: { increment: weight } },
        });
      }
      const counts = await tx.case.findUniqueOrThrow({
        where: { id: caseId },
        select: { hilariousCount: true, outrageousCount: true, legendaryCount: true, relatableCount: true },
      });
      if (!existing && type === "LEGENDARY" && counts.legendaryCount >= LEGENDARY_THRESHOLD) {
        const honorees = [c.anonymous ? null : c.accusedId, c.attorneyId, c.prosecutorId].filter(Boolean) as string[];
        for (const id of honorees) await grantAchievements(tx, id, ["legendary-litigator"], caseId);
      }
      return { active: !existing, counts };
    });
  } catch (e) {
    // Double-click race: the other request already inserted the row.
    if (isUniqueViolation(e)) {
      const counts = await db.case.findUniqueOrThrow({
        where: { id: caseId },
        select: { hilariousCount: true, outrageousCount: true, legendaryCount: true, relatableCount: true },
      });
      return { active: true, counts };
    }
    throw e;
  }
}
