import { Fragment, type ReactNode } from "react";
import { hyphenateLong } from "@/lib/text";

const MIN_LONG = 20;
// A break opportunity every two letters: browsers fill lines greedily, so extra opportunities
// don't add breaks; they only guarantee a hyphenated break fits even in a very narrow column
// (a 320px leaderboard row, audit 69 D1), where a 6-letter chunk could still be too wide.
const STEP = 2;

/**
 * Player-written titles and names with very long words. Each long word is its own inline block
 * (no wider than the line), so it moves to a fresh line whole rather than being hyphenated to fill
 * the end of the previous one; only a word wider than the whole line then wraps, at a soft hyphen
 * that shows "-" at the break. Short words render as plain text.
 */
export function LongWords({ text }: { text: string }): ReactNode {
  if (text.length < MIN_LONG) return text;
  const parts = text.split(/(\s+)/u);
  if (!parts.some((p) => hyphenateLong(p, MIN_LONG, STEP) !== p)) return text;
  return parts.map((p, i) => {
    const soft = hyphenateLong(p, MIN_LONG, STEP);
    return soft === p ? <Fragment key={i}>{p}</Fragment> : <span key={i} className="inline-block max-w-full">{soft}</span>;
  });
}
