"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ArgumentRole, ReactionType, ReportReason, VoteChoice } from "@prisma/client";
import { argumentSchema, confessionSchema, reactionSchema, reportSchema, voteSchema } from "@/lib/validation";
import { clientIp, requireActiveUser } from "@/server/auth/current-user";
import { enforceRateLimit } from "@/server/rate-limit";
import { castVote, claimCase, confess, releaseClaim, screenArgument, screenConfession, submitArgument } from "@/server/services/cases";
import { toggleReaction } from "@/server/services/reactions";
import { fileReport } from "@/server/services/moderation";
import { CourtError } from "@/server/errors";
import { casePath } from "@/lib/text";
import { formObject, isBot, toFailure, type ActionResult } from "./_util";

export async function confessAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  let path: string;
  try {
    const user = await requireActiveUser();
    if (isBot(formData)) throw new CourtError("VALIDATION", "The bailiff suspects you are a robot.");
    // Validate first: rejected (invalid) submissions must not use up the rate-limit budget.
    const input = confessionSchema.parse(formObject(formData));
    screenConfession(input); // content-filter rejections don't count against the limit either
    const ip = await clientIp();
    await enforceRateLimit(`confess:${user.id}`, 3, 600, "Slow down! The stenographer can only type so fast.");
    await enforceRateLimit(`confess-ip:${ip}`, 15, 3600);
    const created = await confess(user.id, input);
    path = `${casePath(created)}?filed=1`;
  } catch (e) {
    return toFailure(e);
  }
  redirect(path);
}

export async function claimAction(caseId: string, role: ArgumentRole): Promise<ActionResult> {
  let target: string;
  try {
    const user = await requireActiveUser();
    if (role !== "DEFENSE" && role !== "PROSECUTION") throw new CourtError("VALIDATION", "Unknown role.");
    await enforceRateLimit(`claim:${user.id}`, 20, 600);
    await claimCase(user.id, String(caseId), role);
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
    const { role } = await releaseClaim(user.id, String(caseId));
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
    const user = await requireActiveUser();
    // `role` is bound on the client, so never trust it without checking.
    if (role !== "DEFENSE" && role !== "PROSECUTION") throw new CourtError("VALIDATION", "Unknown role.");
    const input = argumentSchema.parse(formObject(formData));
    screenArgument(input.body);
    await enforceRateLimit(`argue:${user.id}`, 10, 600);
    const result = await submitArgument(user.id, input.caseId, role, input.body);
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
    await enforceRateLimit(`vote:${user.id}`, 60, 600);
    const result = await castVote(user.id, input.caseId, input.choice);
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

export async function reportAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireActiveUser();
    const input = reportSchema.parse(formObject(formData));
    await enforceRateLimit(`report:${user.id}`, 10, 3600, "You've filed a lot of reports. The clerks need a minute.");
    const { autoReview } = await fileReport(user.id, {
      caseId: input.caseId,
      target: input.target,
      reason: input.reason as ReportReason,
      details: input.details,
    });
    refresh();
    return {
      ok: true,
      message: autoReview
        ? "Thank you. This case has been sent to the clerks for review."
        : "Thank you. The court clerks will review your report.",
    };
  } catch (e) {
    return toFailure(e);
  }
}
