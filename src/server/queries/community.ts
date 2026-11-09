import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { clock } from "../clock";
import { gameConfig } from "../config";
import { caseCardSelect, toCaseCard, toCaseCards } from "./cases";
import { parseAvatar } from "@/lib/avatar";

export function utcDay(d: Date = clock.now()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Featured Case of the Day: pinned by staff, or the best case closed in the last 7 days
 * (persisted on first view so it stays stable all day).
 */
export async function getFeaturedCase(viewer: { id: string; mutedCategories?: string[] } | null) {
  const day = utcDay();
  let featured = await db.featuredCase.findUnique({ where: { day }, select: { case: { select: { ...caseCardSelect, moderationState: true } } } });
  // A confessor who has since opted out of featuring is respected even for today's pin.
  const optedOut =
    featured &&
    (await db.case.findUnique({ where: { id: featured.case.id }, select: { accused: { select: { allowFeaturing: true } } } }))?.accused.allowFeaturing === false;
  if (!featured || featured.case.moderationState !== "VISIBLE" || optedOut) {
    const weekAgo = new Date(clock.now().getTime() - 7 * 86_400_000);
    const candidates = await db.case.findMany({
      where: {
        status: "CLOSED",
        moderationState: "VISIBLE",
        verdict: { in: ["GUILTY", "NOT_GUILTY", "MISTRIAL"] },
        accused: { allowFeaturing: true },
        featured: { none: {} },
      },
      orderBy: [{ closedAt: "desc" }],
      take: 60,
      select: { id: true, reactionScore: true, guiltyVotes: true, notGuiltyVotes: true, controversy: true, closedAt: true },
    });
    if (candidates.length === 0) return null;
    const score = (c: (typeof candidates)[number]) =>
      c.reactionScore * 2 + (c.guiltyVotes + c.notGuiltyVotes) + c.controversy * 10 + (c.closedAt && c.closedAt >= weekAgo ? 25 : 0);
    const best = candidates.sort((a, b) => score(b) - score(a))[0];
    await db.featuredCase.upsert({ where: { day }, create: { day, caseId: best.id }, update: { caseId: best.id } });
    featured = await db.featuredCase.findUnique({ where: { day }, select: { case: { select: { ...caseCardSelect, moderationState: true } } } });
    if (!featured) return null;
  }
  const [card] = await toCaseCards([featured.case], viewer);
  // Muted categories are hidden from the archives and home page, the featured slot included.
  if (viewer?.mutedCategories?.includes(card.category)) return null;
  return card;
}

/** A banned player's public open cases are on hold (anonymous ones stay, so bans don't reveal them). */
const NOT_ON_HOLD = { OR: [{ anonymous: true }, { accused: { bannedAt: null } }] } satisfies Prisma.CaseWhereInput;

export async function getCommunityStats() {
  const now = clock.now();
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const [players, cases, closed, votes, guilty, notGuilty, todayVotes, inDeliberation, awaiting, lastNumber] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.case.count({ where: { moderationState: { not: "REMOVED" } } }),
    db.case.count({ where: { status: "CLOSED", moderationState: "VISIBLE" } }),
    db.vote.count({ where: { case: { moderationState: "VISIBLE" } } }), // same scope as the case totals
    db.case.count({ where: { status: "CLOSED", verdict: "GUILTY", moderationState: "VISIBLE" } }),
    db.case.count({ where: { status: "CLOSED", verdict: "NOT_GUILTY", moderationState: "VISIBLE" } }),
    db.vote.count({ where: { createdAt: { gte: dayAgo }, case: { moderationState: "VISIBLE" } } }),
    db.case.count({ where: { status: "DELIBERATION", moderationState: "VISIBLE" } }),
    // Cases on hold (a banned player's public cases) aren't awaiting anyone.
    db.case.count({ where: { status: { in: ["AWAITING_DEFENSE", "AWAITING_PROSECUTION"] }, moderationState: "VISIBLE", ...NOT_ON_HOLD } }),
    db.case.aggregate({ _max: { number: true } }),
  ]);
  return {
    players,
    cases,
    closed,
    votes,
    // Mistrials and dismissals are neither convictions nor acquittals.
    convictionRate: guilty + notGuilty ? guilty / (guilty + notGuilty) : 0,
    todayVotes,
    inDeliberation,
    awaiting,
    // The real next number (sealed cases still use theirs), not a count of visible ones.
    nextCaseNumber: (lastNumber._max.number ?? 0) + 1,
  };
}

