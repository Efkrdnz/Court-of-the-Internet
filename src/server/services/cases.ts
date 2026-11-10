import "server-only";
import { randomBytes } from "node:crypto";
import type { ArgumentRole, CaseStatus, VoteChoice } from "@prisma/client";
import { db, type Tx } from "../db";
import { clock } from "../clock";
import { gameConfig } from "../config";
import { CourtError, isUniqueViolation } from "../errors";
import { screenFields, screenText, similarity } from "@/lib/content-filter";
import { casePath, formatCaseNumber, slugify } from "@/lib/text";
import { XP } from "@/lib/progression";
import { awardXp, assertActiveUser, checkStatAchievements, grantAchievements, notify } from "./progress";

export const OPEN_STATUS: Record<ArgumentRole, CaseStatus> = {
  DEFENSE: "AWAITING_DEFENSE",
  PROSECUTION: "AWAITING_PROSECUTION",
};
export const CLAIMED_STATUS: Record<ArgumentRole, CaseStatus> = {
  DEFENSE: "DEFENSE_CLAIMED",
  PROSECUTION: "PROSECUTION_CLAIMED",
};
const ROLE_NOUN: Record<ArgumentRole, string> = { DEFENSE: "defense attorney", PROSECUTION: "prosecutor" };

/* ------------------------------------------------------------------ */
/* Phase 1: Confession                                                 */
/* ------------------------------------------------------------------ */

export interface ConfessionData {
  title: string;
  category: string;
  confession: string;
  context?: string;
  anonymous: boolean;
}

/** Content-filter checks, exported so actions can run them before spending rate-limit budget. */
export function screenConfession(input: Pick<ConfessionData, "title" | "confession" | "context">) {
  const screened = screenFields({ title: input.title, confession: input.confession, context: input.context });
  if (!screened.ok) throw new CourtError("CONTENT_REJECTED", screened.message!, screened.field);
}

export function screenArgument(body: string) {
  const screened = screenText(body);
  if (!screened.ok) throw new CourtError("CONTENT_REJECTED", screened.message!, "body");
}

/**
 * Daily cap and duplicate checks. Runs inside the confession transaction (under the per-user
 * lock) and, read-only, in the action before the rate limiter, so a rejected duplicate doesn't
 * use up the player's confession budget.
 */
async function checkConfessionAllowed(client: Tx | typeof db, userId: string, input: Pick<ConfessionData, "title" | "confession">) {
  const now = clock.now();
  const dayAgo = new Date(now.getTime() - 24 * 3_600_000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3_600_000);
  const recentCount = await client.case.count({ where: { accusedId: userId, createdAt: { gte: dayAgo } } });
  if (recentCount >= gameConfig.maxConfessionsPerDay) {
    throw new CourtError(
      "RATE_LIMITED",
      `The court accepts at most ${gameConfig.maxConfessionsPerDay} confessions per day. Come back tomorrow, menace.`,
    );
  }

  const recent = await client.case.findMany({
    where: { accusedId: userId, createdAt: { gte: monthAgo } },
    select: { title: true, confession: true },
    take: 50,
    orderBy: { createdAt: "desc" },
  });
  for (const r of recent) {
    if (r.title.toLowerCase() === input.title.toLowerCase() || similarity(r.confession, input.confession) > 0.75) {
      throw new CourtError("CONFLICT", "You've already confessed to this crime recently. Double jeopardy!", "confession");
    }
  }
  const globalDupe = await client.case.findFirst({
    where: {
      confession: { equals: input.confession, mode: "insensitive" },
      createdAt: { gte: new Date(now.getTime() - 7 * 24 * 3_600_000) },
    },
    select: { id: true },
  });
  if (globalDupe) {
    throw new CourtError("CONFLICT", "That exact confession is already on the docket. Copy-paste crimes are inadmissible.", "confession");
  }
}

export async function precheckConfession(userId: string, input: Pick<ConfessionData, "title" | "confession">) {
  await checkConfessionAllowed(db, userId, input);
}

