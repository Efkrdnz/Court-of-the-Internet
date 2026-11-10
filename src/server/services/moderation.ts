import "server-only";
import type { ReportReason } from "@prisma/client";
import { db, type Tx } from "../db";
import { clock } from "../clock";
import { gameConfig } from "../config";
import { CourtError, isUniqueViolation } from "../errors";
import { casePath, formatCaseNumber } from "@/lib/text";
import { assertActiveUser, notify } from "./progress";
import { closeDeliberation } from "./verdict";
import { releaseClaims, sealedCaseNotice } from "./claims";
import { pauseDeliberation, resumeDeliberation } from "./pause";
import { dismissReporterOnLockedCase } from "./reports";
import { getAchievement } from "@/lib/achievements";
import { REACTION_COUNTER_FIELD, reactionWeight } from "@/lib/reactions";
import { PROFILE_THEMES, LOCKED_AVATAR_ITEMS, avatarItemKey, themeItemKey } from "@/lib/cosmetics";

/**
 * Moderation actions on one case run one at a time: each takes the case row lock first, so
 * e.g. a seal and a concurrent "dismiss reports" can't interleave and silently undo each other.
 */
async function lockCase(tx: Tx, caseId: string, moderatorId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Case" WHERE "id" = ${caseId} FOR UPDATE`;
  // Officers recuse themselves from cases they're a party to (accused, attorney or prosecutor):
  // another officer has to seal, restore, dismiss, strike, adjourn or pin it.
  const parties = await tx.case.findUnique({ where: { id: caseId }, select: { accusedId: true, attorneyId: true, prosecutorId: true } });
  if (parties && [parties.accusedId, parties.attorneyId, parties.prosecutorId].includes(moderatorId)) {
    throw new CourtError("FORBIDDEN", "You're a party to this case, so another officer of the court has to handle it.");
  }
}

/** Deliberation time a paused trial still had when it was paused (0 if it had been adjourned). */
function timeLeftWhenPaused(c: { deliberationEndsAt: Date | null; deliberationPausedAt: Date | null }): number {
  if (!c.deliberationEndsAt) return 0;
  return c.deliberationEndsAt.getTime() - (c.deliberationPausedAt ?? clock.now()).getTime();
}

/** The player a moderation action targets: must exist and not be a deleted account. */
async function liveTarget(tx: Tx, userId: string) {
  const target = await tx.user.findUnique({ where: { id: userId }, select: { role: true, bannedAt: true, deletedAt: true } });
  if (!target) throw new CourtError("NOT_FOUND", "User not found.");
  if (target.deletedAt) throw new CourtError("INVALID_STATE", "That account has been deleted.");
  return target;
}

async function assertStaff(tx: Tx, userId: string) {
  const u = await tx.user.findUnique({ where: { id: userId }, select: { role: true, bannedAt: true } });
  if (!u || u.bannedAt || (u.role !== "ADMIN" && u.role !== "MODERATOR")) {
    throw new CourtError("FORBIDDEN", "Only officers of the court may do that.");
  }
  return u;
}

async function log(tx: Tx, moderatorId: string, action: string, extra: { caseId?: string; targetUserId?: string; note?: string }) {
  await tx.moderationAction.create({ data: { moderatorId, action, ...extra, createdAt: clock.now() } });
}

