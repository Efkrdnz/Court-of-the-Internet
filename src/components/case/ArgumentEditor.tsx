"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import clsx from "clsx";
import { submitArgumentAction, releaseAction } from "@/app/actions/cases";
import type { ActionResult } from "@/app/actions/_util";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError, FormAlert } from "@/components/ui/FormAlert";
import { CharCounter } from "@/components/ui/CharCounter";
import { Countdown } from "@/components/ui/Countdown";
import { LIMITS } from "@/lib/limits";
import { charCount } from "@/lib/text";

const TIPS = {
  DEFENSE: [
    "Reframe the crime as a public service.",
    "Blame the victim's lack of foresight (respectfully).",
    "Invoke an obscure, entirely made-up legal doctrine.",
    "Appeal to the jury's own secret crimes.",
  ],
  PROSECUTION: [
    "Quote the defense's weakest line back at them.",
    "Point out the one detail that proves premeditation.",
    "Speak for the true victim: the pizza, the dog, the hoodie.",
    "End with a line the jury will repeat at dinner.",
  ],
} as const;

const OPENERS = {
  DEFENSE: ["Your Honour, my client is a victim of circumstance…", "Members of the jury, consider the alternative…", "The prosecution will tell you… but they're wrong because…"],
  PROSECUTION: ["The defense would have you believe…", "Members of the jury, look at the evidence…", "One word in the confession says it all: …"],
} as const;

export function ArgumentEditor({ caseId, role, expiresAt }: { caseId: string; role: "DEFENSE" | "PROSECUTION"; expiresAt: string }) {
  const storageKey = `coti-draft-${role}-${caseId}`;
  const [body, setBody] = useState("");
  const [state, action] = useActionState<ActionResult | null, FormData>(submitArgumentAction.bind(null, role), null);
  const [releasing, startRelease] = useTransition();
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // Restore an unsent draft (per-browser convenience only).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) setBody((b) => b || saved);
      } catch {
        /* storage unavailable */
      }
    }, 0);
    return () => clearTimeout(t);
  }, [storageKey]);
  useEffect(() => {
    try {
      if (body) localStorage.setItem(storageKey, body);
    } catch {
      /* ignore */
    }
  }, [body, storageKey]);

  const count = charCount(body.trim());
  const tooShort = count < LIMITS.argument.min;
  const tooLong = count > LIMITS.argument.max;
  const isDefense = role === "DEFENSE";

  return (
    <div className="space-y-5">
      <div className={clsx("flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3", isDefense ? "bg-teal/25 ring-1 ring-teal-light/40" : "bg-crimson/20 ring-1 ring-crimson/40")}>
        <p className="text-sm font-semibold text-parchment">
          You hold this case. Your claim expires in{" "}
          <strong className="text-gold-light">
            <Countdown to={expiresAt} expiredLabel="now: file quickly or lose it!" />
          </strong>
        </p>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={releasing}
          onClick={() => {
            if (!confirm("Release this case back to the docket? Your draft will be kept on this device.")) return;
            startRelease(async () => {
              const r = await releaseAction(caseId);
              if (r && !r.ok) setReleaseError(r.error);
            });
          }}
        >
          {releasing ? "Releasing…" : "Release case"}
        </button>
      </div>
      {releaseError ? <FormAlert>{releaseError}</FormAlert> : null}

      <form
        action={(fd) => {
          try {
            localStorage.removeItem(storageKey);
          } catch {
            /* ignore */
          }
          return action(fd);
        }}
        className="doc doc-ruled p-5 sm:p-7"
      >
        <input type="hidden" name="caseId" value={caseId} />
        <label htmlFor="argument-body" className="field-label flex items-center justify-between">
          <span>{isDefense ? "Your defense" : "Your rebuttal"}</span>
          <span className="font-type text-xs font-normal text-sepia">One shot. No edits after filing.</span>
        </label>
        <div className="mb-3 flex flex-wrap gap-2">
          {OPENERS[role].map((o) => (
            <button key={o} type="button" className="rounded-full border border-sepia/40 bg-white/40 px-3 py-1 text-xs font-semibold text-ink hover:bg-white/70" onClick={() => setBody((b) => (b ? b : o))}>
              {o}
            </button>
          ))}
        </div>
        <textarea
          id="argument-body"
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          maxLength={LIMITS.argument.max + 50}
          className="textarea textarea-lined"
          placeholder={isDefense ? "Your Honour, my client is innocent because…" : "Members of the jury, the defense would have you believe…"}
          aria-invalid={!!state && !state.ok && !!state.fieldErrors?.body}
          aria-describedby="argument-count argument-error"
          required
        />
        <CharCounter id="argument-count" count={count} min={LIMITS.argument.min} max={LIMITS.argument.max} />
        <FieldError id="argument-error" errors={state && !state.ok ? state.fieldErrors?.body : undefined} />
        {state && !state.ok && !state.fieldErrors?.body ? <FormAlert className="mt-3">{state.error}</FormAlert> : null}

        <details className="mt-4 text-sm text-ink/80">
          <summary className="cursor-pointer font-bold text-burgundy">Tips from senior partners</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {TIPS[role].map((t) => (
              <li key={t}>{t}</li>
            ))}
            <li>Keep it about the crime. No real names, no personal info, no cruelty.</li>
          </ul>
        </details>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <SubmitButton className={clsx("btn-lg", isDefense ? "btn-teal" : "btn-crimson")} pendingLabel="Filing with the clerk…" disabled={tooShort || tooLong}>
            {isDefense ? "File the defense" : "File the prosecution"}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
