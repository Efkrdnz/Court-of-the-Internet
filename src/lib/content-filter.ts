/**
 * First-line automated screening for submissions. It is deliberately conservative:
 * it blocks things that are clearly against the rules (personal info, slurs, threats,
 * serious-crime content, spam) and leaves judgement calls to reports + moderators.
 */

export type FilterIssue =
  | "personal-info"
  | "link"
  | "handle"
  | "hate"
  | "violence"
  | "serious-crime"
  | "spam";

export interface FilterResult {
  ok: boolean;
  issue?: FilterIssue;
  message?: string;
}

const MESSAGES: Record<FilterIssue, string> = {
  "personal-info":
    "Objection! That looks like personal information (an email, phone number or address). Keep everyone anonymous.",
  link: "Links are inadmissible evidence. Please describe the crime in your own words.",
  handle: "Usernames and @handles aren't allowed. This court protects the identities of the petty.",
  hate: "The court does not tolerate slurs or hateful language. Rephrase and try again.",
  violence: "Threats or encouragement of violence are out of order. This court only hears petty crimes.",
  "serious-crime":
    "This court only hears ridiculous, harmless offenses. Serious real-world crimes belong with real authorities.",
  spam: "That reads like spam (repeated characters, all-caps, or copy-paste). Tidy it up, counselor.",
};

// ROT13-encoded so the source isn't a wall of slurs. Matched on whole (normalised) words.
const ENCODED_SLURS =
  "avttre,avttn,snttbg,snt,xvxr,fcvp,puvax,tbbx,jrgonpx,genaal,ergneq,pbba,qlxr,enturnq,gbjryurnq,ornare,cnxv,fnaqavttre,xlxr,tbyyvjbt";

function rot13(s: string): string {
  return s.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));
}

const SLURS = new Set(ENCODED_SLURS.split(",").map(rot13));

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

function normaliseForWords(text: string): string[] {
  const lowered = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[013457@$!]/g, (c) => LEET[c] ?? c);
  return lowered.split(/[^a-z]+/).filter(Boolean);
}

function collapseRepeats(word: string): string {
  return word.replace(/(.)\1+/g, "$1");
}

const SLURS_COLLAPSED = new Set(Array.from(SLURS).map(collapseRepeats));

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// 7+ digits possibly separated by spaces, dots, dashes, parentheses: phone-ish.
const PHONE = /(?:\+?\d[\s().-]*){7,}\d/;
const URL = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:com|net|org|io|gg|tv|co|me|ly|xyz|app|dev|info|biz|us|uk|ca)\b/i;
const HANDLE = /(?:^|[\s(])@[A-Za-z0-9_.]{3,}/;
// Number + Capitalised Name(s) + street suffix, e.g. "42 Wallaby Way".
const STREET =
  /\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:[Ss]treet|St|[Aa]venue|Ave|[Rr]oad|Rd|[Bb]oulevard|Blvd|[Ll]ane|Ln|[Dd]rive|Dr|[Cc]ourt|Ct|[Ww]ay|[Pp]lace|Pl|[Tt]errace)\b\.?/;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/;

const VIOLENCE = [
  /\bkill\s+(?:your\s*self|urself|yourselves)\b/i,
  /\bkys\b/i,
  /\bi(?:'m| am)?\s*(?:going|gonna)\s+to?\s*(?:kill|hurt|stab|shoot|murder|beat up)\b/i,
  /\bi\s*(?:will|'ll)\s+(?:kill|hurt|stab|shoot|murder)\b/i,
  /\bshoot\s+up\b/i,
  /\b(?:make|build|plant)\s+a\s+bomb\b/i,
  /\bswat(?:ting)?\s+(?:him|her|them|someone)\b/i,
];

const SERIOUS = [
  /\brap(?:e|ed|ing|ist)\b/i,
  /\bmolest/i,
  /\bpaedo|\bpedo(?:phile)?s?\b/i,
  /\bchild\s+(?:porn|abuse|exploitation)\b/i,
  /\bunderage\b/i,
  /\btraffick/i,
  /\b(?:commit(?:ted|ting)?|attempt(?:ed)?)\s+suicide\b/i,
  /\bself[-\s]?harm\b/i,
  /\bheroin\b|\bmeth(?:amphetamine)?\b|\bfentanyl\b/i,
  /\bmurder(?:ed)?\s+(?:a|my|the|someone|somebody)\b/i,
];

const LONG_WORD = /[^\s]{36,}/;

function looksLikeSpam(text: string): boolean {
  if (/(.)\1{9,}/.test(text)) return true; // aaaaaaaaaa
  if (LONG_WORD.test(text)) return true; // a 36+ character "word" is keyboard-mash, not a crime
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 30) {
    const upper = letters.replace(/[^A-Z]/g, "").length;
    if (upper / letters.length > 0.75) return true;
  }
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 8) {
    const counts = new Map<string, number>();
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
    const max = Math.max(...counts.values());
    if (max / words.length > 0.5) return true;
  }
  return false;
}

export function screenText(text: string, { allowSpamCheck = true }: { allowSpamCheck?: boolean } = {}): FilterResult {
  const fail = (issue: FilterIssue): FilterResult => ({ ok: false, issue, message: MESSAGES[issue] });

  if (EMAIL.test(text) || SSN.test(text) || STREET.test(text)) return fail("personal-info");
  if (PHONE.test(text)) return fail("personal-info");
  if (URL.test(text)) return fail("link");
  if (HANDLE.test(text)) return fail("handle");

  for (const word of normaliseForWords(text)) {
    if (SLURS.has(word)) return fail("hate");
    // Stretched spellings ("fooooo") are compared in collapsed form, but only when the word
    // actually has repeated letters, so ordinary words like "con" or "niger" never match.
    const collapsed = collapseRepeats(word);
    if (collapsed !== word && SLURS_COLLAPSED.has(collapsed)) return fail("hate");
  }
  if (VIOLENCE.some((re) => re.test(text))) return fail("violence");
  if (SERIOUS.some((re) => re.test(text))) return fail("serious-crime");
  if (allowSpamCheck && looksLikeSpam(text)) return fail("spam");
  return { ok: true };
}

/** Screens several fields; returns the first failure with the field name. */
export function screenFields(fields: Record<string, string | undefined | null>): (FilterResult & { field?: string }) {
  for (const [field, value] of Object.entries(fields)) {
    if (!value) continue;
    // Titles skip the caps/repetition heuristics but still may not contain giant unbroken words.
    const result: FilterResult =
      field === "title" && LONG_WORD.test(value) ? { ok: false, issue: "spam", message: MESSAGES.spam } : screenText(value, { allowSpamCheck: field !== "title" });
    if (!result.ok) return { ...result, field };
  }
  return { ok: true };
}

/** Rough similarity for duplicate detection: Jaccard over word trigrams. */
export function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const words = s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
    const set = new Set<string>();
    for (let i = 0; i < words.length - 2; i++) set.add(words.slice(i, i + 3).join(" "));
    if (set.size === 0) words.forEach((w) => set.add(w));
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}