export async function confess(userId: string, input: ConfessionData) {
  screenConfession(input);

  const now = clock.now();

  return db.$transaction(async (tx) => {
    await assertActiveUser(tx, userId);
    // Serialise confessions per user so the daily cap can't be raced.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"confess:" + userId}))`;
    // Identical confessions from different players at the same moment are serialised too, so the
    // site-wide duplicate check below sees the first one. (Always taken after the per-user lock,
    // and by nothing else, so the two can't deadlock.)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"confess-text:" + input.confession.toLowerCase()}))`;

    await checkConfessionAllowed(tx, userId, input);

    const created = await tx.case.create({
      data: {
        title: input.title,
        slug: slugify(input.title),
        category: input.category,
        confession: input.confession,
        context: input.context ?? null,
        anonymous: input.anonymous,
        aliasSeed: randomBytes(8).toString("hex"),
        accusedId: userId,
        createdAt: now,
      },
      select: { id: true, number: true, slug: true, title: true },
    });

    await tx.userStats.update({
      where: { userId },
      data: {
        totalConfessions: { increment: 1 },
        ...(input.anonymous ? {} : { casesConfessed: { increment: 1 } }),
      },
    });
    // Anonymous confessions are off the record: no XP or achievements, because anything that
    // changes on the public profile right after filing would identify the confessor.
    if (!input.anonymous) {
      await awardXp(tx, userId, XP.confess, "confess", created.id);
      await checkStatAchievements(tx, userId, created.id);
    }
    if (!input.anonymous && input.category === "food-crimes") {
      await grantAchievements(tx, userId, ["snack-attack"], created.id);
    }
    return created;
  });
}

/* ------------------------------------------------------------------ */
/* Phases 2 & 3: Claims                                                */
/* ------------------------------------------------------------------ */

function eligibilityError(
  c: { accusedId: string; attorneyId: string | null; prosecutorId: string | null },
  userId: string,
  role: ArgumentRole,
): string | null {
  if (c.accusedId === userId) {
    return role === "DEFENSE"
      ? "Nice try, but you can't defend yourself. The court appoints a stranger."
      : "You can't prosecute your own crime. That's just a confession with extra steps.";
  }
  if (role === "PROSECUTION" && c.attorneyId === userId) {
    return "You defended this case. Switching sides mid-trial is frowned upon (and forbidden).";
  }
  return null;
}

