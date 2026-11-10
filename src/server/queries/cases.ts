import "server-only";
import type { CaseStatus, Prisma, Verdict } from "@prisma/client";
import { db } from "../db";
import { clock } from "../clock";
import { gameConfig } from "../config";
import { truncate } from "@/lib/text";
import { hitRateLimit } from "../rate-limit";
import { anonymousAlias } from "@/lib/alias";
import { parseAvatar, type AvatarConfig } from "@/lib/avatar";
import { getCategory } from "@/lib/categories";

/* ------------------------------------------------------------------ */
/* DTOs: the only shapes that leave the server. No user ids for        */
/* anonymous defendants, no raw tallies before a juror has voted.      */
/* ------------------------------------------------------------------ */

export interface PersonDTO {
  username: string | null; // null = anonymous / not linkable
  displayName: string;
  avatar: AvatarConfig | null;
  anonymousCritter?: string;
  isViewer: boolean;
}

export interface CaseCardDTO {
  id: string;
  number: number;
  slug: string;
  title: string;
  category: string;
  confession: string;
  status: CaseStatus;
  verdict: Verdict | null;
  anonymous: boolean;
  createdAt: string;
  closedAt: string | null;
  deliberationEndsAt: string | null;
  claimExpiresAt: string | null;
  accused: PersonDTO;
  attorney: PersonDTO | null;
  prosecutor: PersonDTO | null;
  votesCast: number;
  /** Only present when the viewer may see the split. */
  tallies: { guilty: number; notGuilty: number } | null;
  reactions: { HILARIOUS: number; OUTRAGEOUS: number; LEGENDARY: number; RELATABLE: number };
  reactionScore: number;
  controversy: number;
  extensionsUsed: number;
  viewer: {
    role: "ACCUSED" | "DEFENSE" | "PROSECUTION" | null;
    holdsClaim: boolean;
    hasVoted: boolean;
    vote: "GUILTY" | "NOT_GUILTY" | null;
  };
  claimedBySomeone: boolean;
}

const personSelect = { username: true, displayName: true, avatar: true, deletedAt: true } as const;

export const caseCardSelect = {
  id: true,
  number: true,
  slug: true,
  title: true,
  category: true,
  confession: true,
  status: true,
  verdict: true,
  anonymous: true,
  aliasSeed: true,
  createdAt: true,
  closedAt: true,
  deliberationEndsAt: true,
  claimExpiresAt: true,
  claimedById: true,
  accusedId: true,
  attorneyId: true,
  prosecutorId: true,
  guiltyVotes: true,
  notGuiltyVotes: true,
  hilariousCount: true,
  outrageousCount: true,
  legendaryCount: true,
  relatableCount: true,
  reactionScore: true,
  controversy: true,
  extensionsUsed: true,
  accused: { select: personSelect },
  attorney: { select: personSelect },
  prosecutor: { select: personSelect },
} satisfies Prisma.CaseSelect;

export type CaseCardRow = Prisma.CaseGetPayload<{ select: typeof caseCardSelect }>;

function person(
  p: { username: string; displayName: string; avatar: Prisma.JsonValue; deletedAt: Date | null },
  isViewer: boolean,
): PersonDTO {
  if (p.deletedAt) return { username: null, displayName: "Former Citizen", avatar: null, isViewer };
  return { username: p.username, displayName: p.displayName, avatar: parseAvatar(p.avatar), isViewer };
}

export function anonymousPerson(seed: string, isViewer: boolean): PersonDTO {
  const alias = anonymousAlias(seed);
  return {
    username: null,
    displayName: isViewer ? `You (as ${alias.name})` : alias.name,
    avatar: null,
    anonymousCritter: alias.critter,
    isViewer,
  };
}

