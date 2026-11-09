"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useReduceMotion } from "@/components/ui/useReduceMotion";
import { voteAction } from "@/app/actions/cases";
import { CatJury } from "@/components/art/characters";
import { Countdown } from "@/components/ui/Countdown";
import { Spinner } from "@/components/ui/SubmitButton";
import { TallyBars } from "./TallyBars";

type Choice = "GUILTY" | "NOT_GUILTY";

export function VoteBooth({
  caseId,
  endsAt,
  votesCast,
  quorum,
  initialTallies,
  initialVote,
  ineligibleReason,
  signedIn,
  loginHref,
  onVoted,
  compact = false,
  nextHref,
}: {
  caseId: string;
  endsAt: string;
  votesCast: number;
  quorum: number;
  initialTallies: { guilty: number; notGuilty: number } | null;
  initialVote: Choice | null;
  ineligibleReason?: string | null;
  signedIn: boolean;
  loginHref: string;
  onVoted?: () => void;
  compact?: boolean;
  /** After voting, offer a link to the next case (jury duty flow). */
  nextHref?: string;
}) {
  const reduce = useReduceMotion();
  const [selected, setSelected] = useState<Choice | null>(null);
  const router = useRouter();
  const [localVote, setVote] = useState<Choice | null>(initialVote);
  const [localTallies, setTallies] = useState(initialTallies);
  // Server props win once they know about a vote (e.g. after a refresh from a stale tab).
  const vote = localVote ?? initialVote;
  const tallies = localTallies ?? initialTallies;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const total = tallies ? tallies.guilty + tallies.notGuilty : votesCast;

  function submit(choice: Choice) {
    start(async () => {
      setError(null);
      const result = await voteAction(caseId, choice);
      if (result.ok && result.data) {
        setVote(result.data.choice);
        setTallies({ guilty: result.data.guiltyVotes, notGuilty: result.data.notGuiltyVotes });
        onVoted?.();
      } else if (!result.ok) {
        setError(result.error);
        setSelected(null);
        router.refresh(); // state may have changed elsewhere (another tab, deliberation closed)
      }
    });
  }

  const juryMood = vote ? (tallies && ((vote === "GUILTY" && tallies.guilty >= tallies.notGuilty) || (vote === "NOT_GUILTY" && tallies.notGuilty >= tallies.guilty)) ? "approving" : "shocked") : selected ? "shocked" : "judging";

  return (
    <section aria-labelledby={`vote-${caseId}`} className="velvet relative overflow-hidden p-5 sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_center,rgba(232,199,102,0.18),transparent_70%)]" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Jury deliberation</p>
          <h2 id={`vote-${caseId}`} className="font-display text-2xl font-black text-parchment sm:text-3xl">
            {vote ? "Your vote is sealed." : "How does the jury find the defendant?"}
          </h2>
          <p className="mt-1 text-sm text-parchment/70">
            {total >= quorum ? `${total} votes · quorum reached` : `${total} of ${quorum} votes needed for a verdict`} · closes in{" "}
            <Countdown to={endsAt} className="font-bold text-gold-light" expiredLabel="moments" />
          </p>
        </div>
        {!compact ? <CatJury mood={juryMood} count={6} className="chr-hover chr-sticker -mb-2 hidden w-48 shrink-0 sm:block sm:w-56" /> : null}
      </div>

      <div className="relative mt-6">
        {vote ? (
          <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <p className="text-parchment">
              You voted{" "}
              <strong className={vote === "GUILTY" ? "text-[#ff8b8b]" : "text-[#8fe3cc]"}>{vote === "GUILTY" ? "GUILTY" : "NOT GUILTY"}</strong>. The
              current tally is revealed below. The final verdict arrives when deliberation closes.
            </p>
            {tallies ? <TallyBars guilty={tallies.guilty} notGuilty={tallies.notGuilty} animate={!reduce} /> : null}
            {nextHref ? (
              <Link href={nextHref} className="btn btn-lg mt-2">
                Next case on the docket →
              </Link>
            ) : null}
          </motion.div>
        ) : ineligibleReason ? (
          <p className="rounded-lg bg-night/40 px-4 py-3 text-parchment/80">{ineligibleReason}</p>
        ) : !signedIn ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-parchment/80">Jurors must be sworn in (signed in) to vote.</p>
            <Link href={loginHref} className="btn btn-sm">
              Sign in to vote
            </Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(["NOT_GUILTY", "GUILTY"] as Choice[]).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  disabled={pending}
                  aria-pressed={selected === choice}
                  onClick={() => setSelected(choice)}
                  className={clsx(
                    "group relative min-h-24 overflow-hidden rounded-xl border-2 px-5 py-4 text-left transition-all",
                    choice === "GUILTY"
                      ? "border-crimson/60 bg-gradient-to-br from-crimson/30 to-burgundy-dark/60 hover:border-[#ff6b6b]"
                      : "border-teal-light/60 bg-gradient-to-br from-teal/35 to-[#0e2a24]/70 hover:border-[#6fe0c4]",
                    selected === choice && "scale-[1.02] ring-4 ring-gold/60",
                    selected && selected !== choice && "opacity-50",
                  )}
                >
                  <span className="block font-display text-3xl font-black tracking-wide text-ivory">{choice === "GUILTY" ? "GUILTY" : "NOT GUILTY"}</span>
                  <span className="mt-1 block text-sm text-parchment/75">
                    {choice === "GUILTY" ? "The prosecution made its case. Lock them up (metaphorically)." : "The defense convinced you. Let them go free."}
                  </span>
                </button>
              ))}
            </div>
            <AnimatePresence>
              {selected ? (
                <motion.div
                  initial={reduce ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={reduce ? undefined : { opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-night/50 px-4 py-3">
                    <p className="text-sm text-parchment">
                      Votes are final. Seal your <strong>{selected === "GUILTY" ? "guilty" : "not guilty"}</strong> vote?
                    </p>
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} disabled={pending}>
                        Reconsider
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => submit(selected)} disabled={pending}>
                        {pending ? <Spinner /> : null}
                        {pending ? "Sealing…" : "Seal my vote"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <p className="mt-3 text-xs text-parchment/55">The tally stays hidden until you vote, to keep the jury honest.</p>
          </div>
        )}
        {error ? (
          <p role="alert" className="mt-3 text-sm font-bold text-[#ff9d9d]">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
