import "server-only";
import { db } from "../db";
import { REPUTATION } from "@/lib/progression";

/**
 * Recomputes a player's statistics from raw history (cases, arguments, votes,
 * XP ledger). Used by tests and by the admin "audit stats" tool to prove the
 * incrementally maintained counters are correct.
 */
export async function recomputeStatsFromHistory(userId: string) {
  const [confessions, defended, prosecuted, argumentsFiled, votes, xp] = await Promise.all([
    db.case.findMany({ where: { accusedId: userId }, select: { anonymous: true, status: true, verdict: true } }),
    db.case.findMany({
      where: { attorneyId: userId, status: "CLOSED" },
      select: { id: true, number: true, verdict: true, closedAt: true },
    }),
    db.case.findMany({
      where: { prosecutorId: userId, status: "CLOSED" },
      select: { id: true, number: true, verdict: true, closedAt: true },
    }),
    db.argument.groupBy({ by: ["role"], where: { authorId: userId }, _count: { _all: true } }),
    db.vote.findMany({
      where: { userId },
      select: { choice: true, case: { select: { id: true, number: true, status: true, verdict: true, closedAt: true } } },
    }),
    db.xpEvent.aggregate({ where: { userId }, _sum: { amount: true } }),
  ]);

  const byTime = <T extends { closedAt: Date | null; number: number }>(a: T, b: T) =>
    (a.closedAt?.getTime() ?? 0) - (b.closedAt?.getTime() ?? 0) || a.number - b.number;

  function sideRecord(cases: { verdict: string | null; closedAt: Date | null; number: number }[], winVerdict: string, loseVerdict: string) {
    let wins = 0,
      losses = 0,
      mistrials = 0,
      current = 0,
      longest = 0;
    for (const c of [...cases].sort(byTime)) {
      if (c.verdict === winVerdict) {
        wins++;
        current++;
        longest = Math.max(longest, current);
      } else if (c.verdict === loseVerdict) {
        losses++;
        current = 0;
      } else if (c.verdict === "MISTRIAL") {
        mistrials++;
      }
    }
    return { wins, losses, mistrials, current, longest };
  }

  const defense = sideRecord(defended, "NOT_GUILTY", "GUILTY");
  const prosecution = sideRecord(prosecuted, "GUILTY", "NOT_GUILTY");

  // Reputation replay (floored at zero after each event, like the live system).
  type RepEvent = { closedAt: Date | null; number: number; delta: number };
  const repEvents: RepEvent[] = [];
  for (const c of defended) {
    const delta = c.verdict === "NOT_GUILTY" ? REPUTATION.win : c.verdict === "GUILTY" ? REPUTATION.loss : c.verdict === "MISTRIAL" ? REPUTATION.mistrial : 0;
    repEvents.push({ closedAt: c.closedAt, number: c.number, delta });
  }
  for (const c of prosecuted) {
    const delta = c.verdict === "GUILTY" ? REPUTATION.win : c.verdict === "NOT_GUILTY" ? REPUTATION.loss : c.verdict === "MISTRIAL" ? REPUTATION.mistrial : 0;
    repEvents.push({ closedAt: c.closedAt, number: c.number, delta });
  }
  let juryMajorityVotes = 0;
  for (const v of votes) {
    if (v.case.status === "CLOSED" && v.case.verdict === v.choice) {
      juryMajorityVotes++;
      repEvents.push({ closedAt: v.case.closedAt, number: v.case.number, delta: REPUTATION.juryMajority });
    }
  }
  let reputation = 0;
  for (const e of repEvents.sort(byTime)) reputation = Math.max(0, reputation + e.delta);

  const publicConfessions = confessions.filter((c) => !c.anonymous);
  return {
    xp: xp._sum.amount ?? 0,
    reputation,
    casesConfessed: publicConfessions.length,
    totalConfessions: confessions.length,
    timesConvicted: publicConfessions.filter((c) => c.verdict === "GUILTY").length,
    timesAcquitted: publicConfessions.filter((c) => c.verdict === "NOT_GUILTY").length,
    defenseWins: defense.wins,
    defenseLosses: defense.losses,
    defenseMistrials: defense.mistrials,
    prosecutionWins: prosecution.wins,
    prosecutionLosses: prosecution.losses,
    prosecutionMistrials: prosecution.mistrials,
    currentDefenseStreak: defense.current,
    longestDefenseStreak: defense.longest,
    currentProsecutionStreak: prosecution.current,
    longestProsecutionStreak: prosecution.longest,
    juryVotes: votes.length,
    juryMajorityVotes,
    defensesFiled: argumentsFiled.find((a) => a.role === "DEFENSE")?._count._all ?? 0,
    prosecutionsFiled: argumentsFiled.find((a) => a.role === "PROSECUTION")?._count._all ?? 0,
  };
}

export async function auditStats(userId: string) {
  const [stored, computed] = await Promise.all([
    db.userStats.findUniqueOrThrow({ where: { userId } }),
    recomputeStatsFromHistory(userId),
  ]);
  const mismatches: { field: string; stored: number; computed: number }[] = [];
  for (const [field, value] of Object.entries(computed)) {
    const s = (stored as unknown as Record<string, number>)[field];
    if (s !== value) mismatches.push({ field, stored: s, computed: value });
  }
  return { ok: mismatches.length === 0, mismatches };
}