export function toCaseCard(
  row: CaseCardRow,
  viewer: { id: string; staff?: boolean } | null,
  viewerVote: "GUILTY" | "NOT_GUILTY" | null = null,
): CaseCardDTO {
  const viewerId = viewer?.id ?? null;
  const role =
    viewerId === row.accusedId
      ? "ACCUSED"
      : viewerId && viewerId === row.attorneyId
        ? "DEFENSE"
        : viewerId && viewerId === row.prosecutorId
          ? "PROSECUTION"
          : null;
  const closed = row.status === "CLOSED";
  const canSeeTallies = closed || viewerVote !== null;
  const now = clock.now();
  // The holder keeps the case through the grace period (they may still file), so it isn't up for grabs yet.
  const claimLive = !!row.claimedById && !!row.claimExpiresAt && row.claimExpiresAt.getTime() + gameConfig.claimGraceMs > now.getTime();
  return {
    id: row.id,
    number: row.number,
    slug: row.slug,
    title: row.title,
    category: getCategory(row.category).key,
    confession: row.confession,
    status: row.status,
    verdict: row.verdict,
    anonymous: row.anonymous,
    createdAt: row.createdAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    deliberationEndsAt: row.deliberationEndsAt?.toISOString() ?? null,
    claimExpiresAt: claimLive && row.claimedById === viewerId ? row.claimExpiresAt!.toISOString() : null,
    accused: row.anonymous ? anonymousPerson(row.aliasSeed, role === "ACCUSED") : person(row.accused, role === "ACCUSED"),
    attorney: row.attorney ? person(row.attorney, role === "DEFENSE") : null,
    prosecutor: row.prosecutor ? person(row.prosecutor, role === "PROSECUTION") : null,
    votesCast: row.guiltyVotes + row.notGuiltyVotes,
    tallies: canSeeTallies ? { guilty: row.guiltyVotes, notGuilty: row.notGuiltyVotes } : null,
    reactions: {
      HILARIOUS: row.hilariousCount,
      OUTRAGEOUS: row.outrageousCount,
      LEGENDARY: row.legendaryCount,
      RELATABLE: row.relatableCount,
    },
    reactionScore: row.reactionScore,
    controversy: row.controversy,
    extensionsUsed: row.extensionsUsed,
    viewer: {
      role,
      holdsClaim: claimLive && row.claimedById === viewerId,
      hasVoted: viewerVote !== null,
      vote: viewerVote,
    },
    claimedBySomeone: claimLive,
  };
}

async function viewerVotes(viewerId: string | null | undefined, caseIds: string[]) {
  if (!viewerId || caseIds.length === 0) return new Map<string, "GUILTY" | "NOT_GUILTY">();
  const votes = await db.vote.findMany({
    where: { userId: viewerId, caseId: { in: caseIds } },
    select: { caseId: true, choice: true },
  });
  return new Map(votes.map((v) => [v.caseId, v.choice]));
}

export async function toCaseCards(rows: CaseCardRow[], viewer: { id: string } | null) {
  const votes = await viewerVotes(viewer?.id, rows.map((r) => r.id));
  return rows.map((r) => toCaseCard(r, viewer, votes.get(r.id) ?? null));
}

/* ------------------------------------------------------------------ */
/* Queues                                                              */
/* ------------------------------------------------------------------ */

export type QueueSort = "newest" | "oldest";
export const PAGE_SIZE = 12;

export interface QueueOptions {
  role: "DEFENSE" | "PROSECUTION";
  viewer: { id: string; mutedCategories: string[] } | null;
  category?: string;
  sort?: QueueSort;
  page?: number;
}

function queueWhere(role: "DEFENSE" | "PROSECUTION", now: Date): Prisma.CaseWhereInput {
  const open: CaseStatus = role === "DEFENSE" ? "AWAITING_DEFENSE" : "AWAITING_PROSECUTION";
  const claimed: CaseStatus = role === "DEFENSE" ? "DEFENSE_CLAIMED" : "PROSECUTION_CLAIMED";
  return {
    moderationState: "VISIBLE",
    // A banned player's public open cases are on hold. Anonymous ones stay: hiding them the
    // moment someone is banned would reveal which anonymous cases were theirs.
    AND: [
      { OR: [{ anonymous: true }, { accused: { bannedAt: null } }] },
      { OR: [{ status: open }, { status: claimed, claimExpiresAt: { lt: new Date(now.getTime() - gameConfig.claimGraceMs) } }] },
    ],
  };
}

