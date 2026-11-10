/**
 * Server actions return their own failures ({ ok: false, error }), so a call that *throws* on the
 * client means the request itself failed: a dropped phone connection, a timeout. Without this, the
 * rejection reached the error boundary and swapped the whole page for "Something went wrong on our
 * end", losing what the player had typed (audit 52 D1). Next.js navigation (a redirect from the
 * action) still has to propagate.
 */
// Not "nothing was lost": the request may have reached the court even though its answer didn't
// (audit 54 D3), so say how to find out.
export const NETWORK_ERROR = "Couldn't confirm with the court. Check your connection: if it went through, you'll see it after a refresh; otherwise try again.";

export function isNavigationError(e: unknown): boolean {
  const digest = typeof e === "object" && e !== null && "digest" in e ? (e as { digest: unknown }).digest : undefined;
  return typeof digest === "string" && /^NEXT_(?:REDIRECT|NOT_FOUND|HTTP_ERROR_FALLBACK)/.test(digest);
}

export async function callAction<R>(run: () => Promise<R>): Promise<R | { ok: false; error: string }> {
  try {
    return await run();
  } catch (e) {
    if (isNavigationError(e)) throw e;
    return { ok: false, error: NETWORK_ERROR };
  }
}