export async function fileReport(
  reporterId: string,
  input: { caseId: string; target: "CASE" | "DEFENSE" | "PROSECUTION"; reason: ReportReason; details?: string },
) {
  try {
    return await db.$transaction(async (tx) => {
      await assertActiveUser(tx, reporterId);
      // Serialise reports per case, so simultaneous reporters each count the others (otherwise
      // the stored reporter count lags behind the reports actually filed).
      await tx.$queryRaw`SELECT "id" FROM "Case" WHERE "id" = ${input.caseId} FOR UPDATE`;
      const c = await tx.case.findUnique({
        where: { id: input.caseId },
        select: { id: true, moderationState: true, accusedId: true, attorneyId: true, prosecutorId: true },
      });
      if (!c || c.moderationState === "REMOVED") throw new CourtError("NOT_FOUND", "That case could not be found.");
      if (input.target !== "CASE") {
        const arg = await tx.argument.findFirst({ where: { caseId: c.id, role: input.target }, select: { id: true } });
        if (!arg) throw new CourtError("VALIDATION", "That argument hasn't been filed yet.", "target");
      }
      await tx.report.create({
        data: { caseId: c.id, reporterId, reason: input.reason, details: input.details, target: input.target, createdAt: clock.now() },
      });
      const distinctReporters = await tx.report.groupBy({
        by: ["reporterId"],
        where: { caseId: c.id, status: "OPEN" },
      });
      const open = distinctReporters.length;
      await tx.case.update({ where: { id: c.id }, data: { openReports: open } });
      // Every report reaches the moderation queue, but only established reporters can hide a case
      // on their own: accounts at least a day old whose earlier reports on this case weren't
      // dismissed. Otherwise three throwaway accounts could freeze any trial again and again.
      const minAge = new Date(clock.now().getTime() - gameConfig.reporterMinAgeMs);
      const dismissedBefore = await tx.report.findMany({
        where: { caseId: c.id, status: "DISMISSED" },
        select: { reporterId: true },
        distinct: ["reporterId"],
      });
      const established = await tx.report.findMany({
        where: {
          caseId: c.id,
          status: "OPEN",
          reporter: { createdAt: { lte: minAge } },
          // The trial's own participants can report (it reaches the queue), but can't hide or pause
          // their own case that way.
          reporterId: { notIn: [...dismissedBefore.map((d) => d.reporterId), ...([c.accusedId, c.attorneyId, c.prosecutorId].filter(Boolean) as string[])] },
        },
        select: { reporterId: true },
        distinct: ["reporterId"],
      });
      let autoReview = false;
      if (established.length >= gameConfig.autoReviewReportThreshold && c.moderationState === "VISIBLE") {
        await tx.case.update({ where: { id: c.id }, data: { moderationState: "UNDER_REVIEW" } });
        await pauseDeliberation(tx, c.id); // voting is paused, so the deadline is too
        autoReview = true;
      }
      return { autoReview };
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      // One report per player, case and target. Say whether the clerks are still on it or already ruled.
      const prior = await db.report.findFirst({ where: { caseId: input.caseId, reporterId, target: input.target }, select: { status: true } });
      throw new CourtError(
        "ALREADY_DONE",
        prior && prior.status !== "OPEN" ? "You reported this before and the clerks already reviewed it." : "You've already reported this. The clerks are on it.",
      );
    }
    throw e;
  }
}

export async function removeCase(moderatorId: string, caseId: string, reason: string) {
  return db.$transaction(async (tx) => {
    await assertStaff(tx, moderatorId);
    await lockCase(tx, caseId, moderatorId);
    const c = await tx.case.findUnique({
      where: { id: caseId },
      select: { id: true, number: true, slug: true, accusedId: true, attorneyId: true, prosecutorId: true, title: true, moderationState: true, status: true },
    });
    if (!c) throw new CourtError("NOT_FOUND", "That case could not be found.");
    if (c.moderationState === "REMOVED") throw new CourtError("ALREADY_DONE", "That case is already sealed.");
    // A sealed case can't be argued: hand any claim back so a later restore finds it on the docket.
    await releaseClaims(tx, { caseId }, sealedCaseNotice);
    await tx.case.update({ where: { id: caseId }, data: { moderationState: "REMOVED", removalReason: reason.slice(0, 300) } });
    await pauseDeliberation(tx, caseId);
    await tx.report.updateMany({ where: { caseId, status: "OPEN" }, data: { status: "ACTIONED", resolvedAt: clock.now() } });
    await tx.case.update({ where: { id: caseId }, data: { openReports: 0 } });
    await notify(tx, c.accusedId, {
      type: "MODERATION",
      title: `Case No. ${formatCaseNumber(c.number)} was sealed`,
      body: `A moderator removed “${c.title}”: ${reason.slice(0, 200)}`,
    });
    // Counsel on a live trial learn why it stopped (the accused got the notice above).
    if (c.status === "DELIBERATION") {
      for (const id of [c.attorneyId, c.prosecutorId].filter(Boolean) as string[]) {
        await notify(tx, id, {
          type: "MODERATION",
          title: `Case No. ${formatCaseNumber(c.number)} was sealed`,
          body: "A moderator paused this trial. It resumes with its remaining time if the case is restored.",
        });
      }
    }
    await log(tx, moderatorId, "REMOVE_CASE", { caseId, note: reason });
  });
}

export async function restoreCase(moderatorId: string, caseId: string) {
  return db.$transaction(async (tx) => {
    await assertStaff(tx, moderatorId);
    await lockCase(tx, caseId, moderatorId);
    const exists = await tx.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        number: true,
        slug: true,
        accusedId: true,
        attorneyId: true,
        prosecutorId: true,
        status: true,
        moderationState: true,
        deliberationEndsAt: true,
        deliberationPausedAt: true,
      },
    });
    if (!exists) throw new CourtError("NOT_FOUND", "That case could not be found.");
    // Only a sealed case can be restored (a stale console must not silently dismiss open reports).
    if (exists.moderationState !== "REMOVED") throw new CourtError("INVALID_STATE", "That case isn't sealed, so there's nothing to restore.");
    if (exists.moderationState === "REMOVED") {
      await notify(tx, exists.accusedId, {
        type: "MODERATION",
        title: `Case No. ${formatCaseNumber(exists.number)} was restored`,
        body: "A moderator reviewed the seal and put your case back on the record.",
        href: casePath(exists),
      });
      // Counsel were told the trial would resume if restored; tell them it has.
      if (exists.status === "DELIBERATION") {
        for (const id of [exists.attorneyId, exists.prosecutorId].filter(Boolean) as string[]) {
          await notify(tx, id, {
            type: "MODERATION",
            title: `Case No. ${formatCaseNumber(exists.number)} is back in session`,
            body: timeLeftWhenPaused(exists) > 0
              ? "The seal was lifted and deliberation resumed with its remaining time."
              : "The seal was lifted. Its time had already run out (it was adjourned), so the verdict is being read now.",
            href: casePath(exists),
          });
        }
      }
    }
    await tx.case.update({ where: { id: caseId }, data: { moderationState: "VISIBLE", removalReason: null } });
    await resumeDeliberation(tx, caseId);
    // Repairs cases sealed by older versions that cleared the claimer but kept a "claimed" status.
    await tx.case.updateMany({ where: { id: caseId, status: "DEFENSE_CLAIMED", claimedById: null }, data: { status: "AWAITING_DEFENSE", claimExpiresAt: null } });
    await tx.case.updateMany({ where: { id: caseId, status: "PROSECUTION_CLAIMED", claimedById: null }, data: { status: "AWAITING_PROSECUTION", claimExpiresAt: null } });
    await tx.report.updateMany({ where: { caseId, status: "OPEN" }, data: { status: "DISMISSED", resolvedAt: clock.now() } });
    await tx.case.update({ where: { id: caseId }, data: { openReports: 0 } });
    await log(tx, moderatorId, "RESTORE_CASE", { caseId });
  });
}