export async function getRecentVerdicts(viewer: { id: string; mutedCategories?: string[] } | null, take = 6) {
  const rows = await db.case.findMany({
    where: {
      status: "CLOSED",
      moderationState: "VISIBLE",
      verdict: { not: "DISMISSED" },
      ...(viewer?.mutedCategories?.length ? { category: { notIn: viewer.mutedCategories } } : {}),
    },
    orderBy: [{ closedAt: "desc" }],
    take,
    select: caseCardSelect,
  });
  return toCaseCards(rows, viewer);
}

/** Community highlights over the last 30 days. */
export async function getHighlights() {
  const since = new Date(clock.now().getTime() - 30 * 86_400_000);
  const base = { status: "CLOSED" as const, moderationState: "VISIBLE" as const, closedAt: { gte: since } };
  const [closest, blowout, legendary, topAttorney] = await Promise.all([
    db.case.findFirst({
      where: { ...base, verdict: { in: ["GUILTY", "NOT_GUILTY"] } },
      orderBy: [{ controversy: "desc" }, { guiltyVotes: "desc" }],
      select: caseCardSelect,
    }),
    db.case.findFirst({
      where: { ...base, verdict: { in: ["GUILTY", "NOT_GUILTY"] }, controversy: { lte: 0.2 } },
      orderBy: [{ guiltyVotes: "desc" }, { notGuiltyVotes: "desc" }],
      select: caseCardSelect,
    }),
    db.case.findFirst({ where: { ...base, legendaryCount: { gt: 0 } }, orderBy: [{ legendaryCount: "desc" }], select: caseCardSelect }),
    db.case.groupBy({
      by: ["attorneyId"],
      where: { ...base, verdict: "NOT_GUILTY", attorneyId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { attorneyId: "desc" } },
      take: 1,
    }),
  ]);
  let attorneyOfTheMonth: { username: string; displayName: string; avatar: ReturnType<typeof parseAvatar>; wins: number } | null = null;
  if (topAttorney[0]?.attorneyId) {
    const u = await db.user.findUnique({
      where: { id: topAttorney[0].attorneyId },
      select: { username: true, displayName: true, avatar: true, deletedAt: true, bannedAt: true },
    });
    if (u && !u.deletedAt && !u.bannedAt) {
      attorneyOfTheMonth = { username: u.username, displayName: u.displayName, avatar: parseAvatar(u.avatar), wins: topAttorney[0]._count._all };
    }
  }
  return {
    closest: closest ? toCaseCard(closest, null, null) : null,
    blowout: blowout ? toCaseCard(blowout, null, null) : null,
    legendary: legendary ? toCaseCard(legendary, null, null) : null,
    attorneyOfTheMonth,
  };
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export async function getDashboard(viewer: { id: string; mutedCategories: string[] }) {
  const now = clock.now();
  const startOfDay = new Date(utcDay(now) + "T00:00:00.000Z");
  const muted = viewer.mutedCategories.length ? { category: { notIn: viewer.mutedCategories } } : {};

  const [mine, claims, stageCounts, xpToday, votesToday, argumentsToday, confessionsToday, jurySuggestions, defenseSuggestions, prosecutionSuggestions] =
    await Promise.all([
      db.case.findMany({
        where: { moderationState: { not: "REMOVED" }, OR: [{ accusedId: viewer.id }, { attorneyId: viewer.id }, { prosecutorId: viewer.id }] },
        orderBy: [{ updatedAt: "desc" }],
        take: 30,
        select: caseCardSelect,
      }),
      db.case.findMany({
        where: { claimedById: viewer.id, claimExpiresAt: { gt: new Date(now.getTime() - gameConfig.claimGraceMs) }, status: { in: ["DEFENSE_CLAIMED", "PROSECUTION_CLAIMED"] } },
        select: caseCardSelect,
      }),
      db.case.groupBy({ by: ["status"], where: { moderationState: "VISIBLE", status: { not: "CLOSED" }, OR: [{ status: "DELIBERATION" }, NOT_ON_HOLD] }, _count: { _all: true } }),
      db.xpEvent.aggregate({ where: { userId: viewer.id, createdAt: { gte: startOfDay } }, _sum: { amount: true } }),
      db.vote.count({ where: { userId: viewer.id, createdAt: { gte: startOfDay } } }),
      db.argument.count({ where: { authorId: viewer.id, createdAt: { gte: startOfDay } } }),
      db.case.count({ where: { accusedId: viewer.id, createdAt: { gte: startOfDay } } }),
      db.case.findMany({
        where: {
          status: "DELIBERATION",
          moderationState: "VISIBLE",
          deliberationEndsAt: { gt: now },
          accusedId: { not: viewer.id },
          AND: [{ OR: [{ anonymous: true }, { accused: { bannedAt: null } }] }], // see queueWhere
          attorneyId: { not: viewer.id },
          prosecutorId: { not: viewer.id },
          votes: { none: { userId: viewer.id } },
          ...muted,
        },
        orderBy: [{ deliberationEndsAt: "asc" }],
        take: 3,
        select: caseCardSelect,
      }),
      db.case.findMany({
        where: {
          moderationState: "VISIBLE",
          accusedId: { not: viewer.id },
          AND: [{ OR: [{ anonymous: true }, { accused: { bannedAt: null } }] }], // see queueWhere
          OR: [{ status: "AWAITING_DEFENSE" }, { status: "DEFENSE_CLAIMED", claimExpiresAt: { lt: new Date(now.getTime() - gameConfig.claimGraceMs) } }],
          ...muted,
        },
        orderBy: [{ createdAt: "asc" }],
        take: 2,
        select: caseCardSelect,
      }),
      db.case.findMany({
        where: {
          moderationState: "VISIBLE",
          accusedId: { not: viewer.id },
          AND: [{ OR: [{ anonymous: true }, { accused: { bannedAt: null } }] }], // see queueWhere
          attorneyId: { not: viewer.id },
          OR: [{ status: "AWAITING_PROSECUTION" }, { status: "PROSECUTION_CLAIMED", claimExpiresAt: { lt: new Date(now.getTime() - gameConfig.claimGraceMs) } }],
          ...muted,
        },
        orderBy: [{ defenseFiledAt: "asc" }],
        take: 2,
        select: caseCardSelect,
      }),
    ]);

  const counts = Object.fromEntries(stageCounts.map((s) => [s.status, s._count._all])) as Record<string, number>;
  const mineCards = await toCaseCards(mine, viewer);
  return {
    claims: await toCaseCards(claims, viewer),
    active: mineCards.filter((c) => c.status !== "CLOSED"),
    closed: mineCards.filter((c) => c.status === "CLOSED").slice(0, 6),
    stages: {
      // Only cases someone can pick up right now (the doors invite you to claim one).
      awaitingDefense: counts.AWAITING_DEFENSE ?? 0,
      awaitingProsecution: counts.AWAITING_PROSECUTION ?? 0,
      deliberation: counts.DELIBERATION ?? 0,
    },
    today: {
      xp: xpToday._sum.amount ?? 0,
      votes: votesToday,
      arguments: argumentsToday,
      confessions: confessionsToday,
    },
    recommended: {
      jury: await toCaseCards(jurySuggestions, viewer),
      defense: await toCaseCards(defenseSuggestions, viewer),
      prosecution: await toCaseCards(prosecutionSuggestions, viewer),
    },
    quorum: gameConfig.quorum,
  };
}
