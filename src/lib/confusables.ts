/**
 * Look-alike letters that render (nearly) identically to Latin ones. Used to see through
 * spoofing: "Judge Wіgsworth" with a Cyrillic і, or a slur with a Cyrillic е.
 */
const LETTERS: Record<string, string> = {
  а: "a", в: "b", е: "e", ё: "e", з: "3", і: "i", ї: "i", ј: "j", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x", ѕ: "s", ԁ: "d", ӏ: "l", ɡ: "g",
  α: "a", β: "b", ε: "e", η: "n", ι: "i", κ: "k", μ: "m", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x",
};

/** Invisible characters with no business in a confession (soft hyphen, zero-width, bidi, word joiners…). */
export const INVISIBLE = /[­͏؜ᅟᅠ឴឵᠋-᠏​-‏‪-‮⁠-⁯ㅤ﻿ﾠ]/g;

/** Compatibility folding (full-width digits → ASCII), invisibles dropped, look-alikes folded (case kept). */
export function skeleton(input: string): string {
  return [...input.normalize("NFKC").replace(INVISIBLE, "")]
    .map((ch) => {
      const lower = ch.toLowerCase();
      const latin = LETTERS[lower];
      return latin ? (lower === ch ? latin : latin.toUpperCase()) : ch;
    })
    .join("");
}