export async function dismissReports(moderatorId: string, caseId: string) {
  return db.$transaction(async (tx) => {
    await assertStaff(tx, moderatorId);
    await lockCase(tx, caseId, moderatorId);
    const dismissed = await tx.report.updateMany({ where: { caseId, status: "OPEN" }, data: { status: "DISMISSED", resolvedAt: clock.now() } });
    const c = await tx.case.findUnique({ where: { id: caseId }, select: { moderationState: true } });
    if (!c) throw new CourtError("NOT_FOUND", "That case could not be found.");
    // Nothing to do (e.g. a second moderator's click): say so instead of filling the log.
    if (dismissed.count === 0 && c.moderationState !== "UNDER_REVIEW") {
      throw new CourtError("INVALID_STATE", "There are no open reports on that case.");
    }
    // Only an *under review* case is made visible again; a sealed one stays sealed.
    const madeVisible = c.moderationState === "UNDER_REVIEW";
    await tx.case.update({ where: { id: caseId }, data: { openReports: 0, ...(madeVisible ? { moderationState: "VISIBLE" } : {}) } });
    if (madeVisible) {
      await resumeDeliberation(tx, caseId);
      // Participants of a live trial were told the clock waits for the review; tell them it's running.
      const t = await tx.case.findUniqueOrThrow({
        where: { id: caseId },
        select: { status: true, number: true, slug: true, accusedId: true, attorneyId: true, prosecutorId: true, deliberationEndsAt: true },
      });
      if (t.status === "DELIBERATION") {
        for (const id of [t.accusedId, t.attorneyId, t.prosecutorId].filter(Boolean) as string[]) {
          await notify(tx, id, {
            type: "MODERATION",
            title: `Case No. ${formatCaseNumber(t.number)}: the jury is back in session`,
            body:
              t.deliberationEndsAt && t.deliberationEndsAt > clock.now()
                ? "The review is over and deliberation is running again with its remaining time."
                : "The review is over. Its time had already run out (it was adjourned), so the verdict is being read now.",
            href: casePath(t),
          });
        }
      }
    }
    await log(tx, moderatorId, "DISMISS_REPORTS", { caseId });
    return { madeVisible, sealed: c.moderationState === "REMOVED" };
  });
}

