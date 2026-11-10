"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reportAction } from "@/app/actions/cases";
import { useFormAction } from "@/components/ui/useFormAction";
import { REPORT_REASONS } from "@/lib/validation";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError, FormAlert } from "@/components/ui/FormAlert";
import { IconFlag } from "@/components/art/props";

export function ReportDialog({
  caseId,
  targets,
  alreadyReported,
}: {
  caseId: string;
  targets: ("CASE" | "DEFENSE" | "PROSECUTION")[];
  alreadyReported: string[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Each opening gets a fresh form (and fresh action state), so a finished report can't be resubmitted.
  const [round, setRound] = useState(0);
  const close = useCallback(() => ref.current?.close(), []);
  const available = targets.filter((t) => !alreadyReported.includes(t));
  // The dialog stays mounted even once everything is reported, so the confirmation isn't cut off
  // when the page refreshes after the last report.
  return (
    <>
      {available.length === 0 ? (
        <p className="text-xs text-parchment/50">You reported this case. The clerks are reviewing it.</p>
      ) : (
        <button type="button" className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-parchment/60 hover:text-[#ff9d9d]" onClick={() => ref.current?.showModal()}>
          <IconFlag className="h-3.5 w-3.5" /> Report to the clerks
        </button>
      )}
      <dialog
        ref={ref}
        onClose={() => setRound((r) => r + 1)}
        className="m-auto w-[min(92vw,32rem)] rounded-xl bg-transparent p-0 backdrop:bg-night/80 backdrop:backdrop-blur-sm"
        aria-labelledby="report-title"
      >
        <ReportForm key={round} caseId={caseId} available={available} close={close} />
      </dialog>
    </>
  );
}

function ReportForm({ caseId, available: current, close }: { caseId: string; available: string[]; close: () => void }) {
  // Frozen for this opening: the page refresh after a report must not swap the selected target.
  const [available] = useState(current);
  const [state, formProps, pending] = useFormAction(reportAction);
  const done = state?.ok === true;
  const sentForReview = state?.ok === true && state.data?.autoReview === true;

  useEffect(() => {
    if (!done) return;
    // A report that sends the case for review turns the page into a short notice; bring the reader
    // back to the top of it rather than leaving them looking at the footer (audit 50 D4).
    if (sentForReview) window.scrollTo({ top: 0 });
    const t = setTimeout(close, 2500);
    return () => clearTimeout(t);
  }, [done, sentForReview, close]);

  if (done) {
    return (
      <div className="doc doc-ruled p-6" role="status">
        <h2 id="report-title" className="font-display text-2xl font-black">
          Report filed
        </h2>
        <FormAlert kind="success" className="mt-3 !text-teal">
          {state.message}
        </FormAlert>
        <div className="mt-5 flex justify-end">
          <button type="button" className="btn btn-ink btn-sm" onClick={close} autoFocus>
            Close
          </button>
        </div>
      </div>
    );
  }
  return (
    <form {...formProps} className="doc doc-ruled p-6">
      <h2 id="report-title" className="font-display text-2xl font-black">
        Report this case
      </h2>
      <p className="muted mt-1 text-sm">
        This court is for harmless, petty, or fictional crimes. Report anything that names real people, shares personal information, or is hateful,
        threatening, or sexual.
      </p>
      <input type="hidden" name="caseId" value={caseId} />
      <label className="field-label mt-4" htmlFor="report-target">
        What are you reporting?
      </label>
      <select id="report-target" name="target" className="select" defaultValue={available[0]}>
        {available.map((t) => (
          <option key={t} value={t}>
            {t === "CASE" ? "The confession" : t === "DEFENSE" ? "The defense argument" : "The prosecution argument"}
          </option>
        ))}
      </select>
      <fieldset className="mt-4">
        <legend className="field-label">Reason</legend>
        <div className="grid gap-1.5">
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex min-h-9 items-center gap-2 text-sm">
              <input type="radio" name="reason" value={r.value} required className="h-4 w-4 accent-burgundy" /> {r.label}
            </label>
          ))}
        </div>
        <FieldError errors={state && !state.ok ? state.fieldErrors?.reason : undefined} />
      </fieldset>
      <label className="field-label mt-4" htmlFor="report-details">
        Details (optional)
      </label>
      <textarea id="report-details" name="details" rows={3} maxLength={500} className="textarea !min-h-0" />
      {state && !state.ok ? <FormAlert className="mt-3">{state.error}</FormAlert> : null}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn btn-ink btn-sm" onClick={close}>
          Cancel
        </button>
        <SubmitButton pending={pending} className="btn-crimson btn-sm" pendingLabel="Filing report…">
          Submit report
        </SubmitButton>
      </div>
    </form>
  );
}
