"use client";

import { useEffect } from "react";
import Link from "next/link";
import { JudgeOwl } from "@/components/art/characters";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:px-6">
      <JudgeOwl mood="shocked" className="chr-sticker w-56" />
      <p className="eyebrow mt-6">Mistrial</p>
      <h1 className="mt-2 font-display text-4xl font-black text-parchment">The court has fallen into disarray.</h1>
      <p className="mt-3 text-parchment/75">Something went wrong on our end. The stenographer has been revived and is ready to try again.</p>
      {error.digest ? <p className="mt-2 font-type text-xs text-parchment/50">Reference: {error.digest}</p> : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn">
          Retry the case
        </button>
        <Link href="/" className="btn btn-ghost">
          Back to the lobby
        </Link>
      </div>
    </div>
  );
}