export async function listQueue(opts: QueueOptions) {
  const now = clock.now();
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.CaseWhereInput = {
    ...queueWhere(opts.role, now),
    ...(opts.category ? { category: opts.category } : opts.viewer?.mutedCategories.length ? { category: { notIn: opts.viewer.mutedCategories } } : {}),
  };
  // Prosecution queues order by when the defense was filed (i.e. time waiting in this queue).
  const timeField = opts.role === "PROSECUTION" ? "defenseFiledAt" : "createdAt";
  const orderBy: Prisma.CaseOrderByWithRelationInput[] = [{ [timeField]: opts.sort === "oldest" ? "asc" : "desc" }];
  const [rows, total] = await Promise.all([
    db.case.findMany({ where, orderBy, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, select: caseCardSelect }),
    db.case.count({ where }),
  ]);
  const cards = await toCaseCards(rows, opts.viewer);
  const defenses =
    opts.role === "PROSECUTION" && rows.length
      ? await db.argument.findMany({
          where: { caseId: { in: rows.map((r) => r.id) }, role: "DEFENSE" },
          select: { caseId: true, body: true, stricken: true },
        })
      : [];
  return {
    cards: cards.map((c) => {
      const d = defenses.find((x) => x.caseId === c.id);
      return {
        ...c,
        eligibility: queueEligibility(rows.find((r) => r.id === c.id)!, opts.role, opts.viewer?.id),
        defenseExcerpt: d && !d.stricken ? d.body : null,
      };
    }),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export function queueEligibility(
  row: { accusedId: string; attorneyId: string | null },
  role: "DEFENSE" | "PROSECUTION",
  viewerId: string | null | undefined,
): { ok: boolean; reason?: string } {
  if (!viewerId) return { ok: false, reason: "Sign in to take this case" };
  if (row.accusedId === viewerId) return { ok: false, reason: "This is your own confession" };
  if (role === "PROSECUTION" && row.attorneyId === viewerId) return { ok: false, reason: "You defended this case" };
  return { ok: true };
}

/** For "assign me a case": random eligible case for the viewer. */
export async function pickRandomQueueCase(role: "DEFENSE" | "PROSECUTION", viewer: { id: string; mutedCategories: string[] }) {
  const now = clock.now();
  const where: Prisma.CaseWhereInput = {
    ...queueWhere(role, now),
    accusedId: { not: viewer.id },
    ...(role === "PROSECUTION" ? { attorneyId: { not: viewer.id } } : {}),
    ...(viewer.mutedCategories.length ? { category: { notIn: viewer.mutedCategories } } : {}),
    // "Receive a case" hands out something new, not a case this player just dropped (and may be
    // out of claims on for today).
    claims: { none: { userId: viewer.id, role, outcome: { in: ["ACTIVE", "EXPIRED", "RELEASED"] }, claimedAt: { gte: new Date(now.getTime() - gameConfig.unfiledClaimWindowMs) } } },
  };
  const count = await db.case.count({ where });
  if (count === 0) return null;
  const skip = Math.floor(Math.random() * Math.min(count, 50));
  return db.case.findFirst({ where, orderBy: { createdAt: "asc" }, skip, select: { id: true } });
}

export async function currentClaim(viewerId: string) {
  const now = clock.now();
  const rows = await db.case.findMany({
    where: { claimedById: viewerId, claimExpiresAt: { gt: new Date(now.getTime() - gameConfig.claimGraceMs) }, status: { in: ["DEFENSE_CLAIMED", "PROSECUTION_CLAIMED"] } },
    select: caseCardSelect,
  });
  return toCaseCards(rows, { id: viewerId });
}

/* ------------------------------------------------------------------ */
/* Jury                                                                */
/* ------------------------------------------------------------------ */

export async function listJuryCases(viewer: { id: string; mutedCategories: string[] } | null, opts: { page?: number; includeVoted?: boolean } = {}) {
  const now = clock.now();
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.CaseWhereInput = {
    status: "DELIBERATION",
    moderationState: "VISIBLE",
    deliberationEndsAt: { gt: now },
    ...(viewer
      ? {
          accusedId: { not: viewer.id },
          attorneyId: { not: viewer.id },
          prosecutorId: { not: viewer.id },
          ...(opts.includeVoted ? {} : { votes: { none: { userId: viewer.id } } }),
          ...(viewer.mutedCategories.length ? { category: { notIn: viewer.mutedCategories } } : {}),
        }
      : {}),
  };
  // Cases furthest from quorum first (by *total* votes, so the order never hints at the hidden
  // guilty/not-guilty split), then the ones ending soonest. Only live trials are ranked, so the
  // candidate set stays small.
  const candidates = await db.case.findMany({
    where,
    select: { id: true, guiltyVotes: true, notGuiltyVotes: true, deliberationEndsAt: true, number: true },
  });
  candidates.sort(
    (a, b) =>
      a.guiltyVotes + a.notGuiltyVotes - (b.guiltyVotes + b.notGuiltyVotes) ||
      (a.deliberationEndsAt?.getTime() ?? 0) - (b.deliberationEndsAt?.getTime() ?? 0) ||
      a.number - b.number,
  );
  const pageIds = candidates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c) => c.id);
  const fetched = await db.case.findMany({ where: { id: { in: pageIds } }, select: caseCardSelect });
  const rows = pageIds.map((id) => fetched.find((r) => r.id === id)!).filter(Boolean);
  const total = candidates.length;
  return { cards: await toCaseCards(rows, viewer), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/* ------------------------------------------------------------------ */
/* Case detail                                                         */
/* ------------------------------------------------------------------ */

export async function getCaseDetail(number: number, viewer: { id: string; role: string } | null) {
  const row = await db.case.findUnique({
    where: { number },
    select: {
      ...caseCardSelect,
      context: true,
      moderationState: true,
      removalReason: true,
      defenseFiledAt: true,
      prosecutionFiledAt: true,
      deliberationStartsAt: true,
      viewCount: true,
      arguments: { select: { role: true, body: true, stricken: true, createdAt: true, writingSeconds: true } },
    },
  });
  if (!row) return null;
  const staff = viewer?.role === "ADMIN" || viewer?.role === "MODERATOR";
  // The player holding the claim counts too: they may still file while the clerks review the case.
  const isParticipant = !!viewer && [row.accusedId, row.attorneyId, row.prosecutorId, row.claimedById].includes(viewer.id);
  if (row.moderationState === "REMOVED" && !staff) {
    return { kind: "removed" as const, number: row.number, title: row.title, reason: row.removalReason };
  }
  if (row.moderationState === "UNDER_REVIEW" && !staff && !isParticipant) {
    return { kind: "review" as const, number: row.number };
  }

  const [vote, reactions, reports] = await Promise.all([
    viewer ? db.vote.findUnique({ where: { caseId_userId: { caseId: row.id, userId: viewer.id } }, select: { choice: true } }) : null,
    viewer ? db.reaction.findMany({ where: { caseId: row.id, userId: viewer.id }, select: { type: true } }) : [],
    viewer ? db.report.findMany({ where: { caseId: row.id, reporterId: viewer.id }, select: { target: true } }) : [],
  ]);
  const card = toCaseCard(row, viewer ? { id: viewer.id, staff } : null, vote?.choice ?? null);

  // Arguments are revealed progressively: the prosecutor sees the defense, jurors see everything.
  const defense = row.arguments.find((a) => a.role === "DEFENSE");
  const prosecution = row.arguments.find((a) => a.role === "PROSECUTION");
  const argDTO = (a: typeof defense) =>
    a ? { body: a.stricken && !staff ? null : a.body, stricken: a.stricken, createdAt: a.createdAt.toISOString(), writingSeconds: a.writingSeconds } : null;

  const timeline = [
    { key: "confessed", label: "Confession filed", at: row.createdAt.toISOString() },
    row.defenseFiledAt && { key: "defense", label: "Defense filed", at: row.defenseFiledAt.toISOString() },
    row.prosecutionFiledAt && { key: "prosecution", label: "Prosecution filed; jury seated", at: row.prosecutionFiledAt.toISOString() },
    row.extensionsUsed > 0 && { key: "extended", label: `Deliberation extended (low turnout)`, at: null },
    row.closedAt && { key: "verdict", label: "Verdict delivered", at: row.closedAt.toISOString() },
  ].filter(Boolean) as { key: string; label: string; at: string | null }[];

  return {
    kind: "ok" as const,
    underReview: row.moderationState === "UNDER_REVIEW",
    case: card,
    context: row.context,
    moderationState: row.moderationState,
    defense: argDTO(defense),
    prosecution: argDTO(prosecution),
    timeline,
    viewerReactions: reactions.map((r) => r.type),
    viewerReports: reports.map((r) => r.target),
    viewCount: row.viewCount,
    staff,
    quorum: gameConfig.quorum,
  };
}

/** Counts a view at most once per viewer (account, or IP when logged out) per case every 6 hours. */
export async function bumpViewCount(caseId: string, viewerKey: string) {
  try {
    const { allowed } = await hitRateLimit(`view:${caseId}:${viewerKey}`, 1, 6 * 3600);
    if (allowed) await db.case.update({ where: { id: caseId }, data: { viewCount: { increment: 1 } } });
  } catch {
    // A view counter must never break the page.
  }
}

export async function getCaseIdByNumber(number: number) {
  return db.case.findUnique({ where: { number }, select: { id: true, status: true, number: true, slug: true, moderationState: true } });
}

export async function relatedCases(caseId: string, category: string, viewer: { id: string; mutedCategories?: string[] } | null) {
  const rows = await db.case.findMany({
    where: { id: { not: caseId }, category, status: "CLOSED", moderationState: "VISIBLE" },
    orderBy: [{ reactionScore: "desc" }, { closedAt: "desc" }],
    take: 3,
    select: caseCardSelect,
  });
  if (rows.length < 3) {
    const more = await db.case.findMany({
      where: {
        id: { notIn: [caseId, ...rows.map((r) => r.id)] },
        status: "CLOSED",
        moderationState: "VISIBLE",
        // Filler from other categories respects the viewer's muted list.
        ...(viewer?.mutedCategories?.length ? { category: { notIn: viewer.mutedCategories } } : {}),
      },
      orderBy: [{ reactionScore: "desc" }],
      take: 3 - rows.length,
      select: caseCardSelect,
    });
    rows.push(...more);
  }
  return toCaseCards(rows, viewer);
}

/* ------------------------------------------------------------------ */
/* Archives                                                            */
/* ------------------------------------------------------------------ */

export type ArchiveSort = "recent" | "popular" | "controversial" | "funniest";

/** Prisma passes `contains` to ILIKE as-is, so "%" or "_" in a search would match everything. */
const likeLiteral = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listArchive(opts: {
  q?: string;
  category?: string;
  verdict?: Verdict;
  sort?: ArchiveSort;
  page?: number;
  viewer: { id: string; mutedCategories: string[] } | null;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q === undefined ? undefined : truncate(opts.q.trim(), 80);
  const where: Prisma.CaseWhereInput = {
    status: "CLOSED",
    moderationState: "VISIBLE",
    ...(opts.category ? { category: opts.category } : opts.viewer?.mutedCategories.length ? { category: { notIn: opts.viewer.mutedCategories } } : {}),
    ...(opts.verdict ? { verdict: opts.verdict } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: likeLiteral(q), mode: "insensitive" } },
            { confession: { contains: likeLiteral(q), mode: "insensitive" } },
            ...(/^\d{1,9}$/.test(q) ? [{ number: Number(q) }] : []), // longer would overflow INT
          ],
        }
      : {}),
  };
  const sort = opts.sort ?? "recent";
  const orderBy: Prisma.CaseOrderByWithRelationInput[] =
    sort === "popular"
      ? [{ reactionScore: "desc" }, { guiltyVotes: "desc" }, { closedAt: "desc" }]
      : sort === "controversial"
        ? [{ controversy: "desc" }, { guiltyVotes: "desc" }, { closedAt: "desc" }]
        : sort === "funniest"
          ? [{ hilariousCount: "desc" }, { reactionScore: "desc" }, { closedAt: "desc" }]
          : [{ closedAt: "desc" }];
  const [rows, total, verdictCounts] = await Promise.all([
    db.case.findMany({ where, orderBy, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, select: caseCardSelect }),
    db.case.count({ where }),
    db.case.groupBy({ by: ["verdict"], where: { status: "CLOSED", moderationState: "VISIBLE" }, _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(verdictCounts.map((v) => [v.verdict ?? "NONE", v._count._all])) as Record<string, number>;
  return {
    cards: await toCaseCards(rows, opts.viewer),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    verdictCounts: {
      GUILTY: counts.GUILTY ?? 0,
      NOT_GUILTY: counts.NOT_GUILTY ?? 0,
      MISTRIAL: counts.MISTRIAL ?? 0,
      DISMISSED: counts.DISMISSED ?? 0,
    },
  };
}
