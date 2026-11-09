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
import { getAchievement } from "@/lib/achievements";
import { PROFILE_THEMES, LOCKED_AVATAR_ITEMS, avatarItemKey, themeItemKey } from "@/lib/cosmetics";

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
      const c = await tx.case.findUnique({ where: { id: input.caseId }, select: { id: true, moderationState: true } });
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
          reporterId: { notIn: dismissedBefore.map((d) => d.reporterId) },
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
    if (isUniqueViolation(e)) throw new CourtError("ALREADY_DONE", "You've already reported this. The clerks are on it.");
    throw e;
  }
}

export async function removeCase(moderatorId: string, caseId: string, reason: string) {
  return db.$transaction(async (tx) => {
    await assertStaff(tx, moderatorId);
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
    const exists = await tx.case.findUnique({ where: { id: caseId }, select: { id: true, number: true, slug: true, accusedId: true, moderationState: true } });
    if (!exists) throw new CourtError("NOT_FOUND", "That case could not be found.");
    if (exists.moderationState === "REMOVED") {
      await notify(tx, exists.accusedId, {
        type: "MODERATION",
        title: `Case No. ${formatCaseNumber(exists.number)} was restored`,
        body: "A moderator reviewed the seal and put your case back on the record.",
        href: casePath(exists),
      });
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
    await tx.report.updateMany({ where: { caseId, status: "OPEN" }, data: { status: "DISMISSED", resolvedAt: clock.now() } });
    const c = await tx.case.findUnique({ where: { id: caseId }, select: { moderationState: true } });
    if (!c) throw new CourtError("NOT_FOUND", "That case could not be found.");
    await tx.case.update({
      where: { id: caseId },
      data: { openReports: 0, ...(c.moderationState === "UNDER_REVIEW" ? { moderationState: "VISIBLE" } : {}) },
    });
    if (c.moderationState === "UNDER_REVIEW") await resumeDeliberation(tx, caseId);
    await log(tx, moderatorId, "DISMISS_REPORTS", { caseId });
  });
}

export async function strikeArgument(moderatorId: string, caseId: string, role: "DEFENSE" | "PROSECUTION", stricken = true) {
  return db.$transaction(async (tx) => {
    await assertStaff(tx, moderatorId);
    const res = await tx.argument.updateMany({ where: { caseId, role }, data: { stricken } });
    if (res.count === 0) throw new CourtError("NOT_FOUND", "No such argument.");
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
    const target = await tx.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
    if (!target) throw new CourtError("NOT_FOUND", "User not found.");
    if (targetUserId === moderatorId) throw new CourtError("FORBIDDEN", "You cannot hold yourself in contempt.");
    if (target.role !== "PLAYER" && mod.role !== "ADMIN") throw new CourtError("FORBIDDEN", "Only an admin can hold another officer of the court in contempt.");
    await tx.user.update({
      where: { id: targetUserId },
      data: banned ? { bannedAt: clock.now(), banReason: reason?.slice(0, 300) ?? "Contempt of court" } : { bannedAt: null, banReason: null },
    });
    if (banned) {
      // Release anything they were holding so other players aren't blocked.
      await releaseClaims(tx, { userId: targetUserId });
      // Their votes on trials still in deliberation stop counting; reached verdicts stand.
      // Each case row is locked first (the same lock closeDeliberation takes, in a fixed order
      // to avoid deadlocks) and re-checked, so a trial closing at the same moment either counts
      // the vote or loses it, never half of each.
      const candidates = await tx.vote.findMany({
        where: { userId: targetUserId, case: { status: "DELIBERATION" } },
        select: { id: true, caseId: true, choice: true },
        orderBy: { caseId: "asc" },
      });
      let removed = 0;
      for (const v of candidates) {
        const [locked] = await tx.$queryRaw<{ status: string }[]>`SELECT "status"::text FROM "Case" WHERE "id" = ${v.caseId} FOR UPDATE`;
        if (locked?.status !== "DELIBERATION") continue; // closed meanwhile: the verdict stands
        await tx.vote.delete({ where: { id: v.id } });
        // The jury XP for a vote that no longer counts goes too (re-voting after an unban pays it once).
        const xp = await tx.xpEvent.findMany({ where: { userId: targetUserId, caseId: v.caseId, reason: "jury-vote" }, select: { id: true, amount: true } });
        if (xp.length) {
          await tx.xpEvent.deleteMany({ where: { id: { in: xp.map((e) => e.id) } } });
          await tx.userStats.update({ where: { userId: targetUserId }, data: { xp: { decrement: xp.reduce((n, e) => n + e.amount, 0) } } });
        }
        await tx.case.update({
          where: { id: v.caseId },
          data: v.choice === "GUILTY" ? { guiltyVotes: { decrement: 1 } } : { notGuiltyVotes: { decrement: 1 } },
        });
        removed++;
      }
      if (removed) await tx.userStats.update({ where: { userId: targetUserId }, data: { juryVotes: { decrement: removed } } });
      await tx.session.deleteMany({ where: { userId: targetUserId } });
    }
    await log(tx, moderatorId, banned ? "BAN_USER" : "UNBAN_USER", { targetUserId, note: reason });
  });
}

/** Ends deliberation immediately; quorum rules still apply. */
export async function adjournNow(moderatorId: string, caseId: string) {
  await db.$transaction(async (tx) => {
    await assertStaff(tx, moderatorId);
    const res = await tx.case.updateMany({
      where: { id: caseId, status: "DELIBERATION", moderationState: "VISIBLE" },
      data: { deliberationEndsAt: clock.now() },
    });
    if (res.count === 0) {
      const c = await tx.case.findUnique({ where: { id: caseId }, select: { status: true } });
      throw new CourtError(
        "INVALID_STATE",
        c?.status === "DELIBERATION" ? "That case is sealed or under review. Restore it or dismiss the reports first." : "That case is not in deliberation.",
      );
    }
    await log(tx, moderatorId, "ADJOURN_NOW", { caseId });
  });
  return closeDeliberation(caseId);
}

const GRANTABLE = new Set<string>([
  ...PROFILE_THEMES.filter((t) => t.unlock !== "free").map((t) => themeItemKey(t.key)),
  ...LOCKED_AVATAR_ITEMS.map(avatarItemKey),
]);

export function grantableItems(): string[] {
  return Array.from(GRANTABLE);
}

export async function grantEntitlement(moderatorId: string, targetUserId: string, itemKey: string) {
  if (!GRANTABLE.has(itemKey)) throw new CourtError("VALIDATION", "Unknown cosmetic item.");
  return db.$transaction(async (tx) => {
    const mod = await assertStaff(tx, moderatorId);
    if (mod.role !== "ADMIN") throw new CourtError("FORBIDDEN", "Only admins can grant cosmetics.");
    await tx.entitlement.upsert({
      where: { userId_itemKey: { userId: targetUserId, itemKey } },
      create: { userId: targetUserId, itemKey, source: "GRANTED" },
      update: {},
    });
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
    const target = await tx.user.findUniqueOrThrow({ where: { id: targetUserId }, select: { role: true } });
    if (target.role === "ADMIN") throw new CourtError("FORBIDDEN", "Admins can't be demoted here.");
    await tx.user.update({ where: { id: targetUserId }, data: { role } });
    await log(tx, adminId, `SET_ROLE_${role}`, { targetUserId });
  });
}

export async function pinFeaturedCase(moderatorId: string, caseId: string, day: string) {
  return db.$transaction(async (tx) => {
    await assertStaff(tx, moderatorId);
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
