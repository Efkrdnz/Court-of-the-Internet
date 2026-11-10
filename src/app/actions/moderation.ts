"use server";

import { refresh } from "next/cache";
import { requireStaff } from "@/server/auth/current-user";
import { VERDICT_LABEL } from "@/lib/format";
import {
  adjournNow,
  dismissReports,
  grantEntitlement,
  pinFeaturedCase,
  removeCase,
  restoreCase,
  setBan,
  setUserRole,
  strikeArgument,
} from "@/server/services/moderation";
import { auditStats } from "@/server/services/stats";
import { utcDay } from "@/server/queries/community";
import { CourtError } from "@/server/errors";
import { db } from "@/server/db";
import { assertForm, toFailure, type ActionResult } from "./_util";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Single entry point for console forms: `op` selects the operation. */
export async function moderationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    assertForm(formData);
    const mod = await requireStaff();
    const op = str(formData, "op");
    const caseId = str(formData, "caseId");
    const userId = str(formData, "userId");
    let message = "Done.";
    switch (op) {
      case "remove": {
        const reason = str(formData, "reason");
        if (reason.length < 3) throw new CourtError("VALIDATION", "Give a reason for the removal (it's shown to the author).", "reason");
        await removeCase(mod.id, caseId, reason);
        message = "Case sealed and removed from public view.";
        break;
      }
      case "restore":
        await restoreCase(mod.id, caseId, formData.has("sealSeen") ? str(formData, "sealSeen") : undefined);
        message = "Case restored.";
        break;
      case "dismiss":
        {
          // The reports the console showed (so newer ones aren't dismissed unseen).
          const seen = formData.has("reportsSeen") ? str(formData, "reportsSeen").split(",").filter(Boolean) : undefined;
          const r = await dismissReports(mod.id, caseId, seen);
          const newer = r.newer === 1 ? "1 newer reporter still needs" : `${r.newer} newer reporters still need`;
          message =
            r.newer > 0
              ? r.stillUnderReview
                ? `Dismissed the reports you saw; ${newer} review, so the case stays under review.`
                : r.madeVisible
                  ? `Dismissed the reports you saw; case visible again. ${newer} review (they're from new accounts or the trial's own parties, so they don't keep it hidden).`
                  : `Dismissed the reports you saw; ${newer} review.`
              : r.madeVisible
                ? "Reports dismissed; case visible again."
                : r.sealed
                  ? "Reports dismissed. (The case stays sealed.)"
                  : "Reports dismissed.";
        }
        break;
      case "strike-defense":
      case "strike-prosecution":
      case "unstrike-defense":
      case "unstrike-prosecution": {
        const role = op.endsWith("defense") ? "DEFENSE" : "PROSECUTION";
        const r = await strikeArgument(mod.id, caseId, role, op.startsWith("strike"));
        message = op.startsWith("strike") ? "Argument stricken from the record." : "Argument reinstated.";
        if (r.madeVisible) message += " That settled the last open report, so the case is visible again (and its trial clock is running).";
        else if (r.stillUnderReview) message += " Other reports are still open, so the case stays under review.";
        break;
      }
      case "adjourn": {
        const seenEndsAt = str(formData, "endsAt");
        const seenExtensions = Number(str(formData, "extensionsUsed"));
        const seen = seenEndsAt && !Number.isNaN(Date.parse(seenEndsAt)) && Number.isInteger(seenExtensions) ? { endsAt: new Date(seenEndsAt), extensionsUsed: seenExtensions } : undefined;
        const outcome = await adjournNow(mod.id, caseId, seen);
        message =
          outcome.kind === "closed"
            ? `Deliberation closed: ${VERDICT_LABEL[outcome.verdict] ?? outcome.verdict} (${outcome.guilty}–${outcome.notGuilty}).`
            : outcome.kind === "already-closed"
              ? `That trial had already closed: ${VERDICT_LABEL[outcome.verdict] ?? outcome.verdict} (${outcome.guilty}–${outcome.notGuilty}).`
              : outcome.kind === "extended"
                ? "byOther" in outcome && outcome.byOther
                  ? "This trial had already been adjourned (from this console, another officer's or the court clock) and was below quorum, so deliberation was extended (low-participation rule). Nothing more was done."
                  : "Below quorum, so deliberation was extended (low-participation rule)."
                : outcome.kind === "changed"
                  ? "The trial changed since you opened it (it was sealed, restored or reviewed). Nothing was done; check it and adjourn again if you still mean to."
                  : "The case was sealed or put under review before it could close. It will close as soon as it is visible again.";
        break;
      }
      case "feature":
        // The featured case the console showed, so two officers pinning at once don't silently overwrite each other.
        await pinFeaturedCase(mod.id, caseId, utcDay(), formData.has("featuredSeen") ? str(formData, "featuredSeen") : undefined);
        message = "Pinned as today's featured case.";
        break;
      case "ban":
        await setBan(mod.id, userId, true, str(formData, "reason") || undefined);
        message = "User held in contempt (banned).";
        break;
      case "unban":
        await setBan(mod.id, userId, false);
        message = "Ban lifted.";
        break;
      case "make-mod":
        await setUserRole(mod.id, userId, "MODERATOR");
        message = "Appointed as court clerk (moderator).";
        break;
      case "make-player":
        await setUserRole(mod.id, userId, "PLAYER");
        message = "Moderator role removed.";
        break;
      case "grant":
        await grantEntitlement(mod.id, userId, str(formData, "itemKey"));
        message = "Cosmetic granted.";
        break;
      case "audit": {
        const exists = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!exists) throw new CourtError("NOT_FOUND", "User not found.");
        const audit = await auditStats(userId);
        message = audit.ok
          ? "Stats audit passed: stored counters match a full recomputation from history."
          : `Stats mismatch: ${audit.mismatches.map((m) => `${m.field} stored ${m.stored} vs ${m.computed}`).join("; ")}`;
        break;
      }
      default:
        throw new CourtError("VALIDATION", "Unknown operation.");
    }
    refresh();
    return { ok: true, message };
  } catch (e) {
    return toFailure(e);
  }
}
