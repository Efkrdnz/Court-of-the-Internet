"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useReduceMotion } from "@/components/ui/useReduceMotion";
import { Gavel, VerdictStamp } from "@/components/art/props";
import { JudgeOwl } from "@/components/art/characters";
import { Confetti } from "@/components/ui/Confetti";
import { TallyBars } from "./TallyBars";

type Verdict = "GUILTY" | "NOT_GUILTY" | "MISTRIAL" | "DISMISSED";

const HEADLINES: Record<Verdict, { title: string; sub: string }> = {
  GUILTY: { title: "GUILTY!", sub: "The prosecution prevails. The defendant is sentenced to eternal public ridicule." },
  NOT_GUILTY: { title: "NOT GUILTY!", sub: "The defense prevails. The defendant walks free, smugly." },
  MISTRIAL: { title: "MISTRIAL!", sub: "The jury split down the middle. Chaos reigns. Nobody wins, everybody loses." },
  DISMISSED: { title: "DISMISSED", sub: "Too few jurors showed up. The case is dismissed for lack of quorum." },
};

/**
 * Theatrical verdict reveal: the judge raises the gavel, it slams, the stamp lands.
 * Plays automatically the first time a visitor sees a verdict in this browser session;
 * afterwards (or with reduced motion) shows the final state with a replay button.
 */
export function VerdictReveal({
  caseNumber,
  verdict,
  guilty,
  notGuilty,
  outcome,
}: {
  caseNumber: number;
  verdict: Verdict;
  guilty: number;
  notGuilty: number;
  /** The viewer's personal result, if they took part. */
  outcome: "won" | "lost" | null;
}) {
  const reduce = useReduceMotion();
  const [stage, setStage] = useState<"idle" | "gavel" | "stamp" | "done">("done");
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const key = `coti-verdict-seen-${caseNumber}`;
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === "1";
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage unavailable: just play */
    }
    if (seen) return;
    const t = setTimeout(() => setRunId(1), 0);
    return () => clearTimeout(t);
  }, [caseNumber, reduce]);

  useEffect(() => {
    if (runId === 0) return;
    const timers = [setTimeout(() => setStage("idle"), 0), setTimeout(() => setStage("gavel"), 350), setTimeout(() => setStage("stamp"), 1150), setTimeout(() => setStage("done"), 2300)];
    return () => timers.forEach(clearTimeout);
  }, [runId]);

  const h = HEADLINES[verdict];
  const showStamp = stage === "stamp" || stage === "done";
  const celebrate = outcome === "won" && showStamp && runId > 0;
  const tone =
    verdict === "GUILTY" ? "from-crimson/40" : verdict === "NOT_GUILTY" ? "from-teal/45" : verdict === "MISTRIAL" ? "from-plum/50" : "from-charcoal-2/60";

  return (
    <section aria-labelledby="verdict-heading" className={clsx("velvet relative overflow-hidden bg-gradient-to-b to-transparent p-6 sm:p-8", tone)}>
      {celebrate ? <Confetti pieces={70} /> : null}
      <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="relative mx-auto w-full max-w-xs">
          <JudgeOwl mood={verdict === "MISTRIAL" ? "shocked" : verdict === "DISMISSED" ? "sleepy" : "stern"} className="chr-hover chr-sticker w-full" />
          <motion.div
            className="absolute -right-4 bottom-6 w-28 origin-bottom-right sm:w-32"
            initial={false}
            animate={
              reduce || stage === "done" || stage === "stamp"
                ? { rotate: 0, y: 0 }
                : stage === "idle"
                  ? { rotate: -35, y: -14 }
                  : { rotate: [-35, 8, 0], y: [-14, 4, 0] }
            }
            transition={{ duration: 0.45, ease: "easeIn" }}
          >
            <Gavel slam={stage === "gavel"} className="w-full" />
          </motion.div>
        </div>
        <div className="relative">
          <p className="eyebrow">The verdict</p>
          <div className="relative mt-2 min-h-[150px]">
            <AnimatePresence>
              {showStamp ? (
                <motion.div
                  key={`stamp-${runId}`}
                  initial={reduce || runId === 0 ? false : { scale: 2.6, opacity: 0, rotate: -18 }}
                  animate={{ scale: 1, opacity: 1, rotate: -6 }}
                  transition={{ type: "spring", stiffness: 520, damping: 18 }}
                  className="w-full max-w-md"
                >
                  <VerdictStamp verdict={verdict} className="w-full drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]" />
                </motion.div>
              ) : (
                <p className="font-display text-2xl italic text-parchment/70">The court will now come to order…</p>
              )}
            </AnimatePresence>
          </div>
          <h2 id="verdict-heading" className="sr-only">
            Verdict: {h.title}
          </h2>
          <motion.div initial={false} animate={{ opacity: showStamp ? 1 : 0.15 }} className="mt-4 space-y-4">
            <p className="text-lg text-parchment">{h.sub}</p>
            {outcome ? (
              <p className={clsx("inline-block rounded-full px-4 py-1 text-sm font-black uppercase tracking-widest", outcome === "won" ? "bg-gold text-ink" : "bg-night/60 text-parchment")}>
                {outcome === "won" ? "You won this case!" : "You lost this one. Appeal denied."}
              </p>
            ) : null}
            {verdict !== "DISMISSED" || guilty + notGuilty > 0 ? <TallyBars guilty={guilty} notGuilty={notGuilty} animate={!reduce && runId > 0} /> : null}
            {!reduce ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRunId((r) => r + 1)}>
                Replay the verdict
              </button>
            ) : null}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
