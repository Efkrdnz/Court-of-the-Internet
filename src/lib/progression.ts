/** XP, levels, ranking math. Pure functions: safe on client and server. */

export const XP = {
  confess: 15,
  fileArgument: 25,
  juryVote: 5,
  juryMajorityBonus: 5,
  win: 60,
  loss: 15,
  mistrial: 30,
  acquitted: 40,
  convicted: 25,
  dismissed: 10,
} as const;

export const REPUTATION = {
  win: 12,
  loss: -4,
  mistrial: 3,
  juryMajority: 1,
} as const;

/** Total XP required to *reach* level n (n ≥ 1). */
export function xpForLevel(n: number): number {
  return 50 * n * (n - 1);
}

export function levelForXp(xp: number): number {
  // Solve 50n(n-1) <= xp  ⇒  n = floor((1 + sqrt(1 + 4·xp/50)) / 2)
  const n = Math.floor((1 + Math.sqrt(1 + (4 * Math.max(0, xp)) / 50)) / 2);
  return Math.max(1, n);
}

export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  return {
    level,
    title: levelTitle(level),
    current: xp - floor,
    needed: ceiling - floor,
    pct: Math.min(100, Math.round(((xp - floor) / (ceiling - floor)) * 100)),
    nextAt: ceiling,
  };
}

const TITLES: [number, string][] = [
  [1, "Court Intern"],
  [2, "Coffee-Fetching Clerk"],
  [3, "Paralegal of Pettiness"],
  [4, "Junior Associate"],
  [5, "Senior Associate"],
  [7, "Partner (Corner Office)"],
  [9, "Esteemed Barrister"],
  [11, "Wig-Wearing Magistrate"],
  [14, "High Court Judge"],
  [17, "Chief Justice of Nonsense"],
  [20, "Supreme Overlord of Snacks"],
];

export function levelTitle(level: number): string {
  let title = TITLES[0][1];
  for (const [min, t] of TITLES) if (level >= min) title = t;
  return title;
}

/**
 * Lower bound of the Wilson score interval (95%). Used to rank win rates so that
 * small samples don't dominate leaderboards.
 */
export function wilsonLowerBound(wins: number, total: number, z = 1.96): number {
  if (total <= 0) return 0;
  const p = wins / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const centre = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  return (centre - margin) / denom;
}

export function winRate(wins: number, losses: number): number | null {
  const total = wins + losses;
  return total === 0 ? null : wins / total;
}

export const LEADERBOARD_MIN_DECIDED = 3;
export const LEADERBOARD_MIN_JURY_VOTES = 5;
