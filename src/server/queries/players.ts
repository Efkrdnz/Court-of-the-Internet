import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { clock } from "../clock";
import { parseAvatar } from "@/lib/avatar";
import { LEADERBOARD_MIN_DECIDED, LEADERBOARD_MIN_JURY_VOTES, levelProgress, wilsonLowerBound, winRate } from "@/lib/progression";
import { caseCardSelect, toCaseCards } from "./cases";

export async function getProfile(username: string, viewer: { id: string } | null) {
  const user = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatar: true,
      role: true,
      profileTheme: true,
      featuredBadge: true,
      membershipTier: true,
      createdAt: true,
      bannedAt: true,
      deletedAt: true,
      stats: true,
      achievements: { select: { key: true, unlockedAt: true }, orderBy: { unlockedAt: "desc" } },
    },
  });
  if (!user || user.deletedAt || !user.stats) return null;
  const isSelf = viewer?.id === user.id;
  const s = user.stats;

  // Public history: anonymous confessions are only listed for the owner.
  const historyWhere: Prisma.CaseWhereInput = {
    moderationState: "VISIBLE",
    OR: [
      { accusedId: user.id, ...(isSelf ? {} : { anonymous: false }) },
      { attorneyId: user.id },
      { prosecutorId: user.id },
    ],
  };
  const [historyRows, historyTotal, recentVotes] = await Promise.all([
    db.case.findMany({ where: historyWhere, orderBy: { createdAt: "desc" }, take: 12, select: caseCardSelect }),
    db.case.count({ where: historyWhere }),
    db.vote.count({ where: { userId: user.id, createdAt: { gte: new Date(clock.now().getTime() - 7 * 86_400_000) } } }),
  ]);

  const defenseRate = winRate(s.defenseWins, s.defenseLosses);
  const prosecutionRate = winRate(s.prosecutionWins, s.prosecutionLosses);
  return {
    user: {
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatar: parseAvatar(user.avatar),
      role: user.role,
      profileTheme: user.profileTheme,
      featuredBadge: user.featuredBadge,
      isPatron: user.membershipTier === "PATRON",
      createdAt: user.createdAt.toISOString(),
      banned: !!user.bannedAt,
    },
    isSelf,
    level: levelProgress(s.xp),
    stats: {
      ...s,
      userId: undefined,
      // Private counter: only the owner sees anonymous confessions included.
      totalConfessions: isSelf ? s.totalConfessions : s.casesConfessed,
      defenseRate,
      prosecutionRate,
      juryAgreement: s.juryVotes ? s.juryMajorityVotes / s.juryVotes : null,
      votesThisWeek: recentVotes,
    },
    achievements: user.achievements.map((a) => ({ key: a.key, unlockedAt: a.unlockedAt.toISOString() })),
    history: await toCaseCards(historyRows, viewer),
    historyTotal,
  };
}

const lbUser = {
  username: true,
  displayName: true,
  avatar: true,
  featuredBadge: true,
} as const;

type LbRow = { username: string; displayName: string; avatar: unknown; featuredBadge: string | null };
function lbPerson(u: LbRow) {
  return { username: u.username, displayName: u.displayName, avatar: parseAvatar(u.avatar), featuredBadge: u.featuredBadge };
}

const activeUser: Prisma.UserWhereInput = { deletedAt: null, bannedAt: null };

