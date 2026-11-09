import "server-only";
import type { Verdict } from "@prisma/client";
import { db, type Tx } from "../db";
import { clock } from "../clock";
import { gameConfig } from "../config";
import { REPUTATION, XP } from "@/lib/progression";
import { casePath } from "@/lib/text";
import { adjustReputation, awardXp, checkStatAchievements, grantAchievements, notify } from "./progress";

/** Pure verdict rule. Exported for unit tests. */
export function decideVerdict(guilty: number, notGuilty: number, quorum: number): Verdict | "BELOW_QUORUM" {
  if (guilty + notGuilty < quorum) return "BELOW_QUORUM";
  if (guilty > notGuilty) return "GUILTY";
  if (notGuilty > guilty) return "NOT_GUILTY";
  return "MISTRIAL";
}

export function controversyScore(guilty: number, notGuilty: number): number {
  const total = guilty + notGuilty;
  return total === 0 ? 0 : 1 - Math.abs(guilty - notGuilty) / total;
}

export type CloseOutcome =
  | { kind: "not-due" }
  | { kind: "extended"; endsAt: Date }
  | { kind: "closed"; verdict: Verdict; guilty: number; notGuilty: number };

/**
 * Closes a deliberation whose window has ended. Idempotent and safe to call
 * concurrently: every state change is a conditional update.
 */
export async function closeDeliberation(caseId: string): Promise<CloseOutcome> {
  return db.$transaction(
    async (tx) => {
      // Lock the case row before counting. A vote takes the same row lock (its conditional counter
      // update) before inserting its Vote row, so in-flight votes finish first and are counted,
      // and later ones find the case closed. Without this, a vote committed mid-close was
      // accepted but missing from the stored tally.
      await tx.$queryRaw`SELECT "id" FROM "Case" WHERE "id" = ${caseId} FOR UPDATE`;
      const now = clock.now();
      const c = await tx.case.findUnique({
        where: { id: caseId },
        select: {
          id: true,
          number: true,
          slug: true,
          title: true,
          status: true,
          anonymous: true,
          accusedId: true,
          attorneyId: true,
          prosecutorId: true,
          deliberationEndsAt: true,
          extensionsUsed: true,
          moderationState: true,
        },
      });
      // Sealed or under-review trials are paused: no verdict, no payouts until a moderator acts.
      if (!c || c.status !== "DELIBERATION" || c.moderationState !== "VISIBLE" || !c.deliberationEndsAt || c.deliberationEndsAt > now) {
        return { kind: "not-due" } as const;
      }

      // The source of truth is the Vote table, not the denormalised counters.
      const grouped = await tx.vote.groupBy({ by: ["choice"], where: { caseId }, _count: { _all: true } });
      const guilty = grouped.find((g) => g.choice === "GUILTY")?._count._all ?? 0;
      const notGuilty = grouped.find((g) => g.choice === "NOT_GUILTY")?._count._all ?? 0;
      const decision = decideVerdict(guilty, notGuilty, gameConfig.quorum);

      if (decision === "BELOW_QUORUM" && c.extensionsUsed < gameConfig.maxExtensions) {
        const endsAt = new Date(now.getTime() + gameConfig.extensionMs);
        const res = await tx.case.updateMany({
          where: { id: caseId, status: "DELIBERATION", deliberationEndsAt: c.deliberationEndsAt },
          data: { deliberationEndsAt: endsAt, extensionsUsed: { increment: 1 } },
        });
        if (res.count === 0) return { kind: "not-due" } as const;
        const participants = [c.accusedId, c.attorneyId, c.prosecutorId].filter(Boolean) as string[];
        for (const userId of participants) {
          await notify(tx, userId, {
            type: "DELIBERATION_EXTENDED",
            title: "The jury needs more time",
            body: `“${c.title}” has ${guilty + notGuilty}/${gameConfig.quorum} votes, so deliberation was extended. Share it to round up jurors!`,
            href: casePath(c),
          });
        }
        return { kind: "extended", endsAt } as const;
      }

      const verdict: Verdict = decision === "BELOW_QUORUM" ? "DISMISSED" : decision;
      const closed = await tx.case.updateMany({
        where: { id: caseId, status: "DELIBERATION", deliberationEndsAt: { lte: now } },
        data: {
          status: "CLOSED",
          verdict,
          closedAt: now,
          guiltyVotes: guilty,
          notGuiltyVotes: notGuilty,
          controversy: controversyScore(guilty, notGuilty),
          claimedById: null,
          claimExpiresAt: null,
        },
      });
      if (closed.count === 0) return { kind: "not-due" } as const;

      await applyVerdictEffects(tx, { ...c, verdict, guilty, notGuilty });
      return { kind: "closed", verdict, guilty, notGuilty } as const;
    },
    { timeout: 30_000, maxWait: 10_000 },
  );
}

