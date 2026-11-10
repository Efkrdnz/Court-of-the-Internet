"use client";

const isOwnDraft = (key: string, owner: string) => key.startsWith("coti-draft-") && (key.endsWith(`-${owner}`) || key === "coti-draft-confession");

/** This account's saved drafts (confession and arguments), keyed as stored. */
const DELETING = "coti-deleting-account";

/**
 * Account deletion clears drafts only once it has gone through: the form notes whose account is
 * being deleted, and the farewell page (reached only on success) clears that account's drafts. A
 * refused attempt (wrong password, "delete" in lower case) leaves them alone (audit 52 D3).
 */
export function markDeletingAccount(owner: string | null) {
  try {
    if (owner) sessionStorage.setItem(DELETING, owner);
    else sessionStorage.removeItem(DELETING);
  } catch {
    /* storage unavailable */
  }
}

export function clearDeletedAccountDrafts() {
  try {
    const owner = sessionStorage.getItem(DELETING);
    if (owner) clearDrafts(owner);
    sessionStorage.removeItem(DELETING);
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
