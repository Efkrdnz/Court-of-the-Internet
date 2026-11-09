"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useReduceMotion } from "@/components/ui/useReduceMotion";
import { markToastedAction } from "@/app/actions/notifications";
import { AchievementBadge } from "@/components/art/badges";
import { getAchievement } from "@/lib/achievements";
import { Confetti } from "./Confetti";

export interface ToastItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  data: unknown;
}

/**
 * Pops achievement unlocks, level-ups and verdicts one at a time, then records
 * them as shown so they don't repeat.
 */
export function Toaster({ initial }: { initial: ToastItem[] }) {
  const [queue, setQueue] = useState<ToastItem[]>(initial);
  const seen = useRef(new Set(initial.map((t) => t.id)));
  const reduce = useReduceMotion();

  useEffect(() => {
    const fresh = initial.filter((t) => !seen.current.has(t.id));
    if (fresh.length) {
      fresh.forEach((t) => seen.current.add(t.id));
      setQueue((q) => [...q, ...fresh]);
    }
  }, [initial]);

  useEffect(() => {
    if (initial.length) void markToastedAction(initial.map((t) => t.id));
  }, [initial]);

  const current = queue[0];
  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);
  const dismissAll = useCallback(() => setQueue([]), []);

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(dismiss, current.type === "ACHIEVEMENT" ? 5000 : 4000);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  const achievement = current?.type === "ACHIEVEMENT" ? getAchievement(String((current.data as { key?: string } | null)?.key ?? "")) : undefined;
  const celebratory = current && (current.type === "ACHIEVEMENT" || current.type === "LEVEL_UP" || (current.data as { won?: boolean } | null)?.won);

  // Phones: just under the header, away from the thumb zone where vote/confirm buttons sit, and
  // below the header (z-40) and its menus, so it never covers navigation. Larger screens: bottom right.
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[72px] z-[35] flex justify-center overflow-x-clip px-4 sm:bottom-6 sm:top-auto sm:justify-end sm:px-6">
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={current.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.9, rotate: -2 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className="pointer-events-auto relative w-full max-w-sm"
            role="status"
          >
            {/* Confetti falls behind and around the card so it never covers the text. */}
            {celebratory ? <Confetti pieces={28} className="pointer-events-none absolute -inset-x-8 -top-28 bottom-0 z-0 overflow-visible" /> : null}
            <div className="doc doc-ruled relative z-10 flex items-center gap-3 p-3 pr-10 sm:gap-4 sm:p-4">
              {achievement ? (
                <AchievementBadge icon={achievement.icon} tier={achievement.tier} className="bdg-unlock h-14 w-11 shrink-0 sm:h-20 sm:w-16" />
              ) : (
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-burgundy font-display text-xl font-black text-gold-light shadow-inner sm:h-14 sm:w-14 sm:text-2xl">
                  {current.type === "LEVEL_UP" ? "↑" : "§"}
                </div>
              )}
              <div className="min-w-0">
                <p className="eyebrow !text-burgundy">
                  {current.type === "ACHIEVEMENT" ? "Achievement unlocked" : current.type === "LEVEL_UP" ? "Promotion" : "Verdict"}
                </p>
                <p className="font-display text-base font-black leading-tight sm:text-lg">{achievement?.name ?? current.title}</p>
                {/* Phones keep the card short (it sits over the top of the page): two lines of body at most. */}
                <p className="muted line-clamp-2 text-sm sm:line-clamp-none">{current.body}</p>
                <div className="flex flex-wrap gap-x-4">
                  {current.href ? (
                    <Link href={current.href} onClick={dismiss} className="inline-flex min-h-9 min-w-11 items-center text-sm font-bold text-burgundy underline underline-offset-2">
                      View
                    </Link>
                  ) : null}
                  {queue.length > 1 ? (
                    <button type="button" onClick={dismissAll} className="inline-flex min-h-9 items-center text-sm font-semibold text-sepia underline underline-offset-2">
                      Dismiss all ({queue.length})
                    </button>
                  ) : null}
                </div>
              </div>
              <button type="button" onClick={dismiss} className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full text-sepia hover:bg-ink/10 hover:text-ink" aria-label="Dismiss notification">
                ✕
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
