"use client";

import { useCallback } from "react";
import clsx from "clsx";
import type { ActionResult } from "@/app/actions/_util";
import { moderationAction } from "@/app/actions/moderation";
import { useFormAction } from "@/components/ui/useFormAction";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useModFlash } from "./ModFlash";

/** A tiny form that posts one moderation operation and shows the result inline. */
export function ModForm({
  op,
  label,
  caseId,
  userId,
  tone = "ghost",
  withReason,
  reasonPlaceholder,
  options,
  confirmText,
  hidden,
}: {
  op: string;
  label: string;
  caseId?: string;
  userId?: string;
  tone?: "ghost" | "crimson" | "teal" | "gold";
  withReason?: boolean;
  reasonPlaceholder?: string;
  options?: { name: string; label: string; values: { value: string; label: string }[] };
  confirmText?: string;
  /** Extra hidden fields, e.g. the deadline the officer was looking at when adjourning. */
  hidden?: Record<string, string>;
}) {
  const flash = useModFlash();
  const run = useCallback(
    async (prev: ActionResult | null, fd: FormData) => {
      const result = await moderationAction(prev, fd);
      if (result.ok && result.message) flash?.(result.message);
      return result;
    },
    [flash],
  );
  const [state, formProps, pending] = useFormAction(run);
  return (
    <form
      action={formProps.action}
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) {
          e.preventDefault();
          return;
        }
        formProps.onSubmit(e);
      }}
      className="on-dark flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="op" value={op} />
      {caseId ? <input type="hidden" name="caseId" value={caseId} /> : null}
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}
      {hidden ? Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />) : null}
      {withReason ? <input name="reason" maxLength={300} placeholder={reasonPlaceholder ?? "Reason"} className="input min-h-9 !w-56 !py-1.5 text-sm" aria-label="Reason" /> : null}
      {options ? (
        <select name={options.name} className="select min-h-9 !w-56 !py-1.5 text-sm" aria-label={options.label}>
          {options.values.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      ) : null}
      <SubmitButton
        pending={pending}
        className={clsx("btn-sm", tone === "ghost" && "btn-ghost", tone === "crimson" && "btn-crimson", tone === "teal" && "btn-teal")}
        pendingLabel="Working…"
      >
        {label}
      </SubmitButton>
      {/* Successes appear once, in the console's flash banner (when there is one); errors stay by the button. */}
      {state && (!state.ok || !flash) ? (
        <span role="status" className={clsx("text-xs font-semibold", state.ok ? "text-[#8fe3cc]" : "text-[#ff9d9d]")}>
          {state.ok ? state.message : state.error}
        </span>
      ) : null}
    </form>
  );
}