export async function strikeArgument(moderatorId: string, caseId: string, role: "DEFENSE" | "PROSECUTION", stricken = true) {
  return db.$transaction(async (tx) => {
    await assertStaff(tx, moderatorId);
    await lockCase(tx, caseId, moderatorId);
    const res = await tx.argument.updateMany({ where: { caseId, role, stricken: !stricken }, data: { stricken } });
    if (res.count === 0) {
      const exists = await tx.argument.count({ where: { caseId, role } });
      if (!exists) throw new CourtError("NOT_FOUND", "No such argument.");
      // Already in that state (a second click, or another officer got there first): nothing to log.
      throw new CourtError("INVALID_STATE", stricken ? "That argument is already stricken." : "That argument isn't stricken.");
    }
    await tx.report.updateMany({
      where: { caseId, target: role, status: "OPEN" },
      data: { status: "ACTIONED", resolvedAt: clock.now() },
    });
    // Keep the queue's "N reporters" in step with the reports still open.
    const stillOpen = await tx.report.findMany({ where: { caseId, status: "OPEN" }, select: { reporterId: true }, distinct: ["reporterId"] });
    await tx.case.update({ where: { id: caseId }, data: { openReports: stillOpen.length } });
    await log(tx, moderatorId, stricken ? `STRIKE_${role}` : `UNSTRIKE_${role}`, { caseId });
  });
}

export async function setBan(moderatorId: string, targetUserId: string, banned: boolean, reason?: string) {
  return db.$transaction(async (tx) => {
    const mod = await assertStaff(tx, moderatorId);
    // Lock the player's row first, so simultaneous bans (or unbans) see each other: one acts, the
    // rest are no-ops. FOR NO KEY UPDATE, not FOR UPDATE: a trial closing at the same moment holds
    // its case row while inserting notifications and XP for this player, and those foreign-key
    // checks take a key-share lock on this row. FOR UPDATE would block them while we wait for the
    // case row: a deadlock (audit 32 D1). NO KEY UPDATE still excludes other bans and in-flight
    // actions (FOR SHARE), but lets key-share through.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${targetUserId} FOR NO KEY UPDATE`;
    const target = await liveTarget(tx, targetUserId);
    if (banned === !!target.bannedAt) {
      throw new CourtError("INVALID_STATE", banned ? "That player is already held in contempt." : "That player isn't held in contempt.");
    }
    if (targetUserId === moderatorId) throw new CourtError("FORBIDDEN", "You cannot hold yourself in contempt.");
    if (target.role !== "PLAYER" && mod.role !== "ADMIN") {
      throw new CourtError("FORBIDDEN", banned ? "Only an admin can hold another officer of the court in contempt." : "Only an admin can lift contempt for another officer of the court.");
    }
    await tx.user.update({
      where: { id: targetUserId },
      data: banned ? { bannedAt: clock.now(), banReason: reason?.slice(0, 300) ?? "Contempt of court" } : { bannedAt: null, banReason: null },
    });
    if (banned) {
      // Release anything they were holding so other players aren't blocked.
      await releaseClaims(tx, { userId: targetUserId });
      // Their votes on trials still in deliberation stop counting; reached verdicts stand. Their
      // reactions come off the counters and their open reports are dismissed, so a banned account
      // no longer sways rankings or counts toward hiding a case.
      // Every affected case row is locked first (the same lock closeDeliberation takes), in one
      // ascending pass so concurrent bans can't deadlock, and re-checked, so a trial closing at
      // the same moment either counts the vote or loses it, never half of each.
      const votes = await tx.vote.findMany({ where: { userId: targetUserId, case: { status: "DELIBERATION" } }, select: { id: true, caseId: true, choice: true } });
      const reactions = await tx.reaction.findMany({ where: { userId: targetUserId }, select: { id: true, caseId: true, type: true } });
      const reports = await tx.report.findMany({ where: { reporterId: targetUserId, status: "OPEN" }, select: { caseId: true } });
      const caseIds = [...new Set([...votes, ...reactions, ...reports].map((r) => r.caseId))].sort();
      let removed = 0;
      for (const caseId of caseIds) {
        const [locked] = await tx.$queryRaw<{ status: string }[]>`SELECT "status"::text FROM "Case" WHERE "id" = ${caseId} FOR UPDATE`;
        if (!locked) continue;
        const v = votes.find((x) => x.caseId === caseId);
        if (v && locked.status === "DELIBERATION") {
          // closed meanwhile: the verdict stands
          const gone = await tx.vote.deleteMany({ where: { id: v.id } });
          if (gone.count) {
            // The jury XP for a vote that no longer counts goes too (re-voting after an unban pays it once).
            const xp = await tx.xpEvent.findMany({ where: { userId: targetUserId, caseId, reason: "jury-vote" }, select: { id: true, amount: true } });
            if (xp.length) {
              await tx.xpEvent.deleteMany({ where: { id: { in: xp.map((e) => e.id) } } });
              await tx.userStats.update({ where: { userId: targetUserId }, data: { xp: { decrement: xp.reduce((n, e) => n + e.amount, 0) } } });
            }
            await tx.case.update({
              where: { id: caseId },
              data: v.choice === "GUILTY" ? { guiltyVotes: { decrement: 1 } } : { notGuiltyVotes: { decrement: 1 } },
            });
            removed++;
          }
        }
        for (const r of reactions.filter((x) => x.caseId === caseId)) {
          const gone = await tx.reaction.deleteMany({ where: { id: r.id } });
          if (!gone.count) continue;
          const field = REACTION_COUNTER_FIELD[r.type];
          await tx.$executeRawUnsafe(
            `UPDATE "Case" SET "${field}" = GREATEST(0, "${field}" - 1), "reactionScore" = GREATEST(0, "reactionScore" - $1) WHERE "id" = $2`,
            reactionWeight(r.type),
            caseId,
          );
        }
        if (reports.some((x) => x.caseId === caseId)) {
          await dismissReporterOnLockedCase(tx, caseId, targetUserId);
        }
      }
      if (removed) await tx.userStats.update({ where: { userId: targetUserId }, data: { juryVotes: { decrement: removed } } });
      await tx.session.deleteMany({ where: { userId: targetUserId } });
    }
    await log(tx, moderatorId, banned ? "BAN_USER" : "UNBAN_USER", { targetUserId, note: reason });
  });
}

