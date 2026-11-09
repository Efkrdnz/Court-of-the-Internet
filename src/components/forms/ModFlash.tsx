"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const FlashContext = createContext<((message: string) => void) | null>(null);

/** Lets moderation forms report a result even when the action removes the form itself. */
export function useModFlash() {
  return useContext(FlashContext);
}

/**
 * Wraps the moderation console. Many actions (adjourn, dismiss reports…) change the case so
 * that the button that ran them disappears; the confirmation is shown here instead.
 */
export function ModFlashProvider({ children }: { children: ReactNode }) {
  const [flash, setFlash] = useState<{ id: number; message: string } | null>(null);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 8000);
    return () => clearTimeout(t);
  }, [flash]);
  return (
    <FlashContext.Provider value={(message) => setFlash({ id: Date.now(), message })}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6">
        {flash ? (
          <div
            key={flash.id}
            role="status"
            className="pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border border-[#8fe3cc]/50 bg-[#0f2a26] px-4 py-3 text-sm font-semibold text-[#c9f5e8] shadow-xl"
          >
            <span className="min-w-0">{flash.message}</span>
            <button type="button" onClick={() => setFlash(null)} className="-my-2 -mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg leading-none hover:bg-white/10" aria-label="Dismiss">
              ×
            </button>
          </div>
        ) : null}
      </div>
    </FlashContext.Provider>
  );
}
