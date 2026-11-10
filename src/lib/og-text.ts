/**
 * Text for share (Open Graph) images, limited to what the vendored fonts can draw.
 *
 * The image renderer (next/og) fetches anything its fonts lack at render time: emoji from a CDN
 * (cdn.jsdelivr.net) and other scripts from Google Fonts. Offline, a failed emoji fetch crashed
 * the image outright (audit 42 D1); online, it was an undocumented third-party request. The
 * vendored fonts are Latin subsets, so OG text is kept to the characters at least one of them has
 * (the union of their character maps, measured from assets/og-fonts): accented letters fold to
 * their base letter ("ā" → "a"), emoji and symbols are dropped, and a field that would lose real
 * letters (Cyrillic, CJK…) is reported as such so the caller can show neutral text instead.
 */

// Union of the cmaps of assets/og-fonts/*.woff (control characters left out).
const DRAWABLE_RANGES: [number, number][] = [
  [0x20, 0x7e], [0xa0, 0xff], [0x102, 0x102], [0x131, 0x131], [0x152, 0x153], [0x2bb, 0x2bc], [0x2c6, 0x2c6],
  [0x2da, 0x2da], [0x2dc, 0x2dc], [0x2002, 0x2002], [0x2009, 0x2009], [0x2013, 0x2014], [0x2018, 0x201a],
  [0x201c, 0x201e], [0x2022, 0x2022], [0x2026, 0x2026], [0x2032, 0x2033], [0x2039, 0x203a], [0x2044, 0x2044],
  [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193], [0x2212, 0x2212],
];

export function ogDrawable(cp: number): boolean {
  return DRAWABLE_RANGES.some(([a, b]) => cp >= a && cp <= b);
}

const allDrawable = (s: string) => Array.from(s).every((ch) => ogDrawable(ch.codePointAt(0)!));
const graphemes = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

export interface OgText {
  text: string;
  /** Letters or digits had to be dropped (text in a script the fonts don't cover). */
  lostLetters: boolean;
}

export function ogText(input: string): OgText {
  let text = "";
  let lostLetters = false;
  const pieces = graphemes ? Array.from(graphemes.segment(input), (g) => g.segment) : Array.from(input);
  for (const piece of pieces) {
    const composed = piece.normalize("NFC");
    if (allDrawable(composed)) {
      text += composed;
      continue;
    }
    // Fold compatibility forms and accents: "ā" → "a", "ﬁ" → "fi", full-width "Ａ" → "A".
    const folded = piece.normalize("NFKD").replace(/\p{M}/gu, "");
    if (folded && allDrawable(folded)) {
      text += folded;
      continue;
    }
    if (LETTER_OR_DIGIT.test(piece)) lostLetters = true;
    // Emoji, symbols and pictographs are dropped; whitespace keeps words apart.
    if (/\s/u.test(piece)) text += " ";
  }
  return { text: text.replace(/\s+/g, " ").trim(), lostLetters };
}

/** `value` made drawable, or `fallback` when that would drop letters or leave nothing readable. */
export function ogTextOr(value: string, fallback: string): string {
  const { text, lostLetters } = ogText(value);
  return lostLetters || !LETTER_OR_DIGIT.test(text) ? fallback : text;
}
