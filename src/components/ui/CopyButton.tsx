"use client";

import { useState } from "react";
import clsx from "clsx";

export function CopyButton({
  text,
  label,
  copiedLabel = "Copied to clipboard!",
  className,
  icon,
}: {
  text: string;
  label: string;
  copiedLabel?: string;
  className?: string;
  icon?: React.ReactNode;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // Fallback for insecure contexts.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      setState(ok ? "copied" : "failed");
    }
    setTimeout(() => setState("idle"), 2200);
  }
  return (
    <button type="button" onClick={copy} className={clsx("btn btn-ghost btn-sm", className)} aria-live="polite">
      {icon}
      <span>{state === "copied" ? copiedLabel : state === "failed" ? "Copy failed" : label}</span>
    </button>
  );
}
