"use client";

/**
 * Removes every saved confession/argument draft (and per-tab markers) from this browser. Called
 * when a player logs out or deletes their account, so nothing they wrote stays on a shared device.
 */
export function clearDrafts() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith("coti-draft-")) localStorage.removeItem(key);
    for (const key of Object.keys(sessionStorage)) if (key.startsWith("coti-")) sessionStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}
