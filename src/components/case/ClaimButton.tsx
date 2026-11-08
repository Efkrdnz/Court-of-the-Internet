"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { claimAction } from "@/app/actions/cases";
import { claimRandomAction } from "@/app/actions/queue";
import { Spinner } from "@/components/ui/SubmitButton";

export function ClaimButton({
  caseId,
  role,
  disabledReason,
  className,
  label,
}: {
  caseId: string;
  role: "DEFENSE" | "PROSECUTION";
  disabledReason?: string;
  className?: string;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const text = label ?? (role === "DEFENSE" ? "Take this case" : "Prosecute this case");
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={!!disabledReason || pending}
        title={disabledReason}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await claimAction(caseId, role);
            if (result && !result.ok) setError(result.error);
          })
        }
        className={clsx("btn w-full", role === "DEFENSE" ? "btn-teal" : "btn-crimson", className)}
      >
        {pending ? <Spinner /> : null}
        {pending ? "Filing the paperwork…" : disabledReason ?? text}
      </button>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-crimson">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AssignMeButton({ role }: { role: "DEFENSE" | "PROSECUTION" }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="btn btn-lg"
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await claimRandomAction(role);
            if (result && !result.ok) setError(result.error);
          })
        }
      >
        {pending ? <Spinner /> : null}
        {pending ? "Rummaging through the docket…" : "Assign me a random case"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-[#ffb3b3]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
