"use server";

import { redirect } from "next/navigation";
import { requireActiveUser } from "@/server/auth/current-user";
import { enforceRateLimit } from "@/server/rate-limit";
import { pickRandomQueueCase } from "@/server/queries/cases";
import { claimCase } from "@/server/services/cases";
import { CourtError, isCourtError } from "@/server/errors";
import { toFailure, type ActionResult } from "./_util";

/** "Receive a case": the court picks a random eligible case and claims it for you. */
export async function claimRandomAction(role: "DEFENSE" | "PROSECUTION"): Promise<ActionResult> {
  let target: string | null = null;
  try {
    const user = await requireActiveUser();
    if (role !== "DEFENSE" && role !== "PROSECUTION") throw new CourtError("VALIDATION", "Unknown role.");
    await enforceRateLimit(`claim:${user.id}`, 20, 600);
    // A couple of attempts in case someone grabs our pick first.
    for (let attempt = 0; attempt < 3 && !target; attempt++) {
      const pick = await pickRandomQueueCase(role, user);
      if (!pick) throw new CourtError("NOT_FOUND", "The docket is empty! Every case has a lawyer. Check back soon, or confess something yourself.");
      try {
        await claimCase(user.id, pick.id, role);
        target = role === "DEFENSE" ? `/defend/${pick.id}` : `/prosecute/${pick.id}`;
      } catch (e) {
        if (!(isCourtError(e) && e.code === "CONFLICT")) throw e;
      }
    }
    if (!target) throw new CourtError("CONFLICT", "Everyone is grabbing cases right now. Try again in a moment.");
  } catch (e) {
    return toFailure(e);
  }
  redirect(target);
}
