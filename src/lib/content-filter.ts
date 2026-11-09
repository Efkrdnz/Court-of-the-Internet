/**
 * First-line automated screening for submissions. It is deliberately conservative:
 * it blocks things that are clearly against the rules (personal info, slurs, threats,
 * serious-crime content, spam) and leaves judgement calls to reports + moderators.
 */
import { skeleton } from "./confusables";

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
// Any script's digits (Arabic-Indic too), with the separators people use to dodge filters.
const PHONE = /(?:\+?\p{Nd}[\s()./_\-\u2013\u2014\u00b7]*){7,}\p{Nd}/u;
// Explicit URLs, or a domain with any two-letter country TLD or a common generic TLD.
const URL =
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:[a-z]{2}|com|net|org|info|biz|xyz|app|dev|online|site|shop|store|blog|live|link|club|fun|top|page|social|lol|wtf|tech|space|world|news)\b/i;
// A handle is "@name" not glued to a word on its left (that would be an email, checked first).
const HANDLE = /(?:^|[^\p{L}\p{N}_.%+-])@[\p{L}\p{N}_.]{3,}/u;
// Number + Capitalised Name(s) + street suffix, e.g. "42 Wallaby Way".
const STREET =
  /\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:[Ss]treet|St|[Aa]venue|Ave|[Rr]oad|Rd|[Bb]oulevard|Blvd|[Ll]ane|Ln|[Dd]rive|Dr|[Cc]ourt|Ct|[Ww]ay|[Pp]lace|Pl|[Tt]errace)\b\.?/;
// Lower-case addresses ("42 wallaby way"): one or two name words that aren't everyday filler,
// so "3 slices on the way" or "2 blocks down the road" stay fine.
const FILLER = "(?:the|a|an|my|his|her|our|their|your|down|up|on|to|of|in|at|by|from|for|and|all|way|whole|entire|long|other)";
const STREET_LOWER = new RegExp(
  `\\b\\d{1,5}\\s+(?!${FILLER}\\b)[a-z]+(?:\\s+(?!${FILLER}\\b)[a-z]+)?\\s+(?:street|avenue|road|boulevard|lane|drive|terrace|way)\\b`,
  "i",
);
const SSN = /\b\d{3}-\d{2}-\d{4}\b/;
// "bob [at] example [dot] com", "bob (at) example dot com".
const EMAIL_SPELLED =
  /\b[\w.+-]+\s*(?:[[({]\s*at\s*[\])}]|\sat\s)\s*[\w-]+\s*(?:[[({]\s*dot\s*[\])}]|\sdot\s)\s*[a-z]{2,}\b/i;
// "find him on insta as john_smith_1990": a platform name followed shortly by a handle-like token
// (letters mixed with digits, dots or underscores).
const PLATFORM_HANDLE =
  /\b(?:insta(?:gram)?|ig|tiktok|snap(?:chat)?|twitter|discord|telegram|whatsapp|facebook|fb|threads|bluesky|reddit|youtube|twitch|kik)\b.{0,25}?\b(?=[a-z0-9._]*[_\d.])(?=[a-z0-9._]*[a-z])[a-z0-9._]{4,}\b/i;
const NUMBER_WORDS: Record<string, string> = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };
/** A phone number spelled out ("five five five, eight six seven…"): 7+ digit words in a row. */
function spelledPhone(text: string): boolean {
  let run = 0;
  for (const w of text.toLowerCase().split(/[^a-z]+/).filter(Boolean)) {
    run = w in NUMBER_WORDS ? run + 1 : 0;
    if (run >= 7) return true;
  }
  return false;
}
/**
 * "r e t a r d", "r.e.t.a.r.d": runs of single letters, joined back together. Every contiguous
 * slice is returned, because a neighbouring "a" or "I" often joins the run ("a f a g…").
 */
function spacedOutWords(text: string): string[] {
  const out: string[] = [];
  for (const run of text.match(/\b(?:[a-z][\s.\-_*]+){3,}[a-z]\b/gi) ?? []) {
    const letters = run.replace(/[^a-z]/gi, "").toLowerCase().slice(0, 40);
    for (let i = 0; i < letters.length; i++) for (let j = i + 3; j <= letters.length; j++) out.push(letters.slice(i, j));
  }
  return out;
}

const VIOLENCE = [
  /\bkill\s+(?:your\s*self|urself|yourselves)\b/i,
  /\bkys\b/i,
  /\bi(?:'m| am)?\s*(?:going|gonna)\s+to?\s*(?:kill|hurt|stab|shoot|murder|beat up)\b/i,
  /\bi\s*(?:will|'ll)\s+(?:kill|hurt|stab|shoot|murder)\b/i,
  // Intent + harm + a person: "I want to kill my neighbour", "planning to poison his dog's owner".
  // Needs a human target, so "kill time", "could kill for a nap" and "mom will kill me" stay fine.
  /\b(?:want(?:ed|s)?|plan(?:ned|ning|s)?|intend(?:ed|s)?|going|gonna|about|tr(?:y|ying|ied)|decided|need)\s+to\s+(?:kill|murder|stab|shoot|poison|strangle|hurt|beat\s+up)\s+(?:my|his|her|their|our|your|him|them|someone|somebody|everyone|people|a\s+(?:man|woman|person|kid|child|cop|neighbou?r))\b/i,
  /\bi\s*(?:would|'d|could|should|might)\s+(?:kill|murder|stab|shoot|poison|strangle)\s+(?:my|his|her|their|him|them|someone|somebody|everyone)\b/i,
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

export function screenText(raw: string, { allowSpamCheck = true }: { allowSpamCheck?: boolean } = {}): FilterResult {
  const fail = (issue: FilterIssue): FilterResult => ({ ok: false, issue, message: MESSAGES[issue] });
  // Screen what a reader *sees*: full-width digits folded to ASCII, invisible characters dropped,
  // Cyrillic/Greek look-alikes folded to Latin. The spam heuristics still use the raw text.
  const text = skeleton(raw);

  if (EMAIL.test(text) || SSN.test(text) || STREET.test(text) || STREET_LOWER.test(text)) return fail("personal-info");
  if (PHONE.test(text) || EMAIL_SPELLED.test(text) || spelledPhone(text)) return fail("personal-info");
  // Links spelled out with spaces ("h t t p s : / /") are links too.
  if (URL.test(text) || /https?:\/\/|www\./i.test(text.replace(/\s+/g, ""))) return fail("link");
  if (HANDLE.test(text) || PLATFORM_HANDLE.test(text)) return fail("handle");

  for (const word of [...normaliseForWords(text), ...spacedOutWords(text)]) {
    if (SLURS.has(word)) return fail("hate");
    // Stretched spellings ("fooooo") are compared in collapsed form, but only when the word
    // actually has repeated letters, so ordinary words like "con" or "niger" never match.
    const collapsed = collapseRepeats(word);
    if (collapsed !== word && SLURS_COLLAPSED.has(collapsed)) return fail("hate");
  }
  if (VIOLENCE.some((re) => re.test(text))) return fail("violence");
  if (SERIOUS.some((re) => re.test(text))) return fail("serious-crime");
  if (allowSpamCheck && looksLikeSpam(raw)) return fail("spam");
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
