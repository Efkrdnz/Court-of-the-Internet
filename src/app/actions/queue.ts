"use server";

import { redirect } from "next/navigation";
import { requireActiveUser } from "@/server/auth/current-user";
import { enforceRateLimit, reserveAttempt } from "@/server/rate-limit";
import { currentClaim, pickRandomQueueCase } from "@/server/queries/cases";
import { claimCase } from "@/server/services/cases";
import { CourtError, isCourtError } from "@/server/errors";
import { toFailure, type ActionResult } from "./_util";

/** "Receive a case": the court picks a random eligible case and claims it for you. */
export async function claimRandomAction(role: "DEFENSE" | "PROSECUTION"): Promise<ActionResult> {
  let target: string | null = null;
  // Only successful claims count toward the claim budget (see claimAction).
  let refundClaim: () => Promise<void> = async () => {};
  try {
    const user = await requireActiveUser();
    if (role !== "DEFENSE" && role !== "PROSECUTION") throw new CourtError("VALIDATION", "Unknown role.");
    await enforceRateLimit(`claim-attempt:${user.id}`, 120, 600);
    refundClaim = await reserveAttempt([{ key: `claim:${user.id}`, limit: 20, windowSeconds: 600, message: "Order in the court! You're doing that too fast. Try again in a moment." }]);
    // A couple of attempts in case someone grabs our pick first.
    for (let attempt = 0; attempt < 3 && !target; attempt++) {
      const pick = await pickRandomQueueCase(role, user);
      if (!pick) {
        // A double-click's other request may have just claimed one for us: go to it.
        const held = (await currentClaim(user.id)).find((c) => c.status === (role === "DEFENSE" ? "DEFENSE_CLAIMED" : "PROSECUTION_CLAIMED"));
        if (held) {
          target = role === "DEFENSE" ? `/defend/${held.id}` : `/prosecute/${held.id}`;
          await refundClaim(); // the other click's claim already counted
          break;
        }
        throw new CourtError("NOT_FOUND", "The docket is empty! Every case has a lawyer. Check back soon, or confess something yourself.");
      }
      try {
        await claimCase(user.id, pick.id, role);
        target = role === "DEFENSE" ? `/defend/${pick.id}` : `/prosecute/${pick.id}`;
      } catch (e) {
        if (!(isCourtError(e) && (e.code === "CONFLICT" || e.code === "INELIGIBLE"))) throw e;
        // "You already hold a case" may be our own double-click's claim: go to it.
        const held = (await currentClaim(user.id)).find((c) => c.status === (role === "DEFENSE" ? "DEFENSE_CLAIMED" : "PROSECUTION_CLAIMED"));
        if (held) {
          target = role === "DEFENSE" ? `/defend/${held.id}` : `/prosecute/${held.id}`;
          await refundClaim(); // the other click's claim already counted
        } else if (e.code === "INELIGIBLE") throw e;
      }
    }
    if (!target) throw new CourtError("CONFLICT", "Everyone is grabbing cases right now. Try again in a moment.");
  } catch (e) {
    await refundClaim();
    return toFailure(e);
  }
  redirect(target);
}