const VERDICT_HEADLINE: Record<Verdict, string> = {
  GUILTY: "GUILTY!",
  NOT_GUILTY: "NOT GUILTY!",
  MISTRIAL: "MISTRIAL!",
  DISMISSED: "Case dismissed",
};

async function applyVerdictEffects(
  tx: Tx,
  c: {
    id: string;
    number: number;
    slug: string;
    title: string;
    anonymous: boolean;
    accusedId: string;
    attorneyId: string | null;
    prosecutorId: string | null;
    verdict: Verdict;
    guilty: number;
    notGuilty: number;
  },
) {
  const { verdict, guilty, notGuilty } = c;
  const total = guilty + notGuilty;
  const guiltyShare = total ? guilty / total : 0;
  const notGuiltyShare = total ? notGuilty / total : 0;
  const href = casePath(c);
  const tally = `${guilty}–${notGuilty}`;

  /* Accused. Anonymous defendants get the verdict notification only: XP or achievements
     landing on their public profile at verdict time would reveal who confessed. */
  if (!c.anonymous) {
    if (verdict === "GUILTY") {
      await tx.userStats.update({ where: { userId: c.accusedId }, data: { timesConvicted: { increment: 1 } } });
      await awardXp(tx, c.accusedId, XP.convicted, "convicted", c.id);
      if (guiltyShare >= 0.9) await grantAchievements(tx, c.accusedId, ["public-enemy"], c.id);
    } else if (verdict === "NOT_GUILTY") {
      await tx.userStats.update({ where: { userId: c.accusedId }, data: { timesAcquitted: { increment: 1 } } });
      await awardXp(tx, c.accusedId, XP.acquitted, "acquitted", c.id);
    } else {
      await awardXp(tx, c.accusedId, XP.dismissed, verdict === "MISTRIAL" ? "mistrial" : "dismissed", c.id);
    }
    await checkStatAchievements(tx, c.accusedId, c.id);
  }
  await notify(tx, c.accusedId, {
    type: "VERDICT",
    title: `Verdict: ${VERDICT_HEADLINE[verdict]}`,
    body:
      verdict === "DISMISSED"
        ? `“${c.title}” didn't reach a quorum and was dismissed.`
        : `The jury ruled on “${c.title}” (${tally}).`,
    href,
    data: { verdict },
  });

  /* Attorney and prosecutor */
  const sides: { userId: string | null; role: "DEFENSE" | "PROSECUTION" }[] = [
    { userId: c.attorneyId, role: "DEFENSE" },
    { userId: c.prosecutorId, role: "PROSECUTION" },
  ];
  for (const side of sides) {
    if (!side.userId) continue;
    const isDefense = side.role === "DEFENSE";
    const won = (isDefense && verdict === "NOT_GUILTY") || (!isDefense && verdict === "GUILTY");
    const lost = (isDefense && verdict === "GUILTY") || (!isDefense && verdict === "NOT_GUILTY");
    const stats = await tx.userStats.findUniqueOrThrow({ where: { userId: side.userId } });

    if (won || lost) {
      const current = isDefense ? stats.currentDefenseStreak : stats.currentProsecutionStreak;
      const longest = isDefense ? stats.longestDefenseStreak : stats.longestProsecutionStreak;
      const nextCurrent = won ? current + 1 : 0;
      const nextLongest = Math.max(longest, nextCurrent);
      await tx.userStats.update({
        where: { userId: side.userId },
        data: isDefense
          ? {
              ...(won ? { defenseWins: { increment: 1 } } : { defenseLosses: { increment: 1 } }),
              currentDefenseStreak: nextCurrent,
              longestDefenseStreak: nextLongest,
            }
          : {
              ...(won ? { prosecutionWins: { increment: 1 } } : { prosecutionLosses: { increment: 1 } }),
              currentProsecutionStreak: nextCurrent,
              longestProsecutionStreak: nextLongest,
            },
      });
      await awardXp(tx, side.userId, won ? XP.win : XP.loss, won ? "case-won" : "case-lost", c.id);
      await adjustReputation(tx, side.userId, won ? REPUTATION.win : REPUTATION.loss);
      if (won && isDefense && notGuiltyShare >= 0.8) await grantAchievements(tx, side.userId, ["peoples-champion"], c.id);
      if (won && !isDefense && guiltyShare >= 0.75) await grantAchievements(tx, side.userId, ["objection-overruled"], c.id);
    } else if (verdict === "MISTRIAL") {
      await tx.userStats.update({
        where: { userId: side.userId },
        data: isDefense ? { defenseMistrials: { increment: 1 } } : { prosecutionMistrials: { increment: 1 } },
      });
      await awardXp(tx, side.userId, XP.mistrial, "mistrial", c.id);
      await adjustReputation(tx, side.userId, REPUTATION.mistrial);
      await grantAchievements(tx, side.userId, ["hung-out-to-dry"], c.id);
    } else {
      await awardXp(tx, side.userId, XP.dismissed, "dismissed", c.id);
    }
    await checkStatAchievements(tx, side.userId, c.id);
    await notify(tx, side.userId, {
      type: "VERDICT",
      title: won ? "You won your case!" : lost ? "You lost your case" : `Verdict: ${VERDICT_HEADLINE[verdict]}`,
      body:
        verdict === "DISMISSED"
          ? `“${c.title}” was dismissed for lack of quorum.`
          : `${VERDICT_HEADLINE[verdict]} on “${c.title}” (${tally}).`,
      href,
      data: { verdict, won, lost },
    });
  }

  /* Jurors */
  if (verdict === "GUILTY" || verdict === "NOT_GUILTY") {
    const majorityChoice = verdict === "GUILTY" ? "GUILTY" : "NOT_GUILTY";
    const majority = await tx.vote.findMany({ where: { caseId: c.id, choice: majorityChoice }, select: { userId: true } });
    const swing = Math.abs(guilty - notGuilty) === 1;
    for (const { userId } of majority) {
      await tx.userStats.update({ where: { userId }, data: { juryMajorityVotes: { increment: 1 } } });
      await awardXp(tx, userId, XP.juryMajorityBonus, "jury-majority", c.id);
      await adjustReputation(tx, userId, REPUTATION.juryMajority);
      if (swing) await grantAchievements(tx, userId, ["swing-vote"], c.id);
    }
  }
  const jurors = await tx.vote.findMany({ where: { caseId: c.id }, select: { userId: true, choice: true } });
  if (jurors.length) {
    await tx.notification.createMany({
      data: jurors.map((j) => ({
        userId: j.userId,
        type: "VERDICT" as const,
        title: `The verdict is in: ${VERDICT_HEADLINE[verdict]}`,
        body:
          verdict === "DISMISSED"
            ? `“${c.title}” was dismissed for lack of quorum.`
            : `You voted ${j.choice === "GUILTY" ? "guilty" : "not guilty"} on “${c.title}”. Final tally ${tally}.`,
        href,
        data: { verdict },
        createdAt: clock.now(),
        toastedAt: clock.now(), // inbox only; toasts are reserved for participants
      })),
    });
  }
}
