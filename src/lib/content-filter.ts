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
/** Specific message for the 36+ character word rule, which isn't about repetition or caps. */
const LONG_WORD_MESSAGE = "Words longer than 35 characters aren't allowed (it stops keyboard-mash from breaking layouts). Add a space or hyphen.";

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
// 9+ digits: real numbers (with area code) are caught, while years ("2019-2020"), scores and
// counting ("1 2 3 4 5 6 7 8") are not. Bare 7-digit local numbers are a known gap (see README).
const PHONE = /(?:\+?\p{Nd}[\s()./_,\-\u2013\u2014\u00b7]*){8,}\p{Nd}/u;
// Explicit URLs, or a domain with any two-letter country TLD or a common generic TLD.
const URL =
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:[a-z]{2}|com|net|org|info|biz|xyz|app|dev|online|site|shop|store|blog|live|link|club|fun|top|page|social|lol|wtf|tech|space|world|news|ninja|pro|art|design|email|cloud|digital|games|life|today|website|wiki|zone|rocks|fyi|guru|agency|studio|media|online|network|systems|works|party|club|vip|bet|win|click|icu|buzz|monster|quest|homes|lgbt|gay|sex|porn|adult)\b/i;
// A handle is "@name" not glued to a word on its left (that would be an email, checked first).
const HANDLE = /(?:^|[^\p{L}\p{N}_.%+-])@[\p{L}\p{N}_.]{3,}/u;
// Number + Capitalised Name(s) + street suffix, e.g. "42 Wallaby Way".
const STREET =
  /\b\d{1,5}[A-Za-z]?\s+(?:[A-Z][a-z]+\s){1,3}(?:[Ss]treet|St|[Aa]venue|Ave|[Rr]oad|Rd|[Bb]oulevard|Blvd|[Ll]ane|Ln|[Dd]rive|Dr|[Cc]ourt|Ct|[Ww]ay|[Pp]lace|Pl|[Tt]errace)\b\.?/;
// Lower-case addresses ("42 wallaby way"): one or two name words that aren't everyday filler,
// so "3 slices on the way" or "2 blocks down the road" stay fine.
const FILLER = "(?:the|a|an|my|his|her|our|their|your|down|up|on|to|of|in|at|by|from|for|and|all|way|whole|entire|long|other)";
// Spelled-out house numbers: "seven forty two evergreen terrace".
const NUM_WORD = "(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)";
const STREET_SPELLED = new RegExp(
  `\\b${NUM_WORD}(?:[\\s-]+${NUM_WORD})*\\s+(?!${"(?:the|a|an|my|his|her|our|their|your|down|up|on|to|of|in|at|by|from|for|and|all|way|whole|entire|long|other|blocks?|miles?|minutes?|hours?|days?|times?|steps?)"}\\b)[a-z]+(?:\\s+[a-z]+)?\\s+(?:street|avenue|road|boulevard|lane|drive|terrace|way)\\b`,
  "i",
);
const STREET_LOWER = new RegExp(
  `\\b\\d{1,5}\\s+(?!${FILLER}\\b)[a-z]+(?:\\s+(?!${FILLER}\\b)[a-z]+)?\\s+(?:street|avenue|road|boulevard|lane|drive|terrace|way)\\b`,
  "i",
);
const SSN = /\b\d{3}-\d{2}-\d{4}\b/;
// "bob [at] example [dot] com", "bob (at) example dot com".
// "court-of-pettiness dot com"
const DOMAIN_SPELLED = /\b[a-z0-9-]{2,}\s*(?:[[({]\s*dot\s*[\])}]|\sdot\s)\s*(?:com|net|org|io|co|uk|de|ru|me|tv|gg|xyz|app|dev|info)\b/i;
const EMAIL_SPELLED =
  /\b[\w.+-]+\s*(?:[[({]\s*at\s*[\])}]|\sat\s)\s*[\w-]+\s*(?:[[({]\s*dot\s*[\])}]|\sdot\s)\s*[a-z]{2,}\b/i;
