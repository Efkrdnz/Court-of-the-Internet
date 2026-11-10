import type { CSSProperties } from "react";

/**
 * Headings that shrink so their longest word fits on one line (audit 42 D3: a 32-character name
 * of 16-letter words broke mid-word in "The People v. …" and the profile heading at 320px).
 *
 * The parent gets `@container`; the heading's font size is
 *   max(min-size, min(its normal size, container width ÷ longest word's width in em)).
 * Words of letters set in a script written with spaces are measured; CJK, Thai and emoji may
 * break between characters anyway, so they end a "word". Below the minimum size a pathological
 * word (sixteen W's) still wraps mid-word rather than overflowing.
 */

const BREAKABLE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Extended_Pictographic}]/u;

/** Rough width in em of the widest word, for the bold display face (wide capitals count more). */
export function longestWordEm(text: string): number {
  let longest = 0;
  let em = 0;
  for (const ch of text) {
    if (/\s/u.test(ch) || BREAKABLE.test(ch)) {
      em = 0;
      continue;
    }
    em += /[WM@%]/.test(ch) ? 1.02 : /m/.test(ch) ? 0.95 : /w/.test(ch) ? 0.82 : /[A-Z0-9]/.test(ch) ? 0.72 : /[iljtf.,'’!:;|]/.test(ch) ? 0.32 : 0.58;
    if (em > longest) longest = em;
  }
  return longest;
}

/** Inline style for a fitted heading; pair with `FIT_FONT` and an `@container` parent. */
export function fitStyle(text: string): CSSProperties {
  // 10% slack for the estimate and italic overhang.
  const em = Math.max(1, longestWordEm(text) * 1.1);
  return { ["--fit-word" as string]: `calc(100cqi / ${em.toFixed(2)})` };
}

/**
 * Font size for a fitted heading (a literal, so Tailwind generates it): the heading's usual size
 * goes in `--fit-max` (e.g. `[--fit-max:2.25rem] sm:[--fit-max:3rem]`); it never goes below
 * `--fit-min` (1rem unless set: names, a single line, may go down to 0.75rem).
 */
export const FIT_FONT = "[font-size:max(var(--fit-min,1rem),min(var(--fit-max),var(--fit-word)))]";
