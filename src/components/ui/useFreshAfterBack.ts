"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Back/Forward restores pages from the client router cache, so a page can come back showing the
 * state from before an action this tab just took ("Take this case" after the case was taken).
 * Call `markActed()` when the action starts; if the page is later restored with the mark set, it
 * asks the server again. Failed actions should call `clearActed()`.
 */
export function useFreshAfterBack(key: string) {
  const router = useRouter();
  const storageKey = `coti-acted-${key}`;
  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey)) {
        sessionStorage.removeItem(storageKey);
        router.refresh();
      }
    } catch {
      /* storage unavailable */
    }
  }, [storageKey, router]);
  return {
    markActed: () => {
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
    },
    clearActed: () => {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    },
  };
}