export async function claimCase(userId: string, caseId: string, role: ArgumentRole) {
  return db.$transaction(async (tx) => {
    await assertActiveUser(tx, userId);
    // One claim attempt per user at a time, so the "one active claim per role" rule holds under concurrency.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"claim:" + userId}))`;
    const now = clock.now();
    const openStatus = OPEN_STATUS[role];
    const claimedStatus = CLAIMED_STATUS[role];

    // A claim stays the holder's through the grace period, so nobody can snatch a case
    // from a writer who is still allowed to file it.
    const reclaimableBefore = new Date(now.getTime() - gameConfig.claimGraceMs);
    const current = await tx.case.findFirst({
      where: { claimedById: userId, status: claimedStatus, claimExpiresAt: { gte: reclaimableBefore } },
      select: { id: true, number: true, claimExpiresAt: true },
    });
    if (current?.id === caseId) return { caseId, expiresAt: current.claimExpiresAt!, alreadyHeld: true };
    if (current) {
      throw new CourtError(
        "INELIGIBLE",
        `You're already the ${ROLE_NOUN[role]} on Case No. ${formatCaseNumber(current.number)}. File or release it first.`,
      );
    }

    const c = await tx.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        number: true,
        title: true,
        slug: true,
        status: true,
        accusedId: true,
        attorneyId: true,
        prosecutorId: true,
        claimedById: true,
        claimExpiresAt: true,
        moderationState: true,
        anonymous: true,
      },
    });
    if (!c || c.moderationState === "REMOVED") throw new CourtError("NOT_FOUND", "That case could not be found.");
    if (c.moderationState === "UNDER_REVIEW") {
      throw new CourtError("INVALID_STATE", "This case is under review by the court clerks and can't be claimed right now.");
    }
    // Anonymous cases aren't held (that would reveal the banned confessor).
    const accused = c.anonymous ? null : await tx.user.findUnique({ where: { id: c.accusedId }, select: { bannedAt: true } });
    if (accused?.bannedAt) throw new CourtError("INVALID_STATE", "The accused has been held in contempt of court, so this case is on hold.");
    const ineligible = eligibilityError(c, userId, role);
    if (ineligible) throw new CourtError("INELIGIBLE", ineligible);
    if (c.status !== openStatus && c.status !== claimedStatus) {
      const ahead = role === "DEFENSE" || (c.status !== "AWAITING_DEFENSE" && c.status !== "DEFENSE_CLAIMED");
      throw new CourtError(
        "INVALID_STATE",
        ahead
          ? `This case has already moved past the ${ROLE_NOUN[role]} stage.`
          : "This case still needs a defense before a prosecutor can take it.",
      );
    }

    const expiresAt = new Date(now.getTime() + gameConfig.claimMs);
    const result = await tx.case.updateMany({
      where: {
        id: caseId,
        moderationState: "VISIBLE",
        accusedId: { not: userId },
        ...(role === "PROSECUTION" ? { attorneyId: { not: userId } } : {}),
        OR: [
          { status: openStatus },
          { status: claimedStatus, claimExpiresAt: { lt: reclaimableBefore } },
          { status: claimedStatus, claimedById: null }, // orphaned claim: never block the case
        ],
      },
      data: { status: claimedStatus, claimedById: userId, claimExpiresAt: expiresAt },
    });
    if (result.count === 0) {
      throw new CourtError("CONFLICT", "Too slow, counselor! Another player already claimed this case.");
    }

    // A lazily-reclaimed expired claim: close out the previous holder's record.
    const stale = await tx.caseClaim.findMany({ where: { caseId, role, outcome: "ACTIVE" }, select: { id: true, userId: true } });
    if (stale.length) {
      await tx.caseClaim.updateMany({ where: { id: { in: stale.map((s) => s.id) } }, data: { outcome: "EXPIRED", resolvedAt: now } });
      for (const s of stale) {
        if (s.userId === userId) continue; // re-claiming your own expired case: nothing to tell you
        await notify(tx, s.userId, {
          type: "CLAIM_EXPIRED",
          title: `Your claim on Case No. ${formatCaseNumber(c.number)} expired`,
          body: "The case went back on the docket and another player picked it up.",
          href: role === "DEFENSE" ? "/defend" : "/prosecute",
        });
      }
    }

    await tx.caseClaim.create({ data: { caseId, userId, role, claimedAt: now, expiresAt } });
    // Tell the accused once per stage, not again each time a released or expired case is re-claimed.
    const toldAlready = await tx.notification.findFirst({
      where: { userId: c.accusedId, type: "CASE_CLAIMED", href: casePath(c), title: role === "DEFENSE" ? "An attorney has taken your case!" : "A prosecutor is coming for you…" },
      select: { id: true },
    });
    if (!toldAlready) await notify(tx, c.accusedId, {
      type: "CASE_CLAIMED",
      title: role === "DEFENSE" ? "An attorney has taken your case!" : "A prosecutor is coming for you…",
      body:
        role === "DEFENSE"
          ? `Someone is drafting your defense for “${c.title}”.`
          : `A prosecutor is preparing a rebuttal for “${c.title}”.`,
      href: casePath(c),
    });
    return { caseId, expiresAt, alreadyHeld: false };
  });
}

export async function releaseClaim(userId: string, caseId: string) {
  return db.$transaction(async (tx) => {
    const now = clock.now();
    const c = await tx.case.findUnique({ where: { id: caseId }, select: { status: true, claimedById: true } });
    if (!c || c.claimedById !== userId) throw new CourtError("INVALID_STATE", "You don't hold a claim on this case.");
    const role: ArgumentRole = c.status === "DEFENSE_CLAIMED" ? "DEFENSE" : "PROSECUTION";
    const res = await tx.case.updateMany({
      where: { id: caseId, claimedById: userId, status: CLAIMED_STATUS[role] },
      data: { status: OPEN_STATUS[role], claimedById: null, claimExpiresAt: null },
    });
    if (res.count === 0) throw new CourtError("INVALID_STATE", "You don't hold a claim on this case.");
    await tx.caseClaim.updateMany({
      where: { caseId, userId, outcome: "ACTIVE" },
      data: { outcome: "RELEASED", resolvedAt: now },
    });
    return { role };
  });
}

/* ------------------------------------------------------------------ */
/* Argument submission                                                 */
/* ------------------------------------------------------------------ */

