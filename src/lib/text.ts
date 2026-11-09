import { INVISIBLE, STRAY_ZWJ } from "./confusables";

/**
 * Normalises user-submitted text before validation and storage.
 * React escapes on output, so this is about hygiene, not HTML sanitisation:
 * it strips invisible/control characters and tames whitespace abuse.
 */
export function normalizeText(input: string, { multiline = true }: { multiline?: boolean } = {}): string {
  let s = input.normalize("NFC");
  // Invisible characters: zero-width, bidi controls, soft hyphens, fillers (spoofing / filter evasion).
  s = s.replace(INVISIBLE, "").replace(STRAY_ZWJ, "");
  // "Zalgo" text: at most two combining marks per character (real languages rarely need more).
  s = s.replace(/(\p{M}{2})\p{M}+/gu, "$1");
  // ASCII control chars except tab/newline.
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  s = s.replace(/\r\n?/g, "\n").replace(/\t/g, " ");
  if (!multiline) s = s.replace(/\n+/g, " ");
  s = s.replace(/[  ]{2,}/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
  return s.trim();
}

const graphemes = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

/**
 * Character count as readers perceive it: grapheme clusters, so "é" plus fifteen stacked accents
 * is one character, not sixteen (which used to slip short titles past the minimum).
 */
export function charCount(s: string): number {
  const visible = graphemes ? Array.from(graphemes.segment(s)).length : Array.from(s.replace(/\p{M}/gu, "")).length;
  // …but a chain of emoji glued with zero-width joiners is also a single grapheme, so long chains
  // count by code points too (halved, so an ordinary emoji still counts as 1–3).
  return Math.max(visible, Math.ceil(Array.from(s).length / 2));
}

export function slugify(input: string, maxLength = 60): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug || "case";
}

export function formatCaseNumber(n: number): string {
  return n.toString().padStart(4, "0");
}

export function casePath(c: { number: number; slug: string }): string {
  return `/cases/${c.number}-${c.slug}`;
}

/** Parses "42-some-slug" or "42" into 42. */
export function parseCaseParam(param: string): number | null {
  const match = /^(\d{1,9})(?:-|$)/.exec(param);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

/** Search/lookup text from a URL: control characters (NUL breaks Postgres) and invisibles removed, trimmed, capped. */
export function cleanQuery(value: unknown, max = 80): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, "").replace(INVISIBLE, "").trim().slice(0, max);
}

/** A 1-based page number from a URL, clamped so it can't overflow a query's OFFSET. */
export function pageParam(value: unknown, max = 10_000): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : 1;
}
