"use client";

const isOwnDraft = (key: string, owner: string) => key.startsWith("coti-draft-") && (key.endsWith(`-${owner}`) || key === "coti-draft-confession");

/** This account's saved drafts (confession and arguments), keyed as stored. */
export function snapshotDrafts(owner: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const key of Object.keys(localStorage)) if (isOwnDraft(key, owner)) out[key] = localStorage.getItem(key) ?? "";
  } catch {
    /* storage unavailable */
  }
  return out;
}

export function restoreDrafts(saved: Record<string, string>) {
  try {
    for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Removes the signed-in account's saved confession/argument drafts (and this tab's markers) from
 * this browser. Called when a player logs out or deletes their account, so nothing they wrote stays
 * on a shared device. Other accounts' drafts on the same browser are left alone (audit 52 D3).
 */
export function clearDrafts(owner: string) {
  try {
    for (const key of Object.keys(localStorage)) if (isOwnDraft(key, owner)) localStorage.removeItem(key);
    for (const key of Object.keys(sessionStorage)) if (key.startsWith("coti-")) sessionStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}