export async function getLeaderboards() {
  const [defenders, prosecutors, convicts, streakers, jurors, xpLeaders, entertaining] = await Promise.all([
    db.userStats.findMany({
      where: { user: activeUser, OR: [{ defenseWins: { gt: 0 } }, { defenseLosses: { gt: 0 } }] },
      select: { defenseWins: true, defenseLosses: true, longestDefenseStreak: true, currentDefenseStreak: true, user: { select: lbUser } },
      take: 500,
    }),
    db.userStats.findMany({
      where: { user: activeUser, OR: [{ prosecutionWins: { gt: 0 } }, { prosecutionLosses: { gt: 0 } }] },
      select: {
        prosecutionWins: true,
        prosecutionLosses: true,
        longestProsecutionStreak: true,
        currentProsecutionStreak: true,
        user: { select: lbUser },
      },
      take: 500,
    }),
    db.userStats.findMany({
      where: { user: activeUser, timesConvicted: { gt: 0 } },
      orderBy: [{ timesConvicted: "desc" }, { casesConfessed: "desc" }],
      select: { timesConvicted: true, timesAcquitted: true, casesConfessed: true, user: { select: lbUser } },
      take: 10,
    }),
    db.userStats.findMany({
      where: { user: activeUser, OR: [{ longestDefenseStreak: { gt: 0 } }, { longestProsecutionStreak: { gt: 0 } }] },
      select: { longestDefenseStreak: true, longestProsecutionStreak: true, user: { select: lbUser } },
      take: 500,
    }),
    db.userStats.findMany({
      where: { user: activeUser, juryVotes: { gte: LEADERBOARD_MIN_JURY_VOTES } },
      orderBy: [{ juryVotes: "desc" }],
      select: { juryVotes: true, juryMajorityVotes: true, user: { select: lbUser } },
      take: 10,
    }),
    db.userStats.findMany({
      where: { user: activeUser, xp: { gt: 0 } },
      orderBy: [{ reputation: "desc" }, { xp: "desc" }],
      select: { xp: true, reputation: true, user: { select: lbUser } },
      take: 10,
    }),
    db.case.findMany({
      where: { status: "CLOSED", moderationState: "VISIBLE", reactionScore: { gt: 0 } },
      orderBy: [{ reactionScore: "desc" }, { closedAt: "desc" }],
      take: 10,
      select: caseCardSelect,
    }),
  ]);

  const ranked = <T,>(rows: T[], wins: (r: T) => number, losses: (r: T) => number) =>
    rows
      .map((r) => {
        const w = wins(r);
        const l = losses(r);
        return { row: r, wins: w, losses: l, decided: w + l, rate: w / Math.max(1, w + l), score: wilsonLowerBound(w, w + l) };
      })
      .filter((r) => r.decided >= LEADERBOARD_MIN_DECIDED)
      .sort((a, b) => b.score - a.score || b.wins - a.wins)
      .slice(0, 10);

  return {
    attorneys: ranked(defenders, (r) => r.defenseWins, (r) => r.defenseLosses).map((r) => ({
      ...lbPerson(r.row.user),
      wins: r.wins,
      losses: r.losses,
      rate: r.rate,
      score: r.score,
      streak: r.row.currentDefenseStreak,
    })),
    prosecutors: ranked(prosecutors, (r) => r.prosecutionWins, (r) => r.prosecutionLosses).map((r) => ({
      ...lbPerson(r.row.user),
      wins: r.wins,
      losses: r.losses,
      rate: r.rate,
      score: r.score,
      streak: r.row.currentProsecutionStreak,
    })),
    convicts: convicts.map((r) => ({ ...lbPerson(r.user), convictions: r.timesConvicted, acquittals: r.timesAcquitted, confessed: r.casesConfessed })),
    streaks: streakers
      .map((r) => ({
        ...lbPerson(r.user),
        streak: Math.max(r.longestDefenseStreak, r.longestProsecutionStreak),
        side: r.longestDefenseStreak >= r.longestProsecutionStreak ? ("Defense" as const) : ("Prosecution" as const),
      }))
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 10),
    jurors: jurors.map((r) => ({ ...lbPerson(r.user), votes: r.juryVotes, agreement: r.juryVotes ? r.juryMajorityVotes / r.juryVotes : 0 })),
    reputation: xpLeaders.map((r) => ({ ...lbPerson(r.user), xp: r.xp, reputation: r.reputation, level: levelProgress(r.xp).level })),
    entertaining: await toCaseCards(entertaining, null),
    thresholds: { decided: LEADERBOARD_MIN_DECIDED, juryVotes: LEADERBOARD_MIN_JURY_VOTES },
  };
}

export async function getViewerSummary(userId: string) {
  const [stats, unread] = await Promise.all([
    db.userStats.findUnique({ where: { userId }, select: { xp: true, reputation: true } }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { level: levelProgress(stats?.xp ?? 0), reputation: stats?.reputation ?? 0, unread };
}

export async function listNotifications(userId: string, take = 40) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true, data: true },
  });
}

/** Notifications that should pop as toasts (achievements, level-ups, verdicts) and haven't yet. */
export async function pendingToasts(userId: string) {
  return db.notification.findMany({
    where: { userId, toastedAt: null, type: { in: ["ACHIEVEMENT", "LEVEL_UP", "VERDICT"] }, createdAt: { gte: new Date(clock.now().getTime() - 3 * 86_400_000) } },
    orderBy: { createdAt: "asc" },
    take: 5,
    select: { id: true, type: true, title: true, body: true, href: true, data: true },
  });
}
