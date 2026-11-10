"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { claimAction } from "@/app/actions/cases";
import { claimRandomAction } from "@/app/actions/queue";
import { Spinner } from "@/components/ui/SubmitButton";
import { useFreshAfterBack } from "@/components/ui/useFreshAfterBack";
import { callAction } from "@/components/ui/callAction";

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
  // Back from the editor must not show this case as still open.
  const { markActed, clearActed } = useFreshAfterBack(`claim-${caseId}`);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={!!disabledReason || pending}
        title={disabledReason}
        onClick={() =>
          start(async () => {
            setError(null);
            markActed();
            const result = await callAction(() => claimAction(caseId, role));
            if (result && !result.ok) {
              clearActed();
              setError(result.error);
            }
          })
        }
        className={clsx("btn h-auto w-full whitespace-normal py-2.5 text-center leading-snug", role === "DEFENSE" ? "btn-teal" : "btn-crimson", className)}
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
  const { markActed, clearActed } = useFreshAfterBack(`assign-${role}`);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="btn btn-lg"
        onClick={() =>
          start(async () => {
            setError(null);
            markActed();
            const result = await callAction(() => claimRandomAction(role));
            if (result && !result.ok) {
              clearActed();
              setError(result.error);
            }
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
