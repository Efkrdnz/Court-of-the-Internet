"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ArgumentRole, ReactionType, ReportReason, VoteChoice } from "@prisma/client";
import { argumentSchema, confessionSchema, reactionSchema, reportSchema, voteSchema } from "@/lib/validation";
import { clientIp, requireActiveUser } from "@/server/auth/current-user";
import { enforceRateLimit, reserveAttempt } from "@/server/rate-limit";
import { castVote, claimCase, confess, precheckConfession, releaseClaim, screenArgument, screenConfession, submitArgument } from "@/server/services/cases";
import { toggleReaction } from "@/server/services/reactions";
import { assertNotYetReported, fileReport } from "@/server/services/moderation";
import { CourtError } from "@/server/errors";
import { casePath } from "@/lib/text";
import { assertForm, formObject, isBot, toFailure, type ActionResult } from "./_util";

export async function confessAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  let path: string;
  try {
    assertForm(formData);
    const user = await requireActiveUser();
    if (isBot(formData)) throw new CourtError("VALIDATION", "The bailiff suspects you are a robot.");
    // Validate first: rejected (invalid) submissions must not use up the rate-limit budget.
    const input = confessionSchema.parse(formObject(formData));
    screenConfession(input); // content-filter rejections don't count against the limit either
    await precheckConfession(user.id, input); // nor do duplicates or a full daily cap
    const ip = await clientIp();
    // Counted up front (so a burst can't slip past), and given back if the confession is then
    // refused inside the transaction (a concurrent duplicate, the daily cap).
    const refund = await reserveAttempt([
      { key: `confess:${user.id}`, limit: 3, windowSeconds: 600, message: "Slow down! The stenographer can only type so fast." },
      ...(ip ? [{ key: `confess-ip:${ip}`, limit: 15, windowSeconds: 3600, message: "The court has heard a lot of confessions from this network in the last hour. Try again later." }] : []),
    ]);
    let created;
    try {
      created = await confess(user.id, input);
    } catch (e) {
      await refund();
      throw e;
    }
    path = `${casePath(created)}?filed=1`;
  } catch (e) {
    return toFailure(e);
  }
  redirect(path);
}

/** Case ids are cuids; anything else (e.g. with a NUL byte) never reaches the database. */
const isCaseId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9]{10,40}$/i.test(v);

export async function claimAction(caseId: string, role: ArgumentRole): Promise<ActionResult> {
  let target: string;
  try {
    const user = await requireActiveUser();
    if (role !== "DEFENSE" && role !== "PROSECUTION") throw new CourtError("VALIDATION", "Unknown role.");
    if (!isCaseId(caseId)) throw new CourtError("NOT_FOUND", "That case could not be found.");
    // Only claims that succeed count toward the 20 per 10 minutes (a refused claim, "too slow" or
    // "already moved on", gives its attempt back); a looser ceiling still bounds hammering.
    await enforceRateLimit(`claim-attempt:${user.id}`, 120, 600);
    const refund = await reserveAttempt([{ key: `claim:${user.id}`, limit: 20, windowSeconds: 600, message: "Order in the court! You're doing that too fast. Try again in a moment." }]);
    try {
      // Re-claiming a case you already hold (a double-click) is free.
      if ((await claimCase(user.id, caseId, role)).alreadyHeld) await refund();
    } catch (e) {
      await refund();
      throw e;
    }
    target = role === "DEFENSE" ? `/defend/${caseId}` : `/prosecute/${caseId}`;
  } catch (e) {
    return toFailure(e);
  }
  redirect(target);
}

export async function releaseAction(caseId: string): Promise<ActionResult> {
  let target: string;
  try {
    const user = await requireActiveUser();
    if (!isCaseId(caseId)) throw new CourtError("NOT_FOUND", "That case could not be found.");
    const { role } = await releaseClaim(user.id, caseId);
    target = role === "DEFENSE" ? "/defend?released=1" : "/prosecute?released=1";
  } catch (e) {
    return toFailure(e);
  }
  redirect(target);
}

export async function submitArgumentAction(
  role: ArgumentRole,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let target: string;
  try {
    assertForm(formData);
    const user = await requireActiveUser();
    // `role` is bound on the client, so never trust it without checking.
    if (role !== "DEFENSE" && role !== "PROSECUTION") throw new CourtError("VALIDATION", "Unknown role.");
    const input = argumentSchema.parse(formObject(formData));
    screenArgument(input.body);
    // Only filings that go through count (an expired claim or a conflict gives the attempt back).
    const refund = await reserveAttempt([{ key: `argue:${user.id}`, limit: 10, windowSeconds: 600, message: "Order in the court! You're doing that too fast. Try again in a moment." }]);
    let result;
    try {
      result = await submitArgument(user.id, input.caseId, role, input.body);
    } catch (e) {
      await refund();
      throw e;
    }
    target = `${casePath(result)}?filed=${role === "DEFENSE" ? "defense" : "prosecution"}`;
  } catch (e) {
    return toFailure(e);
  }
  redirect(target);
}

export async function voteAction(
  caseId: string,
  choice: VoteChoice,
): Promise<ActionResult<{ choice: VoteChoice; guiltyVotes: number; notGuiltyVotes: number }>> {
  try {
    const user = await requireActiveUser();
    const input = voteSchema.parse({ caseId, choice });
    // Only accepted votes count toward the 60 per 10 minutes; refused ones (already voted, closed)
    // give their attempt back, under a looser ceiling on all attempts.
    await enforceRateLimit(`vote-attempt:${user.id}`, 240, 600);
    const refund = await reserveAttempt([{ key: `vote:${user.id}`, limit: 60, windowSeconds: 600, message: "Order in the court! You're doing that too fast. Try again in a moment." }]);
    let result;
    try {
      result = await castVote(user.id, input.caseId, input.choice);
    } catch (e) {
      await refund();
      throw e;
    }
    refresh();
    return { ok: true, data: result };
  } catch (e) {
    return toFailure(e);
  }
}

export async function reactAction(
  caseId: string,
  type: ReactionType,
): Promise<ActionResult<{ active: boolean; counts: Record<string, number> }>> {
  try {
    const user = await requireActiveUser();
    const input = reactionSchema.parse({ caseId, type });
    await enforceRateLimit(`react:${user.id}`, 120, 600);
    const result = await toggleReaction(user.id, input.caseId, input.type);
    return { ok: true, data: result };
  } catch (e) {
    return toFailure(e);
  }
}

export async function reportAction(_prev: ActionResult<{ autoReview: boolean }> | null, formData: FormData): Promise<ActionResult<{ autoReview: boolean }>> {
  try {
    assertForm(formData);
    const user = await requireActiveUser();
    const input = reportSchema.parse(formObject(formData));
    // A repeat report is answered as such, whatever the rate limit says.
    await assertNotYetReported(user.id, input.caseId, input.target);
    // Only reports actually filed count: a duplicate or a missing case gives its attempt back.
    const refund = await reserveAttempt([{ key: `report:${user.id}`, limit: 10, windowSeconds: 3600, message: "You've filed a lot of reports. The clerks need a minute." }]);
    let filed;
    try {
      filed = await fileReport(user.id, {
        caseId: input.caseId,
        target: input.target,
        reason: input.reason as ReportReason,
        details: input.details,
      });
    } catch (e) {
      await refund();
      throw e;
    }
    const { autoReview } = filed;
    refresh();
    return {
      ok: true,
      data: { autoReview },
      message: autoReview
        ? "Thank you. This case has been sent to the clerks for review."
        : "Thank you. The court clerks will review your report.",
    };
  } catch (e) {
    return toFailure(e);
  }
}