// "find him on insta as john_smith_1990": a platform name followed shortly by a handle-like token
// (letters mixed with digits, dots or underscores).
// "on ig: coolguy", "insta @coolguy": a platform name with a colon or @ right before a name.
const PLATFORM_COLON = /\b(?:insta(?:gram)?|ig|tiktok|snap(?:chat)?|twitter|discord|telegram|whatsapp|facebook|fb|threads|bluesky|reddit|youtube|twitch|kik)\s*[:@]\s*@?[a-z0-9._]{3,}/i;
const PLATFORM_HANDLE =
  /\b(?:insta(?:gram)?|ig|tiktok|snap(?:chat)?|twitter|discord|telegram|whatsapp|facebook|fb|threads|bluesky|reddit|youtube|twitch|kik)\b.{0,25}?\b(?=[a-z0-9._]*[_\d.])(?=[a-z0-9._]*[a-z])[a-z0-9._]{4,}\b/i;
const NUMBER_WORDS: Record<string, string> = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };
/** A phone number spelled out ("five five five, eight six seven…"): 7+ digit words in a row. */
function spelledPhone(text: string): boolean {
  let run = 0;
  for (const w of text.toLowerCase().split(/[^a-z]+/).filter(Boolean)) {
    run = w in NUMBER_WORDS ? run + 1 : 0;
    if (run >= 9) return true;
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
  // "I'm going to kill", "im gonna kill", "gonna kill my roommate" (the old pattern demanded a "t" after "gonna").
  /\b(?:i(?:'m|m| am)?\s*)?(?:going\s+to|gonna)\s+(?:kill|hurt|stab|shoot|murder|beat\s+up)\s+(?:my|his|her|their|your|him|them|you|someone|somebody|everyone)\b/i,
  /\bi(?:'m|m| am)?\s*(?:going\s+to|gonna)\s+(?:kill|hurt|stab|shoot|murder|beat\s+up)\b/i,
  /\bi\s*(?:will|'ll)\s+(?:kill|hurt|stab|shoot|murder|unalive)\b/i,
  // "I will end my neighbour", "gonna unalive my flatmate".
  // ("end"/"off" need a person after them: "end my streak" is fine.)
  /\b(?:i\s*(?:will|'ll|would|'d)|gonna|going\s+to|want\s+to)\s+(?:end|unalive|off)\s+(?:him|them|someone|somebody|everyone|(?:my|his|her|their)\s+(?:\w+\s+)?(?:neighbou?r|roommate|room-mate|flatmate|coworker|co-worker|colleague|boss|friend|brother|sister|mom|mum|dad|wife|husband|partner|boyfriend|girlfriend|landlord|ex|teacher))\b/i,
  // Intent + harm + a person: "I want to kill my neighbour", "planning to poison his dog's owner".
  // Needs a human target, so "kill time", "could kill for a nap" and "mom will kill me" stay fine.
  /\b(?:want(?:ed|s)?|plan(?:ned|ning|s)?|intend(?:ed|s)?|going|gonna|about|tr(?:y|ying|ied)|decided|need)\s+to\s+(?:kill|murder|stab|shoot|poison|strangle|hurt|beat\s+up)\s+(?:my|his|her|their|our|your|him|them|someone|somebody|everyone|people|a\s+(?:man|woman|person|kid|child|cop|neighbou?r))\b/i,
  /\bi\s*(?:would|'d|could|should|might)\s+(?:kill|murder|stab|shoot|poison|strangle)\s+(?:my|his|her|their|him|them|someone|somebody|everyone)\b/i,
  /\bshoot\s+up\b/i,
  /\b(?:make|build|plant)\s+a\s+bomb\b/i,
  /\bswat(?:ting)?\s+(?:him|her|them|someone)\b/i,
];

// A person (or pet) on the receiving end, for the past-tense harm patterns below. Objects stay
// fine: "I killed it at karaoke", "I shot a video", "I stabbed the pizza box".
const VICTIM =
  "(?:him|her|them|someone|somebody|(?:my|his|her|their|our|a|an|the|this|that|some)\\s+(?:\\w+\\s+)?(?:neighbou?r|roommate|room-mate|flatmate|coworker|co-worker|colleague|boss|manager|friend|brother|sister|mom|mum|mother|dad|father|wife|husband|partner|boyfriend|girlfriend|kid|kids|child|children|son|daughter|teacher|student|cop|officer|man|woman|guy|girl|boy|person|people|baby|grandma|grandpa|cat|dog|puppy|kitten|landlord|ex))";
const HARM_DONE = new RegExp(`\\bi\\s+(?:stabbed|shot|killed|murdered|poisoned|strangled|assaulted|beat\\s+up|drugged|kidnapped|ran\\s+over)\\s+${VICTIM}\\b`, "i");

const SERIOUS = [
  HARM_DONE,
  // Dosing someone's food or drink, or spiking it.
  /\b(?:laxatives?|ex-?lax|dulcolax|senna|eye\s*drops|sleeping\s+pills|xanax|molly)\b.{0,40}\b(?:coffee|drink|food|lunch|water|tea|meal|soup|smoothie|cup|bottle|punch)\b/i,
  /\bspiked\b.{0,40}\b(?:with|using)\s+(?:\w+\s+)?(?:vodka|alcohol|booze|rum|gin|tequila|drugs|pills|molly|xanax|laxatives?)\b/i,
  // Burning or vandalising someone else's things.
  /\bset\s+(?:my|his|her|their|the|our)\s+[\w-]+(?:'s|s')\s+(?:\w+\s+)?\w+\s+on\s+fire\b|\bset\s+fire\s+to\s+(?:my|his|her|their)\s+[\w-]+(?:'s|s')\b/i,
  /\bkeyed\s+(?:a|someone'?s|somebody'?s|his|her|their|(?:my|our)\s+[\w-]+(?:'s|s'))\s+(?:\w+\s+)?(?:car|truck|van|motorcycle)\b/i,
  // Poisoning food or drink with something dangerous.
  /\b(?:bleach|antifreeze|rat\s+poison|drain\s+cleaner|roofies?)\b.{0,50}\b(?:coffee|drink|food|lunch|water|tea|meal|soup|smoothie|cup|bottle|machine)\b/i,
  /\b(?:coffee|drink|food|lunch|water|tea|meal|soup|smoothie|cup|bottle|machine)\b.{0,50}\b(?:bleach|antifreeze|rat\s+poison|drain\s+cleaner|roofies?)\b/i,
  // Breaking into someone's accounts or devices.
  /\bhacked\s+(?:into\s+)?(?:my|his|her|their|someone'?s|somebody'?s|a)\s+(?:[\w-]+(?:'s|s')\s+)?(?:email|e-mail|account|accounts|phone|instagram|facebook|bank|computer|laptop|icloud|wifi)\b/i,
  // Theft of vehicles, robbery, arson.
  /\bi\s+(?:stole|hot-?wired|jacked|carjacked)\s+(?:a|an|someone'?s|somebody'?s|his|her|their|the\s+neighbou?r'?s)\s+(?:\w+\s+)?(?:car|truck|van|motorcycle|motorbike|scooter|bike)\b/i,
  /\b(?:robbed|held\s+up|stuck\s+up)\s+(?:a|the|an)\s+(?:\w+\s+)?(?:bank|store|shop|gas\s+station|liquor\s+store|pharmacy|house|home|person|man|woman)\b|\bbank\s+robbery\b/i,
  /\barson\b|\bburn(?:ed|t)\s+down\s+(?:a|the|my|his|her|their|our)\b|\bset\s+fire\s+to\s+(?:a|the|my|his|her|their|our)\s+(?:\w+\s+)?(?:house|home|car|building|school|shop|store|apartment|flat|office|garage)\b/i,
  // Domestic violence (siblings' pillow fights stay petty).
  /\bi\s+(?:hit|punched|slapped|kicked|choked|beat)\s+(?:my|his|her)\s+(?:wife|husband|girlfriend|boyfriend|partner|kid|kids|child|children|son|daughter|baby|mom|mum|mother|dad|father|grandma|grandpa)\b/i,
  // Drink- or drug-driving.
  /\b(?:drove|driving|drive)\s+(?:home\s+|there\s+|back\s+)?(?:drunk|wasted|hammered|high|blackout)\b|\bdrunk[\s-]driving\b|\bDUI\b/i,
  // Anything sold to minors.
  /\b(?:sold|sell|selling|gave|supplied)\s+(?:\w+\s+){0,3}(?:weed|cannabis|marijuana|pot|vapes?|alcohol|booze|pills|drugs)\s+to\s+(?:\w+\s+)?(?:kids|children|minors|teens|teenagers|students|underage|high[\s-]?schoolers|middle[\s-]?schoolers|freshmen)\b/i,
  // Dealing hard drugs.
  /\b(?:sold|sell|selling|dealt|deal|dealing|supplied)\s+(?:\w+\s+){0,2}(?:cocaine|coke|heroin|meth|fentanyl|crack|mdma|ecstasy|hard\s+drugs|drugs)\b/i,
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

  // Variants a reader decodes without thinking: "evil[.]com", "evil.c0m", "555-123-45six7",
  // "k i l l". Each is checked by the same patterns as the plain text.
  const undotted = text
    .replace(/[\u3002\uFF0E\uFF61]/g, ".") // ideographic / fullwidth full stops
    .replace(/\s*[[({]\s*(?:\.|dot)\s*[\])}]\s*/gi, ".")
    .replace(/\s+\.\s+(?=(?:com|net|org|io|co|uk|de|ru|me|tv|gg|xyz|app|dev|info|ninja)\b)/gi, ".");
  const leet = undotted.replace(/[013457@$!]/g, (c) => LEET[c] ?? c);
  const numbered = text.replace(/(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)/gi, (w) => NUMBER_WORDS[w.toLowerCase()] ?? w);
  const joined = text.replace(/\b(?:[a-z][\s.\-_*]+){3,}[a-z]\b/gi, (run) => run.replace(/[^a-z]/gi, ""));
  if (EMAIL.test(undotted) || EMAIL.test(text) || SSN.test(text) || STREET.test(text) || STREET_LOWER.test(text) || STREET_SPELLED.test(text)) return fail("personal-info");
  // "j o h n @ g m a i l . c o m", "e v i l . c o m": runs of single characters, squashed back together.
  const spacedRuns = (text.match(/(?:\S\s+){5,}\S/g) ?? []).map((run) => run.replace(/\s+/g, ""));
  const spacedEmail = spacedRuns.some((run) => EMAIL.test(run));
  if (spacedRuns.some((run) => URL.test(run))) return fail("link");
  if (PHONE.test(text) || PHONE.test(numbered) || EMAIL_SPELLED.test(text) || spelledPhone(text) || spacedEmail) return fail("personal-info");
  // Links spelled out with spaces ("h t t p s : / /") are links too.
  // Bare IPv4 addresses and the reserved .example/.test/.invalid names are links too.
  if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(text) || /\b[a-z0-9-]{2,}\.(?:example|test|invalid|localhost|onion|local)\b/i.test(undotted) || URL.test(text) || URL.test(undotted) || /\b[a-z0-9-]{2,}\.(?:com|net|org)\b/i.test(leet) || DOMAIN_SPELLED.test(text) || /https?:\/\/|www\./i.test(text.replace(/\s+/g, ""))) return fail("link");
  // "@ pettyking on twitter": a detached @name next to a platform name.
  const detachedHandle = /@\s+[a-z0-9_.]{3,}\b.{0,25}\b(?:insta(?:gram)?|ig|tiktok|snap(?:chat)?|twitter|discord|telegram|whatsapp|facebook|fb|threads|bluesky|reddit|youtube|twitch|kik)\b/i.test(text);
  if (HANDLE.test(text) || PLATFORM_HANDLE.test(text) || PLATFORM_COLON.test(text) || detachedHandle) return fail("handle");

  const words = normaliseForWords(text);
  // Adjacent pairs too, for slurs split by a space ("fa ggot").
  const pairs = words.slice(1).map((w, i) => words[i] + w);
  for (const word of [...words, ...pairs, ...spacedOutWords(text)]) {
    if (SLURS.has(word)) return fail("hate");
    // Stretched spellings ("fooooo") are compared in collapsed form, but only when the word
    // actually has repeated letters, so ordinary words like "con" or "niger" never match.
    const collapsed = collapseRepeats(word);
    if (collapsed !== word && SLURS_COLLAPSED.has(collapsed)) return fail("hate");
  }
  // Also check a leetspeak-decoded copy ("k1ll" → "kill") for threats and serious crime.
  const decoded = text.replace(/[013457@$!]/g, (c) => LEET[c] ?? c);
  if (VIOLENCE.some((re) => re.test(text) || re.test(decoded) || re.test(joined))) return fail("violence");
  if (SERIOUS.some((re) => re.test(text) || re.test(decoded) || re.test(joined))) return fail("serious-crime");
  if (allowSpamCheck && looksLikeSpam(raw)) return fail("spam");
  return { ok: true };
}

/** Screens several fields; returns the first failure with the field name. */
export function screenFields(fields: Record<string, string | undefined | null>): (FilterResult & { field?: string }) {
  for (const [field, value] of Object.entries(fields)) {
    if (!value) continue;
    // Titles skip the caps/repetition heuristics but still may not contain giant unbroken words.
    const result: FilterResult =
      LONG_WORD.test(value) ? { ok: false, issue: "spam", message: LONG_WORD_MESSAGE } : screenText(value, { allowSpamCheck: field !== "title" });
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