/**
 * Ends deliberation immediately; quorum rules still apply. `seen` is the deadline (and extension
 * count) the officer was looking at: if the trial has changed since (another officer just adjourned it, or
 * it was extended for low participation), nothing is done twice. Without that check, two
 * officers pressing Adjourn together could extend a below-quorum trial and then dismiss it.
 */
export async function adjournNow(moderatorId: string, caseId: string, seen?: { endsAt: Date; extensionsUsed: number }) {
  await db.$transaction(async (tx) => {
    await assertStaff(tx, moderatorId);
    await lockCase(tx, caseId, moderatorId);
    if (seen) {
      const current = await tx.case.findUnique({ where: { id: caseId }, select: { status: true, deliberationEndsAt: true, extensionsUsed: true } });
      const changed = current?.deliberationEndsAt?.getTime() !== seen.endsAt.getTime() || current?.extensionsUsed !== seen.extensionsUsed;
      if (current?.status === "DELIBERATION" && changed) return;
    }
    // Already adjourned (or simply due) by someone else a moment ago: nothing to change or log,
    // the close below reports what happened.
    const due = await tx.case.count({ where: { id: caseId, status: "DELIBERATION", moderationState: "VISIBLE", deliberationEndsAt: { lte: clock.now() } } });
    if (due) return;
    const res = await tx.case.updateMany({
      where: { id: caseId, status: "DELIBERATION", moderationState: "VISIBLE" },
      data: { deliberationEndsAt: clock.now() },
    });
    if (res.count === 0) {
      const c = await tx.case.findUnique({ where: { id: caseId }, select: { status: true } });
      // Another officer's adjourn (or the clock) closed it a moment ago: report that verdict below.
      if (c?.status === "CLOSED") return;
      throw new CourtError(
        "INVALID_STATE",
        c?.status === "DELIBERATION" ? "That case is sealed or under review. Restore it or dismiss the reports first." : "That case is not in deliberation.",
      );
    }
    await log(tx, moderatorId, "ADJOURN_NOW", { caseId });
  });
  const outcome = await closeDeliberation(caseId);
  if (outcome.kind !== "not-due") return outcome;
  // Someone else's close may have won the race: report what actually happened.
  const now = await db.case.findUnique({
    where: { id: caseId },
    select: { status: true, verdict: true, guiltyVotes: true, notGuiltyVotes: true, moderationState: true, deliberationEndsAt: true },
  });
  if (now?.status === "CLOSED" && now.verdict) {
    return { kind: "closed" as const, verdict: now.verdict, guilty: now.guiltyVotes, notGuilty: now.notGuiltyVotes };
  }
  // …or extended it for low participation a moment ago (still visible, deadline back in the future).
  if (now?.status === "DELIBERATION" && now.moderationState === "VISIBLE" && now.deliberationEndsAt && now.deliberationEndsAt > clock.now()) {
    return { kind: "extended" as const, endsAt: now.deliberationEndsAt };
  }
  return outcome;
}

