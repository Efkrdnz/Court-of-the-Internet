"use client";

import { useEffect, useRef } from "react";
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
  const [state, formProps, pending] = useFormAction(reportAction);

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => ref.current?.close(), 1800);
      return () => clearTimeout(t);
    }
  }, [state]);

  const available = targets.filter((t) => !alreadyReported.includes(t));
  if (available.length === 0) {
    return <p className="text-xs text-parchment/50">You reported this case. The clerks are reviewing it.</p>;
  }
  return (
    <>
      <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-parchment/60 hover:text-[#ff9d9d]" onClick={() => ref.current?.showModal()}>
        <IconFlag className="h-3.5 w-3.5" /> Report to the clerks
      </button>
      <dialog ref={ref} className="m-auto w-[min(92vw,32rem)] rounded-xl bg-transparent p-0 backdrop:bg-night/80 backdrop:backdrop-blur-sm" aria-labelledby="report-title">
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
                <label key={r.value} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="reason" value={r.value} required className="accent-burgundy" /> {r.label}
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
          {state?.ok ? (
            <FormAlert kind="success" className="mt-3 !text-teal">
              {state.message}
            </FormAlert>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-ink btn-sm" onClick={() => ref.current?.close()}>
              Cancel
            </button>
            <SubmitButton pending={pending} className="btn-crimson btn-sm" pendingLabel="Filing report…">
              Submit report
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
