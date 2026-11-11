import { Fragment, type ReactNode } from "react";
import { hyphenateLong } from "@/lib/text";

const MIN_LONG = 20;

/**
 * Player-written titles and names with very long words. Each long word is its own inline block
 * (no wider than the line), so it moves to a fresh line whole rather than being hyphenated to fill
 * the end of the previous one; only a word wider than the whole line then wraps, at a soft hyphen
 * that shows "-" at the break. Short words render as plain text.
 */
export function LongWords({ text }: { text: string }): ReactNode {
  if (text.length < MIN_LONG) return text;
  const parts = text.split(/(\s+)/u);
  if (!parts.some((p) => hyphenateLong(p, MIN_LONG) !== p)) return text;
  return parts.map((p, i) => {
    const soft = hyphenateLong(p, MIN_LONG);
    return soft === p ? <Fragment key={i}>{p}</Fragment> : <span key={i} className="inline-block max-w-full">{soft}</span>;
  });
}
