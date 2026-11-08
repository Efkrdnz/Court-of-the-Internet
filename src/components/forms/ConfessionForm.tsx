"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { motion } from "motion/react";
import { useReduceMotion } from "@/components/ui/useReduceMotion";
import { confessAction } from "@/app/actions/cases";
import type { ActionResult } from "@/app/actions/_util";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { LIMITS } from "@/lib/limits";
import { charCount } from "@/lib/text";
import { anonymousAlias } from "@/lib/alias";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { CharCounter } from "@/components/ui/CharCounter";
import { FieldError, FormAlert } from "@/components/ui/FormAlert";
import { CategoryIcon, WaxSeal } from "@/components/art/props";

const PROMPTS = [
  "I ate my roommate's leftovers and…",
  "During game night I secretly…",
  "I told the group chat I was busy, but actually…",
  "I've been pretending for months that…",
];

export function ConfessionForm({ displayName }: { displayName: string }) {
  const reduce = useReduceMotion();
  const [state, action] = useActionState<ActionResult | null, FormData>(confessAction, null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [confession, setConfession] = useState("");
  const [context, setContext] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const cat = category ? getCategory(category) : null;
  const previewAlias = anonymousAlias(title || "preview").name;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <form action={action} className="space-y-7" noValidate>
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        {state && !state.ok ? <FormAlert>{state.error}</FormAlert> : null}

        <fieldset className="velvet p-5 sm:p-6">
          <legend className="sr-only">Category</legend>
          <p className="font-display text-xl font-bold text-parchment">1. Choose the statute you broke</p>
          <p className="mb-4 text-sm text-parchment/60">Every crime belongs somewhere in the legal code.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORIES.map((c) => {
              const on = category === c.key;
              return (
                <label
                  key={c.key}
                  className={clsx(
                    "group relative flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition-all",
                    on ? "border-gold bg-gold/15 ring-2 ring-gold/50" : "border-gold/20 bg-night/30 hover:border-gold/60",
                  )}
                >
                  <input type="radio" name="category" value={c.key} checked={on} onChange={() => setCategory(c.key)} className="sr-only" />
                  <CategoryIcon category={c.key} className={clsx("h-10 w-10 shrink-0 transition-transform", on ? "scale-110 rotate-[-6deg]" : "group-hover:rotate-[-6deg]")} />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight text-parchment">{c.label}</span>
                    <span className="block font-type text-[11px] text-parchment/50">{c.statute}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {cat ? <p className="mt-3 text-sm italic text-gold-light/90">{cat.blurb}</p> : null}
          <FieldError errors={fe?.category} />
        </fieldset>

        <div className="doc doc-ruled space-y-5 p-5 sm:p-7">
          <p className="font-display text-xl font-bold">2. Make your confession</p>
          <div>
            <label htmlFor="cf-title" className="field-label">
              Case title
            </label>
            <input
              id="cf-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={LIMITS.title.max + 10}
              className="input"
              placeholder="I stole one French fry from everyone at the table"
              aria-invalid={!!fe?.title}
              aria-describedby="cf-title-count"
              required
            />
            <CharCounter id="cf-title-count" count={charCount(title.trim())} min={LIMITS.title.min} max={LIMITS.title.max} />
            <FieldError errors={fe?.title} />
          </div>
          <div>
            <label htmlFor="cf-confession" className="field-label">
              The confession
            </label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {PROMPTS.map((p) => (
                <button key={p} type="button" onClick={() => setConfession((c) => c || p)} className="rounded-full border border-sepia/40 bg-white/40 px-2.5 py-0.5 text-xs font-semibold text-ink hover:bg-white/70">
                  {p}
                </button>
              ))}
            </div>
            <textarea
              id="cf-confession"
              name="confession"
              value={confession}
              onChange={(e) => setConfession(e.target.value)}
              rows={6}
              maxLength={LIMITS.confession.max + 50}
              className="textarea textarea-lined"
              placeholder="Tell the court exactly what you did. Details make juries laugh."
              aria-invalid={!!fe?.confession}
              aria-describedby="cf-confession-count"
              required
            />
            <CharCounter id="cf-confession-count" count={charCount(confession.trim())} min={LIMITS.confession.min} max={LIMITS.confession.max} />
            <FieldError errors={fe?.confession} />
          </div>
          <div>
            <label htmlFor="cf-context" className="field-label">
              Additional context <span className="font-ui text-sm font-normal text-sepia">(optional)</span>
            </label>
            <textarea
              id="cf-context"
              name="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              maxLength={LIMITS.context.max + 20}
              className="textarea !min-h-0"
              placeholder="Mitigating circumstances, aggravating snacks…"
              aria-describedby="cf-context-count"
            />
            <CharCounter id="cf-context-count" count={charCount(context.trim())} max={LIMITS.context.max} />
            <FieldError errors={fe?.context} />
          </div>
        </div>

        <div className="velvet space-y-4 p-5 sm:p-6">
          <p className="font-display text-xl font-bold text-parchment">3. Sign (or don&apos;t)</p>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gold/25 bg-night/30 p-4">
            <input type="checkbox" name="anonymous" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-1 h-5 w-5 accent-gold" />
            <span>
              <span className="block font-bold text-parchment">Confess anonymously</span>
              <span className="block text-sm text-parchment/65">
                Your name is replaced by a random alias like “{previewAlias}”. The case won&apos;t appear on your public profile, but you can still follow it from your
                courtroom.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-parchment/85">
            <input type="checkbox" name="acceptRules" className="mt-1 h-5 w-5 accent-gold" required aria-invalid={!!fe?.acceptRules} />
            <span>
              This crime is harmless, petty or fictional. It names no real people and contains no personal information, per the{" "}
              <Link href="/rules" target="_blank" className="font-bold text-gold-light underline">
                community rules
              </Link>
              .
            </span>
          </label>
          <FieldError errors={fe?.acceptRules} />
          <SubmitButton className="btn-lg w-full" pendingLabel="Entering it into the record…">
            Submit my confession to the court
          </SubmitButton>
        </div>
      </form>

      {/* Live preview */}
      <aside aria-label="Live preview" className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow mb-3">Live preview</p>
        <motion.div
          layout={!reduce}
          className="doc doc-ruled relative overflow-hidden p-6"
          initial={false}
          animate={reduce ? undefined : { rotate: confession ? -0.6 : 0 }}
        >
          <div className="flex items-center justify-between">
            <span className="plaque text-xs">Case No. ????</span>
            <span className="pill bg-teal/15 text-teal ring-1 ring-teal/40">Awaiting Defense</span>
          </div>
          <p className="mt-5 text-center font-display text-xs font-bold uppercase tracking-[0.3em] text-burgundy">In the Court of the Internet</p>
          <p className="text-center font-display italic text-sepia">The People v. {anonymous ? previewAlias : displayName}</p>
          <h2 className="mt-3 text-balance text-center font-display text-2xl font-black leading-tight">{title.trim() || "Your case title appears here"}</h2>
          {cat ? (
            <p className="mt-2 flex items-center justify-center gap-2 text-sm text-sepia">
              <CategoryIcon category={cat.key} className="h-6 w-6" /> {cat.label} <span className="font-type">{cat.statute}</span>
            </p>
          ) : null}
          <div className="argument argument-confession mt-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gold-dark">Exhibit A · The Confession</p>
            <p className="typewritten mt-2 text-ink">{confession.trim() || "“I, the undersigned, hereby confess…”"}</p>
            {context.trim() ? <p className="mt-3 border-l-2 border-sepia/40 pl-3 text-sm italic text-ink/75">{context.trim()}</p> : null}
          </div>
          <WaxSeal color="burgundy" emblem="scales" className="absolute -bottom-4 -right-4 h-24 w-24 opacity-90" />
        </motion.div>
        <ol className="mt-6 space-y-2 text-sm text-parchment/70">
          <li>
            <strong className="text-gold-light">Next:</strong> a stranger claims your case and writes your defense.
          </li>
          <li>Then a prosecutor reads both and argues for conviction.</li>
          <li>Finally a jury of players votes for 24 hours. At least 10 votes are needed for a verdict.</li>
        </ol>
      </aside>
    </div>
  );
}