export async function submitArgument(userId: string, caseId: string, role: ArgumentRole, body: string) {
  screenArgument(body);

  return db.$transaction(async (tx) => {
    await assertActiveUser(tx, userId);
    // Lock the case row before reading its moderation state: a report or a moderator acting at the
    // same moment then runs strictly before or after this filing, so the trial is paused if and
    // only if the case is under review when deliberation starts.
    await tx.$queryRaw`SELECT "id" FROM "Case" WHERE "id" = ${caseId} FOR UPDATE`;
    const now = clock.now();
    const claimedStatus = CLAIMED_STATUS[role];
    const c = await tx.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        number: true,
        slug: true,
        title: true,
        status: true,
        accusedId: true,
        attorneyId: true,
        claimedById: true,
        claimExpiresAt: true,
        moderationState: true,
        arguments: { where: { role }, select: { id: true, authorId: true } },
      },
    });
    if (!c) throw new CourtError("NOT_FOUND", "That case could not be found.");
    // The writer knew the case: tell them what happened rather than "not found".
    if (c.moderationState === "REMOVED") {
      throw new CourtError("NOT_FOUND", "A moderator sealed this case while you were writing, so it can't take arguments. Your draft is saved on this device.");
    }
    if (c.arguments.length > 0) {
      // A double-submit finds its own first copy: say so in the second person.
      if (c.arguments[0].authorId === userId) throw new CourtError("ALREADY_DONE", `Your ${role === "DEFENSE" ? "defense" : "prosecution"} is already on file.`);
      throw new CourtError("ALREADY_DONE", `The ${ROLE_NOUN[role]} has already filed for this case.`);
    }
    const ineligible = eligibilityError({ ...c, prosecutorId: null }, userId, role);
    if (ineligible) throw new CourtError("INELIGIBLE", ineligible);
    if (c.status !== claimedStatus || c.claimedById !== userId) {
      throw new CourtError("INVALID_STATE", "You don't hold the claim on this case. It may have expired and been requeued.");
    }
    if (!c.claimExpiresAt || c.claimExpiresAt.getTime() + gameConfig.claimGraceMs < now.getTime()) {
      throw new CourtError("INVALID_STATE", "Your claim expired before you filed, so the case went back on the docket. Your draft is saved on this device in case you get it again.");
    }

    const isProsecution = role === "PROSECUTION";
    const deliberationEndsAt = new Date(now.getTime() + gameConfig.deliberationMs);
    const advanced = await tx.case.updateMany({
      where: { id: caseId, status: claimedStatus, claimedById: userId },
      data: isProsecution
        ? {
            status: "DELIBERATION",
            prosecutorId: userId,
            claimedById: null,
            claimExpiresAt: null,
            prosecutionFiledAt: now,
            deliberationStartsAt: now,
            deliberationEndsAt,
            // A case under review starts its trial with the clock stopped.
            deliberationPausedAt: c.moderationState === "UNDER_REVIEW" ? now : null,
          }
        : {
            status: "AWAITING_PROSECUTION",
            attorneyId: userId,
            claimedById: null,
            claimExpiresAt: null,
            defenseFiledAt: now,
          },
    });
    if (advanced.count === 0) {
      // A double-submit: the first copy already filed, so say so rather than "the case changed".
      const mine = await tx.argument.findFirst({ where: { caseId, role, authorId: userId }, select: { id: true } });
      if (mine) throw new CourtError("ALREADY_DONE", `Your ${role === "DEFENSE" ? "defense" : "prosecution"} is already on file.`);
      throw new CourtError("CONFLICT", "The case changed while you were writing. Please refresh.");
    }

    const claim = await tx.caseClaim.findFirst({
      where: { caseId, userId, role, outcome: "ACTIVE" },
      orderBy: { claimedAt: "desc" },
    });
    const writingSeconds = claim ? Math.max(0, Math.round((now.getTime() - claim.claimedAt.getTime()) / 1000)) : 0;
    try {
      await tx.argument.create({ data: { caseId, authorId: userId, role, body, createdAt: now, writingSeconds } });
    } catch (e) {
      if (isUniqueViolation(e)) throw new CourtError("ALREADY_DONE", `The ${ROLE_NOUN[role]} has already filed for this case.`);
      throw e;
    }
    if (claim) {
      await tx.caseClaim.update({ where: { id: claim.id }, data: { outcome: "SUBMITTED", resolvedAt: now } });
    }

    await tx.userStats.update({
      where: { userId },
      data: isProsecution ? { prosecutionsFiled: { increment: 1 } } : { defensesFiled: { increment: 1 } },
    });
    await awardXp(tx, userId, XP.fileArgument, isProsecution ? "file-prosecution" : "file-defense", caseId);
    await checkStatAchievements(tx, userId, caseId);
    if (claim && writingSeconds <= 180) await grantAchievements(tx, userId, ["speed-lawyer"], caseId);

    const href = casePath(c);
    if (isProsecution) {
      const msg = {
        type: "PROSECUTION_FILED" as const,
        title: "The jury is now deliberating",
        body:
          c.moderationState === "UNDER_REVIEW"
            ? `Both sides have spoken on “${c.title}”. The case is under review, so the jury's clock starts once the clerks finish.`
            : `Both sides have spoken on “${c.title}”. The verdict arrives in ${Math.round(gameConfig.deliberationMs / 3_600_000)}h.`,
        href,
      };
      await notify(tx, c.accusedId, msg);
      if (c.attorneyId) await notify(tx, c.attorneyId, msg);
    } else {
      await notify(tx, c.accusedId, {
        type: "DEFENSE_FILED",
        title: "Your defense has been filed",
        body: `Your attorney has spoken on “${c.title}”. Now we wait for a prosecutor.`,
        href,
      });
    }
    return { caseId, number: c.number, slug: c.slug };
  });
}

