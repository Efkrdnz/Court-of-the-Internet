"use client";

import { motion } from "motion/react";

export function TallyBars({ guilty, notGuilty, animate = true, light = false }: { guilty: number; notGuilty: number; animate?: boolean; light?: boolean }) {
  const total = guilty + notGuilty;
  const g = total ? guilty / total : 0;
  const ng = total ? notGuilty / total : 0;
  const rows = [
    { label: "Not guilty", value: notGuilty, pct: ng, color: "from-teal-light to-teal" },
    { label: "Guilty", value: guilty, pct: g, color: "from-[#e0474f] to-crimson" },
  ];
  return (
    <div className="space-y-2" role="group" aria-label={`Tally: ${guilty} guilty, ${notGuilty} not guilty`}>
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className={`w-24 shrink-0 text-sm font-bold ${light ? "text-ink" : "text-parchment"}`}>{r.label}</span>
          <div className={`relative h-6 flex-1 overflow-hidden rounded-full ${light ? "bg-ink/10" : "bg-night/60"} ring-1 ring-gold/25`}>
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${r.color}`}
              initial={animate ? { width: 0 } : false}
              animate={{ width: `${Math.max(r.pct * 100, r.value ? 4 : 0)}%` }}
              transition={{ duration: 0.9, delay: 0.15 * i, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </div>
          <span className={`w-20 shrink-0 text-right font-type text-sm tabular-nums ${light ? "text-ink" : "text-parchment"}`}>
            {r.value} · {Math.round(r.pct * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}
