import "server-only";
import type { NotificationType, Prisma } from "@prisma/client";
import type { Tx } from "../db";
import { CourtError } from "../errors";
import { getAchievement } from "@/lib/achievements";
import { levelForXp, levelTitle } from "@/lib/progression";
import { clock } from "../clock";

export async function assertActiveUser(tx: Tx, userId: string) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, bannedAt: true, deletedAt: true },
  });
  if (!user || user.deletedAt) throw new CourtError("UNAUTHENTICATED", "Your account could not be found.");
  if (user.bannedAt) {
    throw new CourtError("BANNED", "You have been held in contempt of court (banned) and cannot take part.");
  }
  return user;
}

export async function notify(
  tx: Tx,
  userId: string,
  n: { type: NotificationType; title: string; body: string; href?: string; data?: Prisma.InputJsonValue },
) {
  await tx.notification.create({ data: { userId, ...n, createdAt: clock.now() } });
}

export async function awardXp(tx: Tx, userId: string, amount: number, reason: string, caseId?: string) {
  if (amount === 0) return;
  const stats = await tx.userStats.update({
    where: { userId },
    data: { xp: { increment: amount } },
    select: { xp: true },
  });
  await tx.xpEvent.create({ data: { userId, amount, reason, caseId, createdAt: clock.now() } });
  const before = levelForXp(stats.xp - amount);
  const after = levelForXp(stats.xp);
  if (after > before) {
    await notify(tx, userId, {
      type: "LEVEL_UP",
      title: `Promoted to level ${after}!`,
      body: `The court recognises you as “${levelTitle(after)}”.`,
      href: "/court",
      data: { level: after },
    });
  }
}

export async function adjustReputation(tx: Tx, userId: string, delta: number) {
  if (delta === 0) return;
  if (delta > 0) {
    await tx.userStats.update({ where: { userId }, data: { reputation: { increment: delta } } });
    return;
  }
  // Floor at zero, atomically.
  await tx.$executeRaw`UPDATE "UserStats" SET "reputation" = GREATEST(0, "reputation" + ${delta}) WHERE "userId" = ${userId}`;
}

/** Grants achievements the user doesn't have yet; returns the newly granted keys. */
export async function grantAchievements(tx: Tx, userId: string, keys: string[], caseId?: string): Promise<string[]> {
  const unique = Array.from(new Set(keys)).filter((k) => getAchievement(k));
  if (unique.length === 0) return [];
  const existing = await tx.userAchievement.findMany({
    where: { userId, key: { in: unique } },
    select: { key: true },
  });
  const have = new Set(existing.map((e) => e.key));
  const fresh = unique.filter((k) => !have.has(k));
  if (fresh.length === 0) return [];
  await tx.userAchievement.createMany({
    data: fresh.map((key) => ({ userId, key, caseId, unlockedAt: clock.now() })),
    skipDuplicates: true,
  });
  for (const key of fresh) {
    const def = getAchievement(key)!;
    await notify(tx, userId, {
      type: "ACHIEVEMENT",
      title: `Achievement unlocked: ${def.name}`,
      body: def.quip,
      href: "/u/me#achievements",
      data: { key },
    });
  }
  return fresh;
}

/** Achievements that follow purely from counters. */
export async function checkStatAchievements(tx: Tx, userId: string, caseId?: string) {
  const s = await tx.userStats.findUnique({ where: { userId } });
  if (!s) return [];
  const keys: string[] = [];
  // Public confessions only: an achievement appearing for an anonymous one would unmask it.
  if (s.casesConfessed >= 1) keys.push("opening-statement");
  if (s.casesConfessed >= 5) keys.push("serial-defendant");
  if (s.timesConvicted >= 3) keys.push("certified-menace");
  if (s.timesAcquitted >= 1) keys.push("clean-record");
  if (s.defenseWins >= 1) keys.push("goodman-apprentice");
  if (s.defenseWins >= 5) keys.push("professional-liar");
  if (s.longestDefenseStreak >= 5) keys.push("unstoppable-attorney");
  if (s.prosecutionWins >= 1) keys.push("first-conviction");
  if (s.longestProsecutionStreak >= 3) keys.push("silver-tongued-raccoon");
  if (s.juryVotes >= 10) keys.push("justice-served");
  if (s.juryVotes >= 50) keys.push("cat-herder");
  if (s.casesConfessed >= 1 && s.defensesFiled >= 1 && s.prosecutionsFiled >= 1 && s.juryVotes >= 1) {
    keys.push("triple-threat");
  }
  return grantAchievements(tx, userId, keys, caseId);
}
