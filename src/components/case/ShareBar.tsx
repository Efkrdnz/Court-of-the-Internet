"use client";

import { useSyncExternalStore } from "react";
import { CopyButton } from "@/components/ui/CopyButton";
import { IconCopy, IconDownload, IconShare } from "@/components/art/props";

const noopSubscribe = () => () => {};

export function ShareBar({ url, summary, title, cardHref, closed = true }: { url: string; summary: string; title: string; cardHref: string; closed?: boolean }) {
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
  const enc = encodeURIComponent;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CopyButton text={url} label="Copy link" copiedLabel="Link copied!" icon={<IconCopy className="h-4 w-4" />} />
      <CopyButton text={summary} label={closed ? "Copy verdict summary" : "Copy case summary"} copiedLabel="Summary copied!" icon={<IconCopy className="h-4 w-4" />} />
      <a href={cardHref} download={`${title.slice(0, 40).replace(/[^a-z0-9]+/gi, "-")}-verdict.png`} className="btn btn-ghost btn-sm">
        <IconDownload className="h-4 w-4" /> Share card
      </a>
      {canShare ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.share({ title, text: summary, url }).catch(() => undefined)}>
          <IconShare className="h-4 w-4" /> Share…
        </button>
      ) : null}
      <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href={`https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`}>
        Reddit
      </a>
      <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href={`https://x.com/intent/post?text=${enc(summary)}`}>
        X / Twitter
      </a>
    </div>
  );
}
