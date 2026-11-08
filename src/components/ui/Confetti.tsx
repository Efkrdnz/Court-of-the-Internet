"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { useReduceMotion } from "@/components/ui/useReduceMotion";

const COLORS = ["#c9a227", "#e8c766", "#b3202a", "#faf6ec", "#2f8f83", "#8c1d2f"];

/** Lightweight DOM confetti (and the occasional paper document). Renders nothing for reduced motion. */
export function Confetti({ pieces = 60, className }: { pieces?: number; className?: string }) {
  const reduce = useReduceMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const seed = Math.sin(i * 999) * 10000;
        const r = seed - Math.floor(seed);
        const r2 = Math.abs(Math.sin(i * 77)) % 1;
        return {
          left: `${(r * 100).toFixed(2)}%`,
          delay: r2 * 0.35,
          duration: 1.4 + r * 1.4,
          drift: (r2 - 0.5) * 160,
          rotate: (r - 0.5) * 900,
          color: COLORS[i % COLORS.length],
          w: i % 7 === 0 ? 10 : 6 + Math.round(r * 4),
          h: i % 7 === 0 ? 13 : 10 + Math.round(r2 * 8),
          paper: i % 7 === 0,
        };
      }),
    [pieces],
  );
  if (reduce) return null;
  return (
    <div aria-hidden className={className ?? "pointer-events-none absolute inset-0 z-10 overflow-visible"}>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: 420, x: b.drift, rotate: b.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: b.duration, delay: b.delay, ease: "easeIn" }}
          style={{
            position: "absolute",
            top: 0,
            left: b.left,
            width: b.w,
            height: b.h,
            background: b.paper ? "#faf6ec" : b.color,
            borderRadius: b.paper ? 1 : 2,
            boxShadow: b.paper ? "inset 0 -3px 0 rgba(90,70,50,.25)" : undefined,
          }}
        />
      ))}
    </div>
  );
}
