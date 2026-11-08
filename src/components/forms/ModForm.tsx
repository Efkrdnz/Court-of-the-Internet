"use client";

import { useActionState } from "react";
import clsx from "clsx";
import { moderationAction } from "@/app/actions/moderation";
import type { ActionResult } from "@/app/actions/_util";
import { SubmitButton } from "@/components/ui/SubmitButton";

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
}: {
  op: string;
  label: string;
  caseId?: string;
  userId?: string;
  tone?: "ghost" | "crimson" | "teal" | "gold";
  withReason?: boolean;
  reasonPlaceholder?: string;
  options?: { name: string; values: string[] };
  confirmText?: string;
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(moderationAction, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
      className="on-dark flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="op" value={op} />
      {caseId ? <input type="hidden" name="caseId" value={caseId} /> : null}
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}
      {withReason ? <input name="reason" placeholder={reasonPlaceholder ?? "Reason"} className="input !w-56 !py-1.5 text-sm" aria-label="Reason" /> : null}
      {options ? (
        <select name={options.name} className="select !w-56 !py-1.5 text-sm" aria-label={options.name}>
          {options.values.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      ) : null}
      <SubmitButton
        className={clsx("btn-sm", tone === "ghost" && "btn-ghost", tone === "crimson" && "btn-crimson", tone === "teal" && "btn-teal")}
        pendingLabel="Working…"
      >
        {label}
      </SubmitButton>
      {state ? (
        <span role="status" className={clsx("text-xs font-semibold", state.ok ? "text-[#8fe3cc]" : "text-[#ff9d9d]")}>
          {state.ok ? state.message : state.error}
        </span>
      ) : null}
    </form>
  );
}
