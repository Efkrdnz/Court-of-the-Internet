import "server-only";
import type { Tx } from "../db";
import { clock } from "../clock";

/**
 * A deliberation can't reach a verdict while the case is sealed or under review (voting is
 * closed then), so its clock stops. Resuming pushes the deadline back by the time spent paused.
 */
export async function pauseDeliberation(tx: Tx, caseId: string) {
  await tx.case.updateMany({
    where: { id: caseId, status: "DELIBERATION", deliberationPausedAt: null },
    data: { deliberationPausedAt: clock.now() },
  });
}

export async function resumeDeliberation(tx: Tx, caseId: string) {
  const c = await tx.case.findUnique({ where: { id: caseId }, select: { deliberationPausedAt: true, deliberationEndsAt: true } });
  if (!c?.deliberationPausedAt) return;
  const paused = clock.now().getTime() - c.deliberationPausedAt.getTime();
  await tx.case.update({
    where: { id: caseId },
    data: {
      deliberationPausedAt: null,
      ...(c.deliberationEndsAt ? { deliberationEndsAt: new Date(c.deliberationEndsAt.getTime() + Math.max(0, paused)) } : {}),
    },
  });
}