/* ------------------------------------------------------------------ */
/* Phase 4: Jury                                                       */
/* ------------------------------------------------------------------ */

export async function castVote(userId: string, caseId: string, choice: VoteChoice) {
  return db.$transaction(async (tx) => {
    await assertActiveUser(tx, userId);
    const now = clock.now();
    const c = await tx.case.findUnique({
      where: { id: caseId },
      select: {
        status: true,
        accusedId: true,
        attorneyId: true,
        prosecutorId: true,
        deliberationEndsAt: true,
        moderationState: true,
      },
    });
    if (!c || c.moderationState === "REMOVED") throw new CourtError("NOT_FOUND", "That case could not be found.");
    if (c.status !== "DELIBERATION") throw new CourtError("INVALID_STATE", "This case isn't accepting votes.");
    // Review first: a paused trial's clock is stopped, so its wall-clock deadline may have passed.
    if (c.moderationState === "UNDER_REVIEW") {
      throw new CourtError("INVALID_STATE", "Voting is paused while the clerks review this case.");
    }
    if (!c.deliberationEndsAt || c.deliberationEndsAt <= now) {
      throw new CourtError("INVALID_STATE", "Deliberation has closed. The verdict is being read.");
    }
    if ([c.accusedId, c.attorneyId, c.prosecutorId].includes(userId)) {
      throw new CourtError("INELIGIBLE", "You're part of this case, so you can't sit on its jury. Nice try.");
    }
    const existing = await tx.vote.findUnique({ where: { caseId_userId: { caseId, userId } }, select: { id: true } });
    if (existing) throw new CourtError("ALREADY_DONE", "You've already voted on this case. The court remembers.");

    // Row-locking conditional update: serialises against the closing transaction.
    const counted = await tx.case.updateMany({
      // Re-checks visibility under the row lock: a case sealed or put under review while this vote
      // was in flight must not count it.
      where: { id: caseId, status: "DELIBERATION", moderationState: "VISIBLE", deliberationEndsAt: { gt: now } },
      data: choice === "GUILTY" ? { guiltyVotes: { increment: 1 } } : { notGuiltyVotes: { increment: 1 } },
    });
    if (counted.count === 0) throw new CourtError("INVALID_STATE", "This case stopped taking votes a moment ago (closed or paused for review).");
    try {
      await tx.vote.create({ data: { caseId, userId, choice, createdAt: now } });
    } catch (e) {
      if (isUniqueViolation(e)) throw new CourtError("ALREADY_DONE", "You've already voted on this case. The court remembers.");
      throw e;
    }
    await tx.userStats.update({ where: { userId }, data: { juryVotes: { increment: 1 } } });
    // Once per case: a vote removed by a ban and cast again after an unban earns nothing new.
    const paid = await tx.xpEvent.findFirst({ where: { userId, caseId, reason: "jury-vote" }, select: { id: true } });
    if (!paid) await awardXp(tx, userId, XP.juryVote, "jury-vote", caseId);
    await checkStatAchievements(tx, userId, caseId);

    const tallies = await tx.case.findUniqueOrThrow({
      where: { id: caseId },
      select: { guiltyVotes: true, notGuiltyVotes: true },
    });
    return { choice, ...tallies };
  });
}

/** Re-exported for actions that need to know eligibility without mutating. */
export function participantRole(
  c: { accusedId: string; attorneyId: string | null; prosecutorId: string | null },
  userId: string | null | undefined,
): "ACCUSED" | "DEFENSE" | "PROSECUTION" | null {
  if (!userId) return null;
  if (c.accusedId === userId) return "ACCUSED";
  if (c.attorneyId === userId) return "DEFENSE";
  if (c.prosecutorId === userId) return "PROSECUTION";
  return null;
}

export type { Tx };