const GRANTABLE = new Set<string>([
  ...PROFILE_THEMES.filter((t) => t.unlock !== "free").map((t) => themeItemKey(t.key)),
  ...LOCKED_AVATAR_ITEMS.map(avatarItemKey),
]);

export function grantableItems(): string[] {
  return Array.from(GRANTABLE);
}

export async function grantEntitlement(moderatorId: string, targetUserId: string, itemKey: string) {
  return db.$transaction(async (tx) => {
    const mod = await assertStaff(tx, moderatorId);
    if (mod.role !== "ADMIN") throw new CourtError("FORBIDDEN", "Only admins can grant cosmetics.");
    if (!GRANTABLE.has(itemKey)) throw new CourtError("VALIDATION", "Unknown cosmetic item.");
    await liveTarget(tx, targetUserId);
    // Insert-or-nothing: a repeat grant (or two admins at once) is a clean no-op, not a second
    // gift notification and log entry.
    const granted = await tx.entitlement.createMany({ data: [{ userId: targetUserId, itemKey, source: "GRANTED" }], skipDuplicates: true });
    if (granted.count === 0) throw new CourtError("INVALID_STATE", "That player already owns this cosmetic.");
    await notify(tx, targetUserId, {
      type: "MODERATION",
      title: "A gift from the bench",
      body: "The court has granted you a new cosmetic. Check your settings!",
      href: "/settings#appearance",
    });
    await log(tx, moderatorId, "GRANT_COSMETIC", { targetUserId, note: itemKey });
  });
}

export async function setUserRole(adminId: string, targetUserId: string, role: "PLAYER" | "MODERATOR") {
  return db.$transaction(async (tx) => {
    const mod = await assertStaff(tx, adminId);
    if (mod.role !== "ADMIN") throw new CourtError("FORBIDDEN", "Only admins can appoint moderators.");
    const target = await liveTarget(tx, targetUserId);
    if (target.role === "ADMIN") throw new CourtError("FORBIDDEN", "Admins can't be demoted here.");
    if (target.role === role) {
      throw new CourtError("INVALID_STATE", role === "MODERATOR" ? "That player is already a court clerk." : "That player isn't a court clerk.");
    }
    if (role === "MODERATOR" && target.bannedAt) throw new CourtError("INVALID_STATE", "A player held in contempt can't be appointed. Lift the contempt first.");
    await tx.user.update({ where: { id: targetUserId }, data: { role } });
    await log(tx, adminId, `SET_ROLE_${role}`, { targetUserId });
  });
}

export async function pinFeaturedCase(moderatorId: string, caseId: string, day: string) {
  return db.$transaction(async (tx) => {
    await assertStaff(tx, moderatorId);
    await lockCase(tx, caseId, moderatorId);
    const c = await tx.case.findUnique({
      where: { id: caseId },
      select: { status: true, moderationState: true, number: true, slug: true, accused: { select: { allowFeaturing: true } } },
    });
    if (!c || c.status !== "CLOSED" || c.moderationState !== "VISIBLE") {
      throw new CourtError("INVALID_STATE", "Only visible, closed cases can be featured.");
    }
    if (!c.accused.allowFeaturing) throw new CourtError("INELIGIBLE", "The confessor has opted out of being featured.");
    await tx.featuredCase.upsert({
      where: { day },
      create: { day, caseId, pinnedBy: moderatorId },
      update: { caseId, pinnedBy: moderatorId },
    });
    await log(tx, moderatorId, "PIN_FEATURED", { caseId, note: `${day} ${casePath(c)}` });
  });
}

export function achievementLabel(key: string) {
  return getAchievement(key)?.name ?? key;
}
