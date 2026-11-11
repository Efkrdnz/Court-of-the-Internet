/**
 * Look-alike letters that render (nearly) identically to Latin ones. Used to see through
 * spoofing: "Judge Wіgsworth" with a Cyrillic і, or a slur with a Cyrillic е.
 */
const LETTERS: Record<string, string> = {
  а: "a", в: "b", е: "e", ё: "e", з: "3", і: "i", ї: "i", ј: "j", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x", ѕ: "s", ԁ: "d", ӏ: "l", ɡ: "g",
  // Small capitals ("ꜰᴀɢ…").
  ᴀ: "a", ʙ: "b", ᴄ: "c", ᴅ: "d", ᴇ: "e", ꜰ: "f", ɢ: "g", ʜ: "h", ɪ: "i", ᴊ: "j", ᴋ: "k", ʟ: "l", ᴍ: "m", ɴ: "n", ᴏ: "o", ᴘ: "p", ʀ: "r", ꜱ: "s", ᴛ: "t", ᴜ: "u", ᴠ: "v", ᴡ: "w", ʏ: "y", ᴢ: "z",
  ı: "i", ɾ: "r", ɹ: "r", ǝ: "e", ə: "e", đ: "d", ħ: "h", ł: "l", ø: "o", ß: "ss",
  α: "a", β: "b", ε: "e", η: "n", ι: "i", κ: "k", μ: "m", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x",
};

/** Invisible characters with no business in a confession (soft hyphen, zero-width, bidi, word joiners…). */
// (U+200D, the zero-width joiner, is handled separately: it is invisible on its own but holds emoji
// sequences like a family emoji together.)
export const INVISIBLE = /[­͏؜ᅟᅠ឴឵᠋-᠏​‌‎‏‪-‮⁠-⁯ㅤ﻿ﾠ]/g;
/** Joiners that aren't between two emoji (i.e. that only serve to hide or split text). */
// (After a skin tone too: "🤷🏽‍♀️" and "🧑🏽‍🚀" join through it, audit 58 D3.)
export const STRAY_ZWJ = /(?<!\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?)‍|‍(?!\p{Extended_Pictographic})/gu;

/** Compatibility folding (full-width digits → ASCII), invisibles dropped, look-alikes folded (case kept). */
export function skeleton(input: string): string {
  return [...input.normalize("NFKC").replace(INVISIBLE, "").replace(/\u200D/g, "")]
    .map((ch) => {
      // Regional-indicator letters (🇷🇪🇹…) read as plain letters.
      const cp = ch.codePointAt(0)!;
      if (cp >= 0x1f1e6 && cp <= 0x1f1ff) return String.fromCharCode(0x61 + cp - 0x1f1e6);
      const lower = ch.toLowerCase();
      const latin = LETTERS[lower];
      return latin ? (lower === ch ? latin : latin.toUpperCase()) : ch;
    })
    .join("");
}
