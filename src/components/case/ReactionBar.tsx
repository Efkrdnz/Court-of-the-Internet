"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import { motion } from "motion/react";
import { useReduceMotion } from "@/components/ui/useReduceMotion";
import { reactAction } from "@/app/actions/cases";
import { REACTIONS, type ReactionKey } from "@/lib/reactions";
import { callAction } from "@/components/ui/callAction";

function ReactionGlyph({ type, className }: { type: ReactionKey; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "HILARIOUS": // a comedy mask crying with laughter
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path {...common} d="M4 5c5-2 11-2 16 0 .5 8-2.5 14-8 15C6.5 19 3.5 13 4 5Z" />
          <path {...common} d="M7.5 10.5c.8-1 2.2-1 3 0M13.5 10.5c.8-1 2.2-1 3 0" />
          <path {...common} d="M8 14c2.5 3 5.5 3 8 0Z" />
          <path {...common} d="M6.5 11.5 5 14M17.5 11.5 19 14" />
        </svg>
      );
    case "OUTRAGEOUS": // a monocle popping off
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <circle {...common} cx="9" cy="10" r="5" />
          <path {...common} d="M13 14c2 2 3 4 3 7" />
          <path {...common} d="M17 3l1.5 2.5M20.5 6.5 18 7.5M21 2.5l-1 1.5" />
          <circle cx="9" cy="10" r="1.5" fill="currentColor" />
        </svg>
      );
    case "LEGENDARY": // laurel wreath
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path {...common} d="M7 20c-3-3-4-8-2-13M17 20c3-3 4-8 2-13" />
          <path {...common} d="M4.5 9c1.5 0 2.5 1 2.5 2.5M4 13c1.6 0 2.8 1 3 2.5M5.5 16.5c1.4 0 2.5.6 3 2M19.5 9c-1.5 0-2.5 1-2.5 2.5M20 13c-1.6 0-2.8 1-3 2.5M18.5 16.5c-1.4 0-2.5.6-3 2" />
          <path {...common} d="M12 4.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 10.5l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4Z" />
        </svg>
      );
    case "RELATABLE": // pointing at yourself
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path {...common} d="M9 21v-6.5c0-1 .8-1.8 1.8-1.8h5.4c1 0 1.8.8 1.8 1.8V21" />
          <circle {...common} cx="13.5" cy="7.5" r="3.5" />
          <path {...common} d="M3 12h4.5M5.5 9.5 8 12l-2.5 2.5" />
        </svg>
      );
  }
}

export function ReactionBar({
  caseId,
  counts: initialCounts,
  active: initialActive,
  canReact,
  reason,
  loginHref,
}: {
  caseId: string;
  counts: Record<ReactionKey, number>;
  active: ReactionKey[];
  canReact: boolean;
  reason?: string;
  loginHref: string;
}) {
  const reduce = useReduceMotion();
  const [counts, setCounts] = useState(initialCounts);
  const [active, setActive] = useState<Set<ReactionKey>>(new Set(initialActive));
  const [bump, setBump] = useState<ReactionKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(type: ReactionKey) {
    if (!canReact) return;
    const wasActive = active.has(type);
    // Optimistic update.
    setActive((s) => {
      const n = new Set(s);
      if (wasActive) n.delete(type);
      else n.add(type);
      return n;
    });
    setCounts((c) => ({ ...c, [type]: Math.max(0, c[type] + (wasActive ? -1 : 1)) }));
    if (!wasActive) setBump(type);
    start(async () => {
      const result = await callAction(() => reactAction(caseId, type));
      if (!result.ok) {
        setError(result.error);
        setActive((s) => {
          const n = new Set(s);
          if (wasActive) n.add(type);
          else n.delete(type);
          return n;
        });
        setCounts((c) => ({ ...c, [type]: Math.max(0, c[type] + (wasActive ? 1 : -1)) }));
      } else if (result.data) {
        const d = result.data.counts as Record<string, number>;
        setCounts({ HILARIOUS: d.hilariousCount, OUTRAGEOUS: d.outrageousCount, LEGENDARY: d.legendaryCount, RELATABLE: d.relatableCount });
        // The server says where the toggle actually landed (a stale tab may have been out of date).
        const nowActive = result.data.active;
        setActive((s) => {
          const n = new Set(s);
          if (nowActive) n.add(type);
          else n.delete(type);
          return n;
        });
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="React to this case">
        {REACTIONS.map((r) => {
          const on = active.has(r.type);
          return (
            <motion.button
              key={r.type}
              type="button"
              onClick={() => toggle(r.type)}
              disabled={!canReact || pending}
              aria-pressed={on}
              title={canReact ? `${r.label}` : reason}
              animate={bump === r.type && !reduce ? { scale: [1, 1.25, 1], rotate: [0, -8, 0] } : undefined}
              onAnimationComplete={() => setBump(null)}
              className={clsx(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition-colors",
                on ? "border-transparent text-ink" : "border-gold/35 bg-night/40 text-parchment hover:border-gold-light",
                !canReact && "cursor-not-allowed opacity-70",
              )}
              style={on ? { background: r.color } : undefined}
            >
              <ReactionGlyph type={r.type} className="h-5 w-5" />
              <span>{r.label}</span>
              <span className="tabular-nums opacity-80">{counts[r.type]}</span>
            </motion.button>
          );
        })}
      </div>
      {!canReact && reason === "signin" ? (
        <p className="mt-2 text-sm text-parchment/70">
          <Link href={loginHref} className="font-bold text-gold-light underline">
            Sign in
          </Link>{" "}
          to react.
        </p>
      ) : !canReact && reason ? (
        // Visible, not just a tooltip: participants and banned players see why the buttons are off.
        <p className="mt-2 text-sm text-parchment/70">{reason}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-[#ff9d9d]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
