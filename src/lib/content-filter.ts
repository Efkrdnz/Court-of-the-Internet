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
  | "phishing"
  | "spam";

export interface FilterResult {
  ok: boolean;
  issue?: FilterIssue;
  message?: string;
}

const MESSAGES: Record<FilterIssue, string> = {
  "personal-info":
    "Objection! That looks like personal information (an email, phone number or address). Keep everyone anonymous.",
  link: "Links are inadmissible evidence. Please put it in your own words instead.",
  handle: "Usernames and @handles aren't allowed. This court protects the identities of the petty.",
  hate: "The court does not tolerate slurs or hateful language. Rephrase and try again.",
  violence: "Threats or encouragement of violence are out of order. This court only hears petty crimes.",
  "serious-crime":
    "This court only hears ridiculous, harmless offenses. Serious real-world crimes belong with real authorities.",
  phishing: "Asking for someone's password, login or codes isn't allowed. Nobody at this court will ever ask for them.",
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
/** Listed words whose past-participle form is used as the slur (ROT13). */
const ED_SLURS = new Set(["ergneq"].map(rot13));

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "6": "g", "7": "t", "9": "g", "@": "a", $: "s", "!": "i" };

function normaliseForWords(text: string): string[] {
  const lowered = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[01345679@$!]/g, (c) => LEET[c] ?? c);
  return lowered.split(/[^a-z]+/).filter(Boolean);
}

function collapseRepeats(word: string): string {
  return word.replace(/(.)\1+/g, "$1");
}

const SLURS_COLLAPSED = new Set(Array.from(SLURS).map(collapseRepeats));

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// 7+ digits possibly separated by spaces, dots, dashes, parentheses: phone-ish.
// Any script's digits (Arabic-Indic too), with the separators people use to dodge filters.
// 9+ digits: real numbers (with area code) are caught. Shorter runs like years ("2019-2020") never
// match, and dates, times, score lists and counting are blanked out first (withoutEverydayNumbers).
// Bare 7-digit local numbers are a known gap (see README).
// Asking for someone's password or login ("message me your password", "reply with your login",
// "give me your pw", "if you give me your credentials"), audit 49 D3 and audit 51 #2.
const CREDENTIAL_ASK = /\b(?:send|give|tell|share|reply|respond|dm|pm|messag|email|text|whisper|post|drop|hand\s+over|type)\w*\s+(?:\w+\s+){0,4}?(?:your|ur|yer|their|his|her)\s+(?:\w+\s+(?:and|&|or)\s+)?(?:password|passwords|passwd|pw|pwd|pass\s*word|login|log-?in(?:\s+details)?|credentials|creds|2fa|two[\s-]factor|passcode|pin|verification\s+code|security\s+code|session|cookies?)\b/i;
const PHONE = /(?:\+?\p{Nd}[\s()./_,\-\u2013\u2014\u00b7]*){8,}\p{Nd}/u;
// Explicit URLs, or a domain with any two-letter country TLD or a common generic TLD.
const URL =
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:[a-z]{2}|com|net|org|info|biz|xyz|app|dev|online|site|shop|store|blog|live|link|club|fun|top|page|social|lol|wtf|tech|space|world|news|ninja|pro|art|design|email|cloud|digital|games|life|today|website|wiki|zone|rocks|fyi|guru|agency|studio|media|online|network|systems|works|party|club|vip|bet|win|click|icu|buzz|monster|quest|homes|lgbt|gay|sex|porn|adult)\b/i;
// A handle is "@name" not glued to a word on its left (that would be an email, checked first).
const HANDLE = /(?:^|[^\p{L}\p{N}_.%+-])@[\p{L}\p{N}_.]{3,}/u;
// Number + Capitalised Name(s) + street suffix, e.g. "42 Wallaby Way".
// UK postcodes ("SW1A 1AA"), written in capitals as on an envelope.
const UK_POSTCODE = /\b(?:[A-Z]{1,2}\d[A-Z\d]?|GIR)\s\d[A-Z]{2}\b/;
const STREET =
  /\b\d{1,5}[A-Za-z]?\s+(?:[A-Z][a-z]+\s){1,3}(?:[Ss]treet|St|[Aa]venue|Ave|[Rr]oad|Rd|[Bb]oulevard|Blvd|[Ll]ane|Ln|[Dd]rive|Dr|[Cc]ourt|Ct|[Ww]ay|[Pp]lace|Pl|[Tt]errace)\b\.?/;
// Lower-case addresses ("42 wallaby way"): one or two name words that aren't everyday filler,
// so "3 slices on the way" or "2 blocks down the road" stay fine.
const FILLER = "(?:the|a|an|my|his|her|our|their|your|down|up|on|to|of|in|at|by|from|for|and|all|way|whole|entire|long|other|each|one|either|every|both|this|that|minutes?|mins?|hours?|hrs?|days?|weeks?|months?|years?|seconds?|miles?|km|blocks?|games?|times?|steps?|laps?|rounds?|diet|cans?|bottles?|cups?|slices?)";
// Spelled-out house numbers: "seven forty two evergreen terrace".
const NUM_WORD = "(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)";
const STREET_SPELLED = new RegExp(
  `\\b${NUM_WORD}(?:[\\s-]+${NUM_WORD})*\\s+(?!${"(?:the|a|an|my|his|her|our|their|your|down|up|on|to|of|in|at|by|from|for|and|all|way|whole|entire|long|other|blocks?|miles?|minutes?|hours?|days?|times?|steps?)"}\\b)[a-z]+(?:\\s+[a-z]+)?\\s+(?:street|avenue|road|boulevard|lane|drive|terrace|way)\\b`,
  "i",
);
const STREET_LOWER = new RegExp(
  `\\b\\d{1,5}\\s+(?!${FILLER}\\b)[a-z]+(?:\\s+(?!${FILLER}\\b)[a-z]+)?\\s+(?:street|avenue|road|boulevard|lane|drive|terrace|way|st|ave|rd|blvd|ln|ct|pl)\\b`,
  "i",
);
const SSN = /\b\d{3}-\d{2}-\d{4}\b/;
// "bob [at] example [dot] com", "bob (at) example dot com".
// "court-of-pettiness dot com"
// Common endings, newer ones included ("bakery dot shop", audit 47 D3). Endings that are everyday
// English words only count after a name, not after "polka" ("polka dot top").
// "bit . ly / 3xYz": a dot set apart by spaces, before an ending that can't start a sentence
// (lower case, and not one that reads as a word: no ". me", ". it", ". co"), audit 50 D2.
const DOMAIN_SPACED = /\b(?!polka\b)[A-Za-z0-9-]{2,}(?:\s+\.\s*|\s*\.\s+)(?:com|net|org|io|ly|gg|xyz|app|dev|info|shop|biz|tv|uk|ru|de)\b(?:\s*\/|\s|$)/;
const DOMAIN_SPELLED = /\b(?!polka\b)[a-z0-9-]{2,}\s*(?:[[({]\s*dot\s*[\])}]|\sdot\s)\s*(?:com|net|org|io|co|uk|de|ru|me|tv|gg|xyz|app|dev|info|shop|store|online|site|blog|link|ly|biz|club|live|art|page|ai|ca|au|fr|nl|ie|tech|website|space|top|vip|cc|eu|nz|fm|lol|wtf|fun)\b/i;
const EMAIL_SPELLED =
  /\b[\w.+-]+\s*(?:[[({]\s*at\s*[\])}]|\sat\s)\s*[\w-]+\s*(?:[[({]\s*dot\s*[\])}]|\sdot\s)\s*[a-z]{2,}\b/i;
// "find him on insta as john_smith_1990": a platform name followed shortly by a handle-like token
// (letters mixed with digits, dots or underscores).
// "on ig: coolguy", "insta @coolguy": a platform name with a colon or @ right before a name.
const PLATFORM_COLON = /\b(?:insta(?:gram)?|ig|tiktok|snap(?:chat)?|twitter|discord|telegram|whatsapp|facebook|fb|threads|bluesky|reddit|youtube|twitch|kik)\s*[:@]\s*@?[a-z0-9._]{3,}/i;
// (Not a time or a resolution: "TikTok until 12am", "YouTube in 1080p".)
const NOT_A_TIME = "(?!\\d+(?:am|pm|p|k|fps|hz|h|hrs?|mins?|s|th|st|nd|rd|x)\\b)";
const PLATFORMS = "(?:insta(?:gram)?|ig|tiktok|snap(?:chat)?|twitter|discord|telegram|whatsapp|facebook|fb|threads|bluesky|reddit|youtube|twitch|kik)";
const PLATFORM_HANDLE = new RegExp(
  `\\b${PLATFORMS}\\b.{0,25}?\\b${NOT_A_TIME}(?=[a-z0-9._]*[_\\d.])(?=[a-z0-9._]*[a-z])[a-z0-9._]{4,}\\b|\\b${NOT_A_TIME}(?=[a-z0-9._]*[_\\d])(?=[a-z0-9._]*[a-z])[a-z0-9._]{4,}\\b.{0,15}?\\bon\\s+${PLATFORMS}\\b`,
  "i",
);
const NUMBER_WORDS: Record<string, string> = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };
/** A phone number spelled out ("five five five, eight six seven…"): 7+ digit words in a row. */
function spelledPhone(text: string): boolean {
  let run: number[] = [];
  // "double oh", "triple seven" repeat the next digit; digits typed as numbers count too
  // ("oh seven seven double oh 9…"), audit 53 #5.
  let repeat = 1;
  for (const w of text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
    if (w === "double" || w === "triple") {
      repeat = w === "double" ? 2 : 3;
      continue;
    }
    const digits = w in NUMBER_WORDS ? [Number(NUMBER_WORDS[w])] : /^\d{1,4}$/.test(w) && run.length > 0 ? [...w].map(Number) : null;
    if (!digits) {
      run = [];
      repeat = 1;
      continue;
    }
    for (let i = 0; i < repeat; i++) run.push(...digits);
    repeat = 1;
    // Counting up ("one, two, three…") isn't a phone number.
    if (run.length >= 9 && !run.every((n, i) => i === 0 || n === run[i - 1] + 1)) return true;
  }
  return false;
}
/**
 * "r e t a r d", "r.e.t.a.r.d": runs of single letters, joined back together. Every contiguous
 * slice is returned, because a neighbouring "a" or "I" often joins the run ("a f a g…").
 */
function spacedOutWords(text: string): string[] {
  const out: string[] = [];
  // Separated by spaces, punctuation or emoji ("f🍕a🍕g…").
  for (const run of text.match(/\b(?:[a-z](?:[\s.\-_*]|[^\p{L}\p{N}\s]){1,4}){3,}[a-z]\b/giu) ?? []) {
    const letters = run.replace(/[^a-z]/gi, "").toLowerCase().slice(0, 40);
    for (let i = 0; i < letters.length; i++) for (let j = i + 3; j <= letters.length; j++) out.push(letters.slice(i, j));
  }
  return out;
}

// A person (or pet) on the receiving end, for the past-tense harm patterns below. Objects stay
// fine: "I killed it at karaoke", "I shot a video", "I stabbed the pizza box".
const VICTIM =
  "(?:him|her|them|someone|somebody|(?:my|his|her|their|our|a|an|the|this|that|some)\\s+(?:\\w+\\s+)?(?:neighbou?r|roommate|room-mate|flatmate|coworker|co-worker|colleague|boss|manager|friend|brother|sister|mom|mum|mother|dad|father|wife|husband|partner|boyfriend|girlfriend|kid|kids|child|children|son|daughter|teacher|student|cop|officer|man|woman|guy|girl|boy|person|people|baby|grandma|grandpa|cat|dog|puppy|kitten|landlord|ex|stranger|date|defendant|accused|prosecutor|attorney|lawyer|juror|judge|passenger|driver|customer|waiter|waitress|cashier|bartender|bouncer|referee|tourist|neighbour's\\s+kid|cellmate|inmate|classmate|teammate|housemate|bandmate|nephew|niece|cousin|uncle|aunt|grandad|granddad|nan|gran|stepdad|stepmom|stepmum|toddler))";
// Who a threat is aimed at: a person (VICTIM) or "you"/"everyone".
const TARGET = `(?:you|ya|u|y'all|everyone|everybody|people|${VICTIM})`;
// Games and toys: "I beat my dad at chess", "killed my brother at Fortnite", "shot my sister with a water pistol".
const GAME =
  "(?:chess|scrabble|cards|poker|monopoly|uno|tennis|golf|pool|darts|bowling|mario\\s*kart|fortnite|minecraft|video\\s*games?|board\\s*games?|the\\s+game|a\\s+game|games?|races?|a\\s+race|arm\\s+wrestling|trivia|checkers|ping\\s*pong|basketball|football|soccer|bingo|quiz|the\\s+quiz|tag|laser\\s*tag|paintball|smash|call\\s+of\\s+duty|halo|overwatch|wordle|sudoku)";
const NOT_A_GAME = `(?!\\s+(?:at|in|on|to)\\s+(?:\\w+\\s+){0,2}${GAME}\\b|\\s+to\\s+(?:the|a)\\b|\\s+with\\s+(?:a|an|my|his|her|the)\\s+(?:\\w+\\s+){0,2}(?:nerf|water|squirt|foam|paintball|airsoft|camera|rubber\\s+band|bb|potato|pillow|snowball|nerf\\s+gun|spud)\\b)`;
// A person named outright: "kill Kevin", "murder Sarah" (case-sensitive: a capitalised name).
const NAMED = "(?!(?:It|This|That|The|Time|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Christmas)\\b)[A-Z][a-z]{2,}\\b";
// "…my brother's high score" is about a thing, unless the possession is alive ("my brother's cat").
const NOT_THEIR_THING = "(?!['’]s\\s+(?!(?:\\w+\\s+)?(?:cat|dog|puppy|kitten|pet|hamster|parrot|rabbit|bird|horse|baby|kid|son|daughter|wife|husband)\\b))";
// "shot my brother a dirty look", "shot my boss a text": a gesture or message, not a gun.
const NOT_A_GESTURE = "(?!\\s+(?:a|an|the|some|another)\\s+(?:\\w+\\s+){0,2}(?:look|looks|glance|text|message|email|e-mail|smile|wink|grin|stare|dm|photo|pic|picture|video|selfie|reply|question|warning|eyebrow|thumbs)\\b)";

const GROUPS =
  "(?:gay|lesbian|bi|trans|transgender|queer|black|white|brown|asian|jewish|muslim|christian|hindu|sikh|mexican|arab|african|chinese|indian|disabled|autistic|immigrant|refugee)\\s+(?:people|folks|men|women|kids|guys|ones)|(?:gays|lesbians|trans\\s+people|blacks|whites|asians|jews|muslims|christians|hindus|sikhs|mexicans|arabs|africans|immigrants|refugees|migrants|foreigners|women|men)";
const HATE_STATEMENTS = [
  new RegExp(`\\b(?:all\\s+)?(?:${GROUPS})\\s+(?:are|r)\\s+(?:all\\s+|just\\s+|nothing\\s+but\\s+)?(?:disgusting|vermin|animals|subhuman|scum|parasites|rats|cockroaches|filth|trash|garbage|evil|inferior|a\\s+disease|a\\s+plague|a\\s+cancer|savages|degenerates|criminals|terrorists|abominations?)\\b`, "i"),
  /\bjews\s+(?:control|run|own)\s+(?:the|all|every)\b/i,
  // A people named only by where they're from ("people from that country are vermin"). Words
  // that are everyday hyperbole for co-workers or fans ("animals", "savages") are left out.
  /\b(?:people|immigrants|migrants|foreigners|refugees|those\s+people|they|them|everyone|everybody)\s+from\s+(?:that|this|those|their|there|over\s+there|(?:that|this)\s+\w+|\w+\s+\w+|\w+)\s+(?:are|r)\s+(?:all\s+|just\s+|nothing\s+but\s+)?(?:vermin|subhuman|cockroaches|rats|parasites|filth|a\s+disease|a\s+plague|an\s+infestation|a\s+cancer)\b/i,
];

const VIOLENCE = [
  // "Kill all [group]" (audit 50 D2), with or without "lol jk".
  new RegExp(`\\b(?:kill|murder|exterminate|gas|shoot|nuke|wipe\\s+out)\\s+(?:all|every|each)\\s+(?:of\\s+)?(?:the\\s+|those\\s+)?(?:${GROUPS})\\b`, "i"),
  // Wishing a disease on someone ("I hope you all get cancer", audit 45).
  new RegExp(`\\b(?:hope|wish|pray|praying)\\s+(?:that\\s+)?(?:${TARGET}|you\\s+all|they|he|she)\\s+(?:all\\s+)?(?:gets?|catch(?:es)?|develops?)\\s+(?:cancer|aids|ebola|a\\s+tumou?r|leprosy|the\\s+plague)\\b`, "i"),
  // "My roommate is getting a knife in the ribs", "he'll get a bullet in the head" (audit 44 #2).
  // Not the idiom "a knife in the back".
  /\b(?:getting|get|gets|gonna\s+get|going\s+to\s+get|will\s+get|deserves?|has\s+earned|earned\s+(?:himself|herself|themselves))\s+(?:a\s+|one\s+)?(?:knife|blade|shank|bullet|bullets|machete|hammer|bat|screwdriver)\s+(?:in|to|through|between|across)\s+(?:the|his|her|their|your|ur)\s+(?:ribs|gut|guts|stomach|belly|head|skull|face|neck|throat|chest|heart|kneecaps?|eyes?|spine)\b/i,
  // "I'll put a knife in his ribs", "stick a knife in my neighbour".
  new RegExp(`\\b(?:put|puts|putting|stick|sticks|sticking|stuck|shove|shoved|plunge|plunged|sink|sank|jam|jammed|drive|drove)\\s+(?:a|my|the|this|that)\\s+(?:knife|blade|shank|screwdriver|machete)\\s+(?:in|into|through|between)\\s+(?:(?:his|her|their|your|ur)\\s+(?:ribs|gut|guts|stomach|belly|back|neck|throat|chest|heart|face|eyes?|head|skull|spine)\\b|${TARGET}\\b${NOT_THEIR_THING})`, "i"),
  /\b(?:kill|hang|shoot|off|unalive)\s+(?:your\s*self|urself|yourselves)\b/i,
  // "My roommate should just kill himself" (not the everyday "I should just kill myself after that exam").
  /\b(?:should|ought\s+to|needs?\s+to|deserves?\s+to)\s+(?:just\s+|go\s+)?(?:kill|hang|shoot|off)\s+(?:him|her|them|your)sel(?:f|ves)\b/i,
  // Bombs and weapons at school or work.
  /\b(?:going\s+to|gonna|i\s*(?:will|'ll)|want\s+to|plan(?:ning)?\s+to)\s+(?:bomb|blow\s+up|shoot\s+up|firebomb|torch)\s+(?:my|the|a|his|her|their|our)\s+(?:\w+\s+)?(?:school|office|work|workplace|building|church|mosque|synagogue|temple|house|home|mall|station|airport|plane|train|bus|class|classroom|university|college|uni|hospital|party|wedding|concert|stadium)\b/i,
  /\b(?:pipe|nail|car|letter)\s+bombs?\b|\bmolotov/i,
  /\b(?:bring(?:ing)?|brought|tak(?:e|ing)|took|carry(?:ing)?)\s+(?:a|my|his|her|the)\s+(?:loaded\s+)?(?:gun|rifle|pistol|handgun|shotgun|firearm|machete)\s+(?:to|into)\s+(?:work|school|class|church|uni|college|the\s+\w+|my\s+\w+)\b/i,
  /\bkys\b/i,
  // Threats against someone named: "I'm going to kill Kevin", "I'll murder Sarah", "Gonna stab Dave".
  new RegExp(`\\b(?:[Gg]oing\\s+to|[Gg]onna|I\\s*(?:will|'ll|would|'d))\\s+(?:kill|murder|stab|shoot|strangle|shank|poison|choke|drown|end|punch|smack|hurt|beat\\s+up)\\s+${NAMED}`),
  new RegExp(`\\b(?:going\\s+to|gonna|i\\s*(?:will|'ll))\\s+beat\\s+${TARGET}\\s+up\\b`, "i"),
  /\bi\s*(?:will|'ll|am\s+going\s+to|'m\s+going\s+to|'m\s+gonna|m\s+gonna)\s+end\s+(?:you|u|him|her|them)\b/i,
  // "I'm going to punch my neighbour", "beat the crap out of him".
  new RegExp(`\\b(?:going\\s+to|gonna|i\\s*(?:will|'ll))\\s+(?:punch|smack|slap|headbutt|beat|beat\\s+the\\s+(?:crap|hell|shit|snot|living\\s+daylights)\\s+out\\s+of)\\s+${TARGET}\\b${NOT_THEIR_THING}${NOT_A_GAME}`, "i"),
  // Wishing death on a person: "I hope my boss dies", "I wish my landlord would die".
  new RegExp(`\\b(?:hope|wish|pray)\\s+(?:that\\s+)?${TARGET}\\s+(?:would\\s+|will\\s+|just\\s+)?(?:dies?|drops?\\s+dead|gets?\\s+(?:hit\\s+by|killed|run\\s+over|cancer)|burns?\\s+(?:alive|to\\s+death))\\b`, "i"),
  // Wishing death on someone: "I hope you die", "go die", "you should die".
  /\b(?:i\s+)?hope\s+(?:you|u|ya|he|she|they|y'all)\s+(?:die|dies|get\s+hit\s+by|rot|burn)\b|\bgo\s+die\b|\b(?:you|u)\s+should\s+(?:die|just\s+die)\b/i,
  // "I'm going to kill my roommate", "gonna stab the neighbour": intent plus a person.
  new RegExp(`\\b(?:going\\s+to|gonna)\\s+(?:kill|hurt|stab|shoot|murder|strangle|shank|choke|drown|beat\\s+up)\\s+${TARGET}\\b${NOT_THEIR_THING}${NOT_A_GAME}`, "i"),
  // "I'm going to kill." / "I will kill!" with nothing after it. With an object ("kill it at the
  // talent show", "murder this burger", "kill for a nap") it's an idiom.
  /\bi(?:'m|m| am)?\s*(?:going\s+to|gonna)\s+(?:kill|hurt|stab|shoot|murder)\s*(?:[.!?]|$)/i,
  new RegExp(`\\bi\\s*(?:will|'ll)\\s+(?:kill|hurt|stab|shoot|murder|strangle|shank|choke|drown|unalive)\\s+${TARGET}\\b${NOT_THEIR_THING}${NOT_A_GAME}`, "i"),
  /\bi\s*(?:will|'ll)\s+(?:kill|hurt|stab|shoot|murder|unalive)\s*(?:[.!?]|$)/i,
  // "I will end my neighbour", "gonna unalive my flatmate".
  // ("end"/"off" need a person after them: "end my streak" is fine.)
  /\b(?:i\s*(?:will|'ll|would|'d)|gonna|going\s+to|want\s+to)\s+(?:end|unalive|off)\s+(?:him|them|someone|somebody|everyone|(?:my|his|her|their)\s+(?:\w+\s+)?(?:neighbou?r|roommate|room-mate|flatmate|coworker|co-worker|colleague|boss|friend|brother|sister|mom|mum|dad|wife|husband|partner|boyfriend|girlfriend|landlord|ex|teacher))\b/i,
  // Intent + harm + a person: "I want to kill my neighbour", "planning to poison his dog".
  // Needs a human target, so "kill time", "could kill for a nap" and "mom will kill me" stay fine.
  new RegExp(`\\b(?:want(?:ed|s)?|plan(?:ned|ning|s)?|intend(?:ed|s)?|about|tr(?:y|ying|ied)|decided|need)\\s+to\\s+(?:kill|murder|stab|shoot|poison|strangle|hurt|punch|smack|beat\\s+up)\\s+${TARGET}\\b${NOT_THEIR_THING}`, "i"),
  // Poisoning or drugging someone's food or drink is aimed at them ("poison my roommate's coffee").
  new RegExp(`\\b(?:want(?:ed|s)?|plan(?:ned|ning|s)?|intend(?:ed|s)?|about|tr(?:y|ying|ied)|decided|need|going|gonna)\\s+(?:to\\s+)?(?:poison|drug|spike|lace)\\s+${TARGET}\\b`, "i"),
  // "I would kill my brother", but not the everyday "I could kill my brother for eating my fries".
  new RegExp(`\\bi\\s*(?:would|'d|could|should|might)\\s+(?:kill|murder|stab|shoot|poison|strangle)\\s+${TARGET}\\b${NOT_THEIR_THING}(?!\\s+for\\b)`, "i"),
  // "Someone should shoot him": wishing harm by someone else's hand.
  new RegExp(`\\b(?:someone|somebody|they|you|people)\\s+(?:should|needs?\\s+to|ought\\s+to)\\s+(?:kill|shoot|stab|murder|hurt|beat\\s+up|poison)\\s+${TARGET}\\b`, "i"),
  // "I will find you and break your legs", "put my neighbour in the hospital", "make sure he never wakes up".
  /\b(?:find|hunt\s+down|track\s+down)\s+(?:you|u|him|her|them)\s+and\s+(?:kill|hurt|break|beat|end|stab|shoot)\b/i,
  /\bbreak\s+(?:your|his|her|their|ur|(?:my|the|a|our)\s+[\w-]+(?:'s|’s|s'))\s+(?:legs?|arms?|neck|face|jaw|kneecaps?|skull|ribs?|nose|teeth|fingers?)\b/i,
  /\b(?:find|hunt\s+down|track\s+down)\s+(?:you|u|him|her|them)\s+and\s+make\s+(?:you|u|him|her|them)\s+(?:pay|suffer|bleed|regret)\b/i,
  // "I know where you live", "coming for you … with a bat".
  /\bi\s+know\s+where\s+(?:you|u|he|she|they)\s+lives?\b(?!\s+is\s+what)/i,
  /\bcoming\s+for\s+(?:you|u|him|her|them)\b.{0,30}\bwith\s+(?:a|my)\s+(?:bat|baseball\s+bat|knife|gun|crowbar|hammer|machete|axe)\b/i,
  // "My boss deserves to die", "my landlord should die".
  new RegExp(`\\b${TARGET}\\s+(?:deserves?\\s+to|should(?:\\s+just)?|needs?\\s+to|ought\\s+to)\\s+(?:die|be\\s+killed|be\\s+shot|be\\s+stabbed|be\\s+hanged|be\\s+beaten(?:\\s+up)?|be\\s+hurt|be\\s+punched|suffer|rot\\s+in\\s+hell)\\b${NOT_A_GAME}`, "i"),
  new RegExp(`\\bput\\s+${TARGET}\\s+in\\s+(?:the\\s+|a\\s+)?(?:hospital|icu|coma|ground|grave|morgue)\\b`, "i"),
  new RegExp(`\\b(?:make\\s+sure|so\\s+that)\\s+${TARGET}\\s+(?:never|doesn'?t|won'?t)\\s+wakes?\\s+up\\b`, "i"),
  new RegExp(`\\b(?:going\\s+to|gonna|i\\s*(?:will|'ll)|want\\s+to)\\s+run\\s+${TARGET}\\s+over\\b`, "i"),
  /\b(?:you'?re|you\s+are|ur|he'?s|she'?s|they'?re)\s+dead\s+meat\b/i,
  new RegExp(`\\b(?:want|wish|hope)\\s+${TARGET}\\s+(?:was\\s+|were\\s+|would\\s+be\\s+|to\\s+be\\s+|is\\s+)?dead\\b(?!\\s+(?:tired|serious|beat|on|wrong|right|set|last|quiet|silent|centre|center|even|to\\s+the\\s+world))`, "i"),
  new RegExp(`\\bwant\\s+${TARGET}\\s+to\\s+(?:die|drop\\s+dead|get\\s+killed)\\b`, "i"),
  /\b(?:going\s+to|gonna|i\s*(?:will|'ll))\s+(?:smash|bash|kick|punch|cave)\s+(?:your|his|her|their|(?:my|the|a)\s+[\w-]+(?:'s|’s|s'))\s+(?:face|head|skull|teeth)\s+in\b/i,
  // Knife threats: "slit your throat", "knife him", "gut my roommate".
  /\b(?:slit|cut|slash)\s+(?:your|his|her|their|ur|(?:my|the|a)\s+[\w-]+(?:'s|’s|s'))\s+throats?\b/i,
  new RegExp(`\\b(?:going\\s+to|gonna|i\\s*(?:will|'ll)|want\\s+to)\\s+(?:knife|gut|shank|stab|cut)\\s+${TARGET}\\b${NOT_THEIR_THING}`, "i"),
  /\b(?:going\s+to|gonna|i\s*(?:will|'ll))\s+(?:smash|bash|crack|split|cave\s+in)\s+(?:your|his|her|their|ur|(?:my|the|a)\s+[\w-]+(?:'s|’s|s'))\s+(?:skull|head|face|teeth|jaw|nose)\b/i,
  // "I will push him down the stairs", "I'll throw her off the balcony".
  new RegExp(`\\b(?:going\\s+to|gonna|i\\s*(?:will|'ll)|want\\s+to)\\s+(?:push|shove|throw|kick)\\s+${TARGET}\\s+(?:down|off|out\\s+of|into|under)\\s+(?:the|a)\\s+(?:stairs|staircase|balcony|roof|cliff|bridge|window|canal|river|lake|sea|traffic|road|train|bus)\\b`, "i"),
  /\b(?:going\s+to|gonna|i\s*(?:will|'ll))\s+(?:slash|cut|carve|stab)\s+(?:your|his|her|their|ur|(?:my|the|a)\s+[\w-]+(?:'s|’s|s'))\s+(?:face|throat|neck|eyes?)\b/i,
  /\bshoot\s+up\b/i,
  /\b(?:make|build|plant)\s+a\s+bomb\b/i,
  /\bswat(?:ting)?\s+(?:him|her|them|someone)\b/i,
];

const HARM_DONE = new RegExp(
  `\\bi\\s+(?:stabbed|knifed|shanked|shot|killed|murdered|poisoned|strangled|drowned|assaulted|beat\\s+up|kidnapped|ran\\s+over|mugged)\\s+${VICTIM}\\b${NOT_THEIR_THING}${NOT_A_GESTURE}${NOT_A_GAME}`,
  "i",
);

const SERIOUS = [
  // Audit 50: spitting (or worse) in someone else's food or drink: "a customer's soup", "the soup of a customer".
  /\b(?:spat|spit|spitting|peed|pissed|urinated|sneezed|coughed|snotted)\s+(?:in|into|on)\s+(?:a|the|my|his|her|their|that)\s+(?:customer|guest|diner|client|patron|boss|coworker|co-worker|colleague|roommate|flatmate|teacher|manager|neighbou?r)(?:'s|’s)\s+(?:\w+\s+)?(?:food|soup|drink|coffee|tea|meal|burger|sandwich|pizza|salad|dish|order|plate|smoothie|latte|lunch|dinner|pasta|curry|beer|water)\b/i,
  /\b(?:spat|spit|spitting|peed|pissed|urinated|sneezed|coughed|snotted)\s+(?:in|into|on)\s+(?:the|a|his|her|their)\s+(?:\w+\s+)?(?:food|soup|drink|coffee|tea|meal|burger|sandwich|pizza|salad|dish|order|plate|smoothie|latte|lunch|dinner|pasta|curry|beer|water)\s+(?:of|for)\s+(?:a|the|my|his|her|that|some)\s+(?:\w+\s+)?(?:customer|guest|diner|client|patron|boss|coworker|co-worker|colleague|roommate|flatmate|teacher|manager|neighbou?r)\b/i,
  // Audit 49: choking someone until they black out.
  new RegExp(`\\b(?:choked|strangled|throttled)\\s+${VICTIM}\\s+(?:until|till|til)\\s+(?:he|she|they)\\s+(?:passed\\s+out|blacked\\s+out|went\\s+limp|fainted|turned\\s+blue|couldn'?t\\s+breathe)\\b`, "i"),
  // Audit 46: a slap across the face, a head held under water.
  new RegExp(`\\b(?:slapped|smacked|backhanded|punched|struck|hit)\\s+${VICTIM}\\s+(?:so\\s+)?(?:hard\\s+)?(?:across|in|on)\\s+(?:the|his|her|their)\\s+(?:face|head|cheek|mouth|jaw)\\b`, "i"),
  new RegExp(`\\b(?:held|pushed|dunked|forced|kept)\\s+${VICTIM}(?:['’]s\\s+head)?\\s+under(?:\\s*water|\\s+the\\s+water|\\s+the\\s+surface)\\b`, "i"),
  // Audit 46: laxatives or pills hidden in someone's food or drink.
  /\b(?:put|puts|putting|slipped|slip|added|mixed|stirred|sprinkled|hid|baked|crushed)\s+(?:some\s+|a\s+few\s+|a\s+load\s+of\s+|(?:\w+\s+)?)?(?:laxatives?|ex-?lax|sleeping\s+(?:pills|tablets)|diuretics?|eye\s+drops|visine|ipecac|xanax|sedatives?|edibles?|weed|ketamine)\s+(?:in|into)\s+(?:(?:my|his|her|their|our|the|a)\s+(?:\w+\s+)?[\w-]+(?:'s|’s|s')|(?:my|his|her|their|our)\s+(?:neighbou?rs|bosses|parents|flatmates|roommates|coworkers|colleagues|friends)|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:food|drinks?|coffee|tea|brownies?|cakes?|lunch|dinner|breakfast|sandwich|cookies?|smoothie|water|beer|wine|meal|soup|juice|cupcakes?|curry|pasta|snacks?)\b/i,
  // Selling someone's things behind their back.
  /\bsold\s+(?:(?:my|his|her|their|our|the|a)\s+(?:\w+\s+)?[\w-]+(?:'s|’s|s')|(?:my|his|her|their|our)\s+(?:neighbou?rs|bosses|parents|flatmates|roommates|coworkers|colleagues|friends)|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:playstation|ps[45]|xbox|switch|console|laptop|phone|iphone|ipad|bike|car|guitar|tv|television|camera|jewel\w*|watch|rings?|necklace|stuff|things|belongings|clothes|furniture|sofa|games)\b(?=.{0,60}\b(?:without|behind\s+(?:his|her|their)\s+back|kept\s+the\s+(?:money|cash)|while\s+(?:he|she|they)\s+(?:was|were)\s+(?:away|out|asleep|at\s+work)|on\s+(?:ebay|facebook|vinted|gumtree|craigslist|depop)))/i,
  // A child or pet shut in a hot car.
  /\b(?:locked|left|shut)\s+(?:my|his|her|their|our|the|a)\s+(?:\w+\s+)?(?:toddler|baby|kid|kids|child|children|son|daughter|dog|puppy|cat|kitten|pet)\s+(?:alone\s+)?in\s+(?:the|a|my|his|her|their)\s+(?:hot\s+)?car\b(?=.{0,40}\b(?:hot|heat|heatwave|summer|sun|sweltering|boiling|windows?\s+(?:up|shut|closed)|for\s+hours)\b)/i,
  // Audit 45: arson of someone's property ("set fire to my neighbours shed": apostrophes optional).
  /\bset\s+fire\s+to\s+(?:(?:my|his|her|their|our|the|a)\s+[\w-]+(?:'s|’s|s')|(?:my|his|her|their|our)\s+(?:neighbou?rs|bosses|parents|flatmates|roommates|coworkers|colleagues|friends)|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:shed|house|home|car|garage|flat|apartment|fence|bins?|office|shop|barn|van|truck|caravan|bike|hair|dog|cat|garden|door|hedge|letterbox)\b/i,
  // A line keyed or scratched into someone's car ("down the side of my bosses Tesla").
  /\b(?:scratched|keyed|carved|gouged)\s+(?:a\s+|some\s+)?(?:\w+\s+)?(?:line|lines|scratch|scratches|words?|swear\s+words?|message)\s+(?:down|along|across|into|on|in)\s+(?:the\s+(?:\w+\s+)?(?:side|door|doors|bonnet|hood|roof|paint|paintwork|boot)\s+of\s+)?(?:(?:my|his|her|their|our|the|a)\s+[\w-]+(?:'s|’s|s')|(?:my|his|her|their|our)\s+(?:neighbou?rs|bosses|parents|flatmates|roommates|coworkers|colleagues|friends)|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:car|truck|van|motorbike|motorcycle|tesla|bmw|mercedes|porsche|ferrari|audi|toyota|honda|ford|jeep|lamborghini|range\s+rover|land\s+rover|volvo|lexus|mustang|corvette|vw|volkswagen|nissan|kia|hyundai|mini|fiat|vauxhall|peugeot|renault)\b/i,
  // Poisoning a pet ("fed my roommate's dog chocolate", "gave the cat antifreeze").
  /\b(?:fed|gave|feeding|giving)\s+(?:(?:my|his|her|their|the|a|our)\s+(?:[\w-]+(?:'s|’s|s')\s+)?|someone'?s\s+)(?:\w+\s+)?(?:dog|cat|puppy|kitten|hamster|rabbit|bird|parrot|pet|guinea\s+pig|ferret|budgie)\s+(?:some\s+|a\s+bit\s+of\s+|lots\s+of\s+)?(?:chocolate|grapes|raisins|antifreeze|xylitol|rat\s+poison|poison|bleach|slug\s+pellets|weed\s+killer|onions?)\b/i,
  // Stealing someone's post or parcels, or parcels off a doorstep.
  /\b(?:stole|steal|stealing|nicked|pinched|swiped|took|taking)\s+(?:all\s+(?:of\s+)?)?(?:(?:my|his|her|their|our|the|a)\s+[\w-]+(?:'s|’s|s')|(?:my|his|her|their|our)\s+(?:neighbou?rs|bosses|parents|flatmates|roommates|coworkers|colleagues|friends)|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:mail|post|parcels?|packages?|deliveries|letters)\b(?!\s+(?:keys?|box|code|password|room))/i,
  /\b(?:stole|steal|stealing|nicked|pinched|swiped|took|taking)\s+(?:\w+\s+){0,2}(?:parcels?|packages?|deliveries|mail|post)\s+(?:from|off|out\s+of)\s+(?:(?:(?:my|his|her|their|our|the|a)\s+[\w-]+(?:'s|’s|s')|(?:my|his|her|their|our)\s+(?:neighbou?rs|bosses|parents|flatmates|roommates|coworkers|colleagues|friends)|his|her|their|someone'?s|somebody'?s)|the\s+neighbou?rs'?)\s+(?:\w+\s+)?(?:porch|doorstep|door|mailbox|letterbox|front\s+step)\b/i,
  HARM_DONE,
  // Dosing someone's food or drink, or spiking it.
  // Needs the act ("put", "slipped"…) or "in/into" the drink, so "Molly spilled her coffee" and
  // "Senna and I drink coffee" (people's names) stay fine.
  /\b(?:put|putting|slipped|slip|added|adding|dropped|mixed|crushed|stirred|poured|laced|dosed|spiked)\b.{0,30}\b(?:laxatives?|ex-?lax|dulcolax|senna|eye\s*drops|sleeping\s+pills|xanax|molly)\b.{0,40}\b(?:coffee|drink|food|lunch|dinner|breakfast|dessert|water|tea|meal|soup|smoothie|cup|bottle|punch)\b/i,
  // "put something in her drink" (unless it's then named, "…: a cocktail umbrella").
  /\b(?:put|slipped|dropped)\s+(?:something|stuff|a\s+pill|pills|a\s+tablet|powder)\s+in(?:to)?\s+(?:her|his|their|someone'?s|somebody'?s|(?:my|a|the)\s+[\w-]+(?:'s|’s|s'))\s+drinks?\b(?!\s*:)/i,
  /\b(?:laxatives?|ex-?lax|dulcolax|senna|eye\s*drops|sleeping\s+pills|xanax|molly)\s+(?:in|into)\s+(?:\w+\s+){0,3}(?:coffee|drink|food|lunch|water|tea|meal|soup|smoothie|cup|bottle|punch)\b/i,
  /\bspiked\b.{0,40}\b(?:with|using)\s+(?:\w+\s+)?(?:vodka|alcohol|booze|rum|gin|tequila|drugs|pills|molly|xanax|laxatives?)\b/i,
  // Burning or vandalising someone else's things.
  /\bset\s+(?:my|his|her|their|the|our)\s+[\w-]+(?:'s|s')\s+(?:\w+\s+)?\w+\s+on\s+fire\b|\bset\s+fire\s+to\s+(?:my|his|her|their)\s+[\w-]+(?:'s|s')\b/i,
  /\bkeyed\s+(?:a|someone'?s|somebody'?s|his|her|their|(?:my|our)\s+[\w-]+(?:'s|s'))\s+(?:\w+\s+)?(?:car|truck|van|motorcycle)\b/i,
  // Poisoning food or drink with something dangerous.
  /\b(?:bleach|antifreeze|rat\s+poison|drain\s+cleaner|roofies?)\b.{0,50}\b(?:coffee|drink|food|lunch|water|tea|meal|soup|smoothie|cup|bottle|machine|shake|lemonade|juice|beer|wine|dinner|breakfast|cereal)\b/i,
  /\b(?:coffee|drink|food|lunch|water|tea|meal|soup|smoothie|cup|bottle|machine)\b.{0,50}\b(?:bleach|antifreeze|rat\s+poison|drain\s+cleaner|roofies?)\b/i,
  // Breaking into someone's accounts or devices.
  /\bhacked\s+(?:into\s+)?(?:my|his|her|their|someone'?s|somebody'?s|a)\s+(?:[\w-]+(?:'s|s')\s+)?(?:email|e-mail|account|accounts|phone|instagram|facebook|bank|computer|laptop|icloud|wifi)\b/i,
  // Theft of vehicles, robbery, arson.
  /\bi\s+(?:stole|hot-?wired|jacked|carjacked|nicked|pinched|boosted|swiped)\s+(?:a|an|someone'?s|somebody'?s|his|her|their|(?:my|our|the|a)\s+[\w-]+(?:'s|’s|s'))\s+(?:(?!toy|model|lego|remote|rc|matchbox|play|bumper|go-?kart)\w+\s+)?(?:car|truck|van|motorcycle|motorbike|scooter|bike)\b(?!\s+(?:keys?|keychains?|chargers?|seats?|covers?|mats?|stereo|radio|parking|spot|space|freshener|wash|magnets?|stickers?|horn|lights?|batter(?:y|ies)|manual|insurance|park))/i,
  // A car named by its make ("I stole a Tesla"), not merchandise ("a Tesla charger slot").
  /\bi\s+(?:stole|hot-?wired|jacked|carjacked|nicked|pinched|boosted)\s+(?:a|an|the|someone'?s|his|her|their|(?:my|our|the|a)\s+[\w-]+(?:'s|’s|s'))\s+(?:tesla|bmw|mercedes|porsche|ferrari|audi|toyota|honda|ford|jeep|lamborghini|range\s+rover|land\s+rover|volvo|lexus|mustang|corvette)\b(?!\s+(?:charg\w*|keys?|keychains?|stickers?|posters?|hats?|caps?|mugs?|toys?|models?|shirts?|slots?|spots?|manuals?|brochures?))/i,
  /\b(?:robbed|held\s+up|stuck\s+up)\s+(?:a|the|an)\s+(?:\w+\s+)?(?:bank|store|shop|gas\s+station|liquor\s+store|pharmacy|house|home|person|man|woman)\b|\bbank\s+robbery\b/i,
  /\bset\s+(?:the|a|my|his|her|their|our)\s+(?:\w+\s+)?(?:house|home|school|car|building|shop|store|apartment|flat|office|garage|church|barn|shed|restaurant|bar|classroom|gym)\s+on\s+fire\b/i,
  /\barson\b|\bburn(?:ed|t)\s+down\s+(?:a|the|my|his|her|their|our)\b|\bset\s+fire\s+to\s+(?:a|the|my|his|her|their|our)\s+(?:\w+\s+)?(?:house|home|car|building|school|shop|store|apartment|flat|office|garage)\b/i,
  // Domestic violence (siblings' pillow fights stay petty).
  // ("kicked my dad out of his recliner", "hit my dad up for cash" are something else.)
  /\bi\s+(?:hit|punched|slapped|smacked|kicked|choked|beat)\s+(?:my|his|her)\s+(?:wife|husband|girlfriend|boyfriend|partner|kid|kids|child|children|son|daughter|baby|mom|mum|mother|dad|father|grandma|grandpa)\b(?!['’]s|\s+(?:out|off|up)\b)(?!\s+(?:at|in|on)\s+(?:\w+\s+){0,2}(?:chess|scrabble|cards|poker|monopoly|uno|tennis|golf|pool|darts|bowling|fortnite|minecraft|video\s*games?|board\s*games?|games?|races?|trivia|checkers|ping\s*pong|basketball|football|soccer|wordle|arm\s+wrestling)\b|\s+to\s+(?:the|a)\b)/i,
  // Hitting or hurting non-family: housemates, neighbours, colleagues, pets ("kicked my dog").
  /\bi\s+(?:punched|kicked|slapped|choked|drowned|strangled|headbutted|bit)\s+(?:my|his|her|their|the|a|our)\s+(?:\w+\s+)?(?:roommate|room-mate|flatmate|neighbou?r|coworker|co-worker|colleague|boss|teacher|landlord|dog|cat|puppy|kitten|pet|hamster|rabbit|bird|parrot|horse)\b/i,
  /\b(?:beat|stabbed|kicked|choked|strangled|starved|burned|burnt)\s+(?:\w+(?:'s|s')?\s+){1,3}to\s+death\b/i,
  // Arson and vandalism of someone's property.
  /\b(?:burn|burned|burnt|burning|torch|torched|torching)\s+(?:down\s+)?(?:\w+(?:'s|s')?\s+){1,2}(?:house|home|car|truck|van|apartment|flat|garage|shop|store|school|office|building)\b/i,
  // "slashed his tyres", "slashed all four of my neighbour's tyres" (a sale slashing prices isn't).
  /\bslash(?:ed|ing)?\s+(?!(?:the\s+|our\s+|its\s+)?(?:prices?|costs?|budgets?|rates?)\b)(?:[\w-]+(?:'s|’s|s')?\s+){1,5}(?:tires|tyres|tire|tyre)\b/i,
  // Hit-and-run and mugging.
  /\bhit\s+(?:a|an|the|some)\s+(?:\w+\s+)?(?:pedestrian|cyclist|biker|jogger|kid|child|person|man|woman|girl|boy)\b.{0,40}\b(?:drove|sped|took|ran)\s+(?:off|away)\b/i,
  /\bmugg(?:ed|ing)\s+(?:a|an|the|someone|somebody|him|her|them|people)\b/i,
  // Drink- or drug-driving.
  /\b(?:drove|driving|drive)\s+(?:home\s+|there\s+|back\s+)?(?:(?:really|completely|totally|super|so|very|pretty|absolutely|properly|stupidly|blind|falling[\s-]down)\s+)?(?:drunk|wasted|hammered|high|blackout|plastered|smashed)\b|\bdrunk[\s-]driving\b|\bDUI\b/i,
  // "I drove home after six pints" (but not "six pints of lemonade").
  /\bdrove\s+(?:home\s+|back\s+|there\s+)?after\s+(?:\w+\s+){0,2}(?:pints|beers|drinks|shots|cocktails|glasses\s+of\s+wine|bottles\s+of\s+wine)\b(?!\s+of\s+(?:lemonade|water|juice|coke|soda|milk|tea|squash|kombucha))/i,
  // Anything sold to minors.
  /\b(?:sold|sell|selling|gave|supplied)\s+(?:\w+\s+){0,3}(?:weed|cannabis|marijuana|pot|vapes?|alcohol|booze|pills|drugs)\s+to\s+(?:\w+\s+)?(?:kids|children|minors|teens|teenagers|students|underage|high[\s-]?schoolers|middle[\s-]?schoolers|freshmen)\b/i,
  // Dealing hard drugs.
  /\b(?:sold|sell|selling|dealt|deal|dealing|supplied)\s+(?:\S+\s+){0,2}(?:cocaine|heroin|meth|fentanyl|crack|mdma|ecstasy|hard\s+drugs|drugs|oxycodone|oxycontin|oxys?|opioids|opiates|xanax|ketamine|percocet|codeine|tramadol|adderall)\b/i,
  // "coke" is also the drink ("sold the last Coke"): only bare "sold coke" / "dealing some coke".
  /\b(?:sold|sell|selling|dealt|deal|dealing|supplied)\s+(?:some\s+)?coke\b(?!\s+(?:zero|cans?|bottles?))/,
  // Burglary (your own car or piggy bank is fine), shoplifting something big, fraud, hit-and-run.
  /\bbroke\s+into\s+(?:a|an|the|someone'?s|somebody'?s|his|her|their|(?:my|our|the|a)\s+[\w-]+(?:'s|s'))\s+(?:\w+\s+)?(?:house|home|apartment|flat|car|truck|van|garage|shop|store|office|school)\b|\bburglar(?:y|ies|ized|ised|izing|ising)\b|\bbreaking\s+and\s+entering\b/i,
  /\bshoplift(?:ed|ing)?\s+(?:(?:a|an|the|two|three|some|several)\s+)?(?:pairs?\s+of\s+)?(?:\w+\s+)?(?:tvs?|televisions?|laptops?|phones?|iphones?|ipads?|tablets?|consoles?|ps4|ps5|playstation|xbox|switch|nintendo|airpods|headphones|earbuds|macbook|cameras?|drones?|jewel\w*|watch|watches|bikes?|tools?)\b(?!\s+(?:stickers?|posters?|cases?|covers?|cables?|keychains?|magnets?|games?|manuals?))/i,
  /\bembezzl/i,
  // A camera put in a bathroom or bedroom to watch someone; filming or photographing through a window.
  /\b(?:put|hid|placed|installed|set\s+up)\s+(?:a|my|the)\s+(?:hidden\s+|secret\s+|spy\s+)?cam(?:era)?s?\s+in\s+(?:the|my|her|his|their)\s+(?:bathroom|shower|bedroom|changing\s+room)\b.{0,30}\bto\s+(?:watch|film|spy|see|record)\b/i,
  /\b(?:recorded|filmed|videoed|photographed|took\s+(?:photos|pictures|pics|videos?)\s+of|watched|spied\s+on)\s+(?:my|his|her|their|a|the)\s+\w+\s+through\s+(?:her|his|their|the)\s+(?:bedroom|bathroom)\s+window\b/i,
  // Expensive shoplifting ("an expensive handbag", "designer sunglasses").
  /\bshoplift(?:ed|ing)?\s+(?:(?:a|an|some|two|three)\s+)?(?:pairs?\s+of\s+)?(?:expensive|designer|luxury|branded)\b/i,
  // Throwing something hard at a person.
  new RegExp(`\\b(?:threw|chucked|hurled|lobbed)\\s+(?:a|an|the|some)\\s+(?:brick|rock|stone|bottle|glass|pint\\s+glass|chair|knife)s?\\s+at\\s+${VICTIM}\\b`, "i"),
  // Injuries done to someone: broken bones, a black eye, knocked out, a concussion.
  /\b(?:broke|fractured|cracked|dislocated|shattered)\s+(?:(?:my|his|her|their|a|the)\s+[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|somebody'?s)\s+(?:nose|arms?|legs?|jaw|ribs?|wrist|ankle|fingers?|skull|collarbone|cheekbone|teeth|tooth|eye\s+socket)\b/i,
  new RegExp(`\\bgave\\s+(?:${VICTIM}|him|her|them)\\s+a\\s+(?:black\\s+eye|concussion|broken\\s+(?:nose|arm|leg|jaw|rib)|bloody\\s+nose|fat\\s+lip)\\b(?!\\s+(?:shadow|palette|mask|costume|make-?up))`, "i"),
  new RegExp(`\\bknocked\\s+(?:${VICTIM}|him|her|them)\\s+(?:unconscious|out\\s+cold|senseless)\\b`, "i"),
  new RegExp(`\\bleft\\s+(?:${VICTIM}|him|her|them)\\s+with\\s+a\\s+(?:concussion|broken\\s+\\w+|black\\s+eye|fractured\\s+\\w+)\\b`, "i"),
  // Identity theft: someone's identity, or credit opened in their name.
  /\bstole\s+(?:(?:my|his|her|their|a|the)\s+[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|somebody'?s)\s+identity\b/i,
  /\b(?:opened|took\s+out|applied\s+for|got)\s+(?:a|an)\s+(?:loan|credit\s+card|bank\s+account|mortgage|overdraft|phone\s+contract|store\s+card|payday\s+loan)\s+in\s+(?:[\w'’-]+\s+){0,2}name\b/i,
  // Taking someone's card and spending on it (a parent's is left to moderators).
  /\b(?:took|grabbed|stole|nicked|swiped|borrowed)\s+(?:(?:my|his|her|their|a|the)\s+(?!(?:mom|mum|mother|dad|father|parents)['’]s)[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|somebody'?s)\s+(?:(?:credit|debit|bank)\s+)?card\b(?!\s+(?:statement|bill|letter|reader|games?|tricks?|tables?))(?=.{0,40}\b(?:bought|paid|spent|ordered|used\s+it|purchased|booked|withdrew|withdrawn|took\s+out\s+(?:cash|money|[£$€]\s?\d)|got\s+cash))/i,
  // Shoplifting something valuable ("worth three hundred pounds", "walked out with a TV without paying").
  /\b(?:stole|shoplifted|nicked|pinched|lifted)\b.{0,50}\bworth\s+(?:over\s+|about\s+|nearly\s+|almost\s+)?(?:[$£€]?\s?\d{3,}|(?:\w+\s+)?(?:hundred|thousand|grand))\b/i,
  /\bwalked\s+out\s+(?:of\s+(?:the|a)\s+(?:\w+\s+)?(?:store|shop|supermarket|mall)\s+)?with\s+(?:a|an|the|two|some)\s+(?:\w+\s+)?(?:tvs?|televisions?|laptops?|phones?|iphones?|consoles?|ps5|xbox|airpods|headphones|cameras?|drones?|bikes?|jewel\w*|watch(?:es)?)\b.{0,30}\bwithout\s+paying\b/i,
  // Drink-driving, however it's phrased ("drove home from the pub completely drunk", "was hammered and drove").
  /\bdrove\b.{0,40}\b(?:drunk|wasted|hammered|plastered|smashed|blackout\s+drunk)\b(?!\s+(?:friend|friends|mate|mates|brother|sister|roommate|flatmate|people|guests|colleague|coworker|dad|mum|mom|uncle|aunt|neighbou?r)s?\b)/i,
  /\b(?:i\s+was|i\s+got|while)\s+(?:\w+\s+)?(?:drunk|hammered|wasted|plastered|smashed|high)\s+(?:and|when|but)\s+(?:i\s+|still\s+)?(?:drove|drive|got\s+behind\s+the\s+wheel)\b/i,
  // Secret recordings, and photos of someone undressing.
  /\bsecretly\s+(?:recorded|filmed|photographed|videoed)\b/i,
  /\b(?:took|snapped)\s+(?:photos|pictures|pics|videos?)\s+of\s+(?:\w+\s+){1,3}(?:undressing|changing|naked|in\s+the\s+shower|showering|in\s+(?:her|his|their)\s+underwear)\b/i,
  // Using a relative's or a stranger's card, or a found one.
  /\bused\s+(?:my|his|her|a|the|our)\s+(?:aunt|uncle|grandma|grandmother|grandpa|grandfather|nan|nana|cousin|teacher|in-laws?|sister-in-law|brother-in-law)['’]s\s+(?:credit|debit|bank)\s+card\b/i,
  /\bfound\s+(?:a|an|someone'?s|somebody'?s)\s+(?:wallet|purse|bank\s+card|credit\s+card|debit\s+card)\b.{0,40}\bused\s+(?:the|their|his|her|it|its)\b/i,
  // Throwing something at someone's head; injuries ("so hard her lip bled").
  /\b(?:threw|chucked|hurled|lobbed)\s+(?:a|an|the|some)\s+(?:brick|rock|stone|bottle|glass|pint\s+glass|chair|knife)s?\s+at\s+(?:\w+(?:'s|’s|s')?\s+){0,3}(?:head|face|eye)s?\b/i,
  /\b(?:hit|slapped|punched|kicked|pushed|shoved|bit|scratched|beat)\s+(?:\w+\s+){1,4}so\s+hard\s+(?:that\s+)?(?:\w+\s+){0,2}(?:bled|was\s+bleeding|broke|fractured|passed\s+out|went\s+to\s+(?:the\s+)?hospital|lost\s+a\s+tooth|needed\s+stitches)\b/i,
  // A knife or gun drawn on, held to, or used to threaten someone.
  /\b(?:pulled|drew|brandished|waved|held|pointed|put)\s+(?:a|my|the)\s+(?:knife|gun|machete|blade|pistol|rifle)\s+(?:on|at|to|against)\s+(?:him|her|them|someone|somebody|(?:my|his|her|their|a|an|the)\s+[\w'’-]+)/i,
  /\bthreatened\s+(?:\w+\s+){1,3}with\s+(?:a|my|his|her)\s+(?:knife|gun|bat|machete|hammer|crowbar|blade)\b/i,
  new RegExp(`\\b(?:pepper[\\s-]?sprayed|maced|tasered|tased)\\s+${VICTIM}\\b`, "i"),
  // Stealing someone's jewellery, or their gadgets to sell.
  /\bstole\s+(?:(?:my|his|her|their|a|the)\s+[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+){0,2}(?:rings?|necklaces?|jewel\w*|earrings?|bracelets?|watch(?:es)?)\b(?!\s+(?:idea|design|style|look))/i,
  /\b(?:stole|took|nicked|pinched|swiped)\s+(?:(?:my|his|her|their|a|the)\s+[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:laptops?|phones?|iphones?|ipads?|tablets?|cameras?|consoles?|bikes?|wallets?|purses?)\b.{0,40}\b(?:pawned|sold|flogged|fenced|kept\s+it)\b/i,
  // Hitting a stranger, a bouncer, an old lady…; attacking someone with something.
  /\bi\s+(?:punched|kicked|slapped|headbutted|elbowed|bit|attacked|assaulted|hit)\s+(?:a|an|the|some|this|that)\s+(?:\w+\s+)?(?:stranger|bouncer|old\s+lady|old\s+man|old\s+woman|pensioner|woman|man|guy|girl|lady|passenger|driver|cyclist|customer|waiter|waitress|cashier|bartender|referee|teenager|kid|child|security\s+guard|cop|police\s+officer)\b/i,
  /\b(?:pushed|shoved|knocked)\s+(?:a|an|the|some|this|that|my|his|her)\s+(?:\w+\s+)?(?:stranger|bouncer|old\s+lady|old\s+man|old\s+woman|pensioner|woman|man|guy|girl|lady|passenger|cyclist|kid|child|neighbou?r|roommate|flatmate|coworker|colleague)\s+(?:over|down|into|off|against|onto|out\s+of|in\s+front\s+of)\b/i,
  /\battacked\s+(?:\w+\s+){1,3}with\s+(?:a|an|my)\s+(?:bottle|knife|bat|brick|glass|hammer|crowbar|chair|rock|pint\s+glass)\b/i,
  // Throwing or hurting a pet ("threw my cat against the wall", "hurt my neighbour's dog").
  /\b(?:threw|kicked|flung|hurled|slammed|swung|chucked|tossed|lobbed)\s+(?:(?:my|his|her|their|the|a|our)\s+(?:[\w-]+(?:'s|’s|s')\s+)?|someone'?s\s+)(?:\w+\s+)?(?:dog|cat|puppy|kitten|hamster|rabbit|bird|parrot|pet|guinea\s+pig|tortoise|ferret|budgie)\s+(?:against|across|into|at|down|out\s+of|off|out\s+(?:the|a|of)\s+|over\s+(?:the|a)\s+(?:fence|wall|balcony|railing|railings|edge|bridge|hedge))\b/i,
  // Someone's life savings or pension taken ("stole my grandma's savings", "drained my nan's pension").
  /\b(?:stole|nicked|pinched|swiped|drained|emptied|cleaned\s+out|gambled\s+away|blew)\s+(?:all\s+(?:of\s+)?)?(?:(?:my|his|her|their|a|an|the)\s+[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|somebody'?s)\s+(?:life\s+|entire\s+|whole\s+)?(?:savings|pension|inheritance|retirement\s+(?:money|fund|savings))\b(?!\s+(?:jars?|tins?|ideas?|tips?|plans?|strategy|recipe|apps?|advice|books?|calculator|spreadsheet))/i,
  // Bringing a weapon to school or work to scare or hurt someone (a chef's knife for the cake is fine).
  /\b(?:bring|brings|bringing|brought|took|take|taking|carry|carries|carrying|carried)\s+(?:a|my|the|his|her)\s+(?:knife|gun|machete|blade|pistol|rifle|knuckle\s*duster|taser)\s+(?:in\s+)?(?:to|into)\s+(?:work|school|class|college|uni|the\s+office|the\s+school)\b.{0,40}\bto\s+(?:scare|threaten|intimidate|frighten|hurt|stab|shoot|use\s+(?:it\s+)?on|get\s+back\s+at)\b/i,
  /\b(?:hurt|injured|hit|kicked|beat|poisoned)\s+(?:(?:my|his|her|their|the|a|our)\s+[\w-]+(?:'s|’s|s')|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:dog|cat|puppy|kitten|hamster|rabbit|bird|parrot|pet|horse|guinea\s+pig)\b(?!['’]s)/i,
  // Vandalising someone's car or house ("scratched my neighbour's car", "a brick through my ex's window").
  /\b(?:scratched|spray[\s-]?painted|egged|graffitied|keyed|smashed|vandali[sz]ed|dented)\s+(?:(?:my|his|her|their|the|a|our)\s+[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+){0,2}(?:car|truck|van|motorbike|motorcycle|house|front\s+door|garage|tesla|bmw|mercedes|porsche|ferrari|audi|toyota|honda|ford|jeep|lamborghini|range\s+rover|land\s+rover|volvo|lexus|mustang|corvette|merc|beemer|vw|volkswagen|nissan|kia|hyundai|mini|fiat|vauxhall|peugeot|renault)\b(?!\s+(?:charg\w*|keys?|keychains?|stickers?|posters?|toys?|models?|shirts?|mugs?|hats?|caps?|manuals?|brochures?))/i,
  /\b(?:threw|chucked|hurled|lobbed)\s+(?:a|an|the|some)\s+(?:brick|rock|stone|bottle|chair)s?\s+(?:through|at|into)\s+(?:(?:my|his|her|their|the|a)\s+[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|the\s+(?:neighbou?rs?'?|shop'?s?|school'?s?))\s*(?:\w+\s+)?(?:window|windscreen|windshield|car|house|door)s?\b/i,
  // Stealing kit from work, or money from someone's purse.
  /\b(?:stole|nicked|pinched|swiped)\s+(?:a|an|the|some|two|three)\s+(?:\w+\s+)?(?:laptops?|macbooks?|ipads?|tablets?|phones?|iphones?|cameras?|tvs?|monitors?|projectors?)\s+(?:from|out\s+of)\s+(?:my|the|our|work|his|her|their)\b/i,
  /\b(?:stole|took|nicked|pinched|swiped|pocketed)\s+(?:\w+\s+){0,2}(?:money|cash|notes|cards?|pounds|quid|dollars|bucks|euros|fivers?|tenners?|twenties|[$£€]\s?\d[\d,.]*)\s+(?:\w+\s+){0,2}(?:from|out\s+of)\s+(?:(?:my|his|her|their|a|the)\s+[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:purse|wallet|handbag|bag|account|piggy\s+bank)\b/i,
  // Getting into someone's accounts ("logged into my ex's Snapchat", "guessed my sister's password").
  /\b(?:logged|broke|got|hacked)\s+into\s+(?:(?:my|his|her|their|a|the)\s+[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|somebody'?s)\s+(?:(?!xbox|playstation|psn|steam|nintendo|switch|game|gaming|netflix|spotify|disney|minecraft|fortnite|roblox|hulu)\w+\s+)?(?:snapchat|instagram|insta|facebook|tiktok|twitter|email|e-mail|gmail|account|accounts|phone|icloud|bank|whatsapp|messages|dms|laptop)\b/i,
  /\b(?:guess(?:ed|ing)|crack(?:ed|ing))\s+(?:(?:my|his|her|their|a|the)\s+[\w-]+(?:'s|’s|s')|his|her|their|someone'?s)\s+(?:\w+\s+)?(?:password|passcode|pin)\b/i,
  // Drugging someone ("drugged my date", "roofied a girl"), alcohol slipped into their drink.
  /\broofi(?:ed|es|e|ing)\b/i,
  new RegExp(`\\bdrugged\\s+${VICTIM}\\b(?!\\s+with\\s+(?:too\\s+much\\s+)?(?:\\w+\\s+)?(?:bread|pizza|cake|cookies?|food|sugar|coffee|kindness|love|snacks?|carbs))`, "i"),
  /\b(?:put|poured|slipped|mixed|added)\s+(?:\w+\s+){0,2}(?:vodka|alcohol|booze|rum|gin|tequila|whisk(?:e)?y|liquor|spirits|drugs?|pills?)\s+(?:in|into)\s+(?:(?:my|his|her|their|a|the|our)\s+(?:\w+\s+)?[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:drink|coffee|tea|juice|soda|water|smoothie|coke|lemonade|beer|wine)\b/i,
  // Hit-and-run with a person ("ran someone over and drove off").
  /\b(?:(?:hit|knocked\s+(?:down|over)|ran\s+over|struck|clipped|mowed\s+down)\s+(?:someone|somebody|him|her|them)|ran\s+(?:someone|somebody|him|her|them)\s+over)\b.{0,60}\b(?:(?:drove|sped|took|ran)\s+(?:off|away)|kept\s+(?:on\s+)?driving|didn'?t\s+stop|fled|left\s+the\s+scene)\b/i,
  // Cruelty to animals ("hit my dog with a belt", "starved my hamster", "drowned the kittens").
  /\b(?:hit|beat|kicked|whipped|starved|drowned|tortured|burned|burnt|strangled|abused|stabbed|skinned|mutilated)\s+(?:my|his|her|their|the|a|an|some|our|two|three)\s+(?:\w+\s+)?(?:dogs?|cats?|pupp(?:y|ies)|kittens?|hamsters?|rabbits?|bunn(?:y|ies)|birds?|parrots?|horses?|pon(?:y|ies)|squirrels?|pets?|guinea\s+pigs?|goldfish|ferrets?|tortoises?|turtles?|animals?)\b(?!['’]s)/i,
  // Taking hard drugs ("did coke", "took MDMA", "smoked crack"), dealing or growing weed.
  /\b(?:did|doing|do|took|taking|take|smoked|smoking|snorted|snorting|injected|injecting|dropped|tried)\s+(?:some\s+|a\s+(?:line|bump|hit)\s+of\s+)?(?:coke(?!\s+zero)|cocaine|mdma|ecstasy|crack|heroin|meth|ketamine|lsd|shrooms|magic\s+mushrooms|speed|ket)\b/i,
  /\b(?:dealt|deal|dealing|sold|sell|selling|supplied)\s+(?:\w+\s+){0,2}(?:weed|cannabis|marijuana|skunk|hash)\b|\b(?:dealt|deal|dealing)\s+(?:\w+\s+)?pills\b/i,
  /\bgr(?:ow|ew|owing|own)\s+(?:\w+\s+)?(?:weed|cannabis|marijuana|skunk)\b/i,
  // Groping: someone's body grabbed, or touching without consent.
  /\b(?:grabbed|touched|groped|pinched|slapped|squeezed)\s+(?:a|an|the|my|his|her|some|this)\s+(?:\w+\s+)?(?:woman|girl|man|guy|stranger|lady|coworker|co-worker|colleague|person|waitress|waiter)['’]s\s+(?:bum|butt|ass|arse|breasts?|boobs?|chest|crotch|private\s+parts|thigh|backside)\b/i,
  /\b(?:touched|grabbed|kissed|groped|fondled)\b.{0,50}\bwithout\s+(?:her|his|their)\s+(?:consent|permission|agreeing)\b/i,
  // Using someone else's card (a parent's, borrowed, is left to moderators).
  /\bused\s+(?:my|his|her|a|the|our)\s+(?:flatmate|roommate|room-mate|coworker|co-worker|colleague|neighbou?r|boss|friend|stranger|ex|landlord|customer|client|guest)['’]s\s+(?:credit|debit|bank)\s+card\b/i,
  // Poisoning someone's food or drink ("poisoned my coworker's coffee").
  /\b(?:poisoned|drugged|laced)\s+(?:(?:my|his|her|their|a|the|our)\s+(?:\w+\s+)?[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:coffee|tea|drink|food|lunch|water|meal|dinner|breakfast|soup|smoothie|juice|beer|wine|snack|sandwich|shake|protein\s+shake|milkshake|lemonade|cocktail|cereal|coke|soda|tea)\b/i,
  // Image-based abuse and voyeurism, groping.
  /\b(?:posted|shared|leaked|sent|uploaded|spread|sold|forwarded|texted|airdropped|showed)\s+(?:[\w'’-]+\s+){0,2}(?:nudes?|nude\s+(?:photos?|pics?|pictures?|images?|videos?)|intimate\s+(?:photos?|pics?|pictures?|images?|videos?)|naked\s+(?:photos?|pics?|pictures?|videos?)|sex\s+tape)\b|\brevenge\s+porn\b|\bupskirt/i,
  // Filming someone in the shower or undressing, unless they plainly asked for it.
  /\b(?:filmed|videoed|photographed|spied\s+on)\s+(?:\w+\s+){1,3}(?:in\s+the\s+shower|showering|undressing|changing|naked)\b(?!.{0,60}\b(?:(?:she|he|they)\s+(?:asked|wanted|agreed)|with\s+(?:her|his|their)\s+(?:permission|consent)))/i,
  /\b(?:hidden|spy|secret)\s+cam(?:era)?s?\s+in\s+(?:(?:my|his|her|their|the|a)\s+[\w-]+(?:'s|’s|s')\s+|(?:the|my|her|his|their)\s+)(?:bathroom|shower|bedroom|changing\s+room|room)\b/i,
  /\bgrop(?:ed|ing|e|es)\b/i,
  // Assault: a blow to the face or head, a push down the stairs.
  new RegExp(`\\bi\\s+(?:punched|kicked|slapped|headbutted|elbowed|kneed|hit)\\s+${VICTIM}\\s+in\\s+the\\s+(?:face|head|nose|mouth|jaw|eye|teeth|throat|stomach|gut|balls|groin)\\b`, "i"),
  new RegExp(`\\b(?:pushed|shoved|threw|kicked)\\s+${VICTIM}\\s+(?:down|off|out\\s+of)\\s+(?:the|a)\\s+(?:stairs|staircase|balcony|roof|cliff|bridge|window|moving\\s+car)\\b`, "i"),
  // Smashing someone's car.
  /\b(?:smashed|shattered|bashed|keyed|vandali[sz]ed|trashed)\s+(?:(?:my|his|her|their|the|a|our)\s+(?:\w+\s+)?[\w-]+(?:'s|’s|s')|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:car|truck|van|motorbike|motorcycle)(?:'s)?(?:\s+(?:windscreen|windshield|windows?|headlights?|mirrors?|lights?))?\b/i,
  // Spiking someone's drink (even without naming what): "spiked my friend's drink". ("Spiked the punch" isn't aimed at anyone.)
  /\bspiked\s+(?:(?:my|our|the|a)\s+[\w-]+(?:'s|s'|’s)|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:drink|coffee|tea|beer|cocktail|soda|food|lunch|meal|water|juice|smoothie|wine)\b/i,
  /\bburgl(?:ed|ing|es|e)\b/i,
  /\bbroke\s+into\s+(?:my|our|the)\s+(?:neighbou?rs?|ex|boss|coworkers?|co-workers?|landlords?|teachers?)['’]?s?\s+(?:\w+\s+)?(?:house|home|apartment|flat|car|truck|van|garage|shed|office)\b/i,
  /\b(?:hit|knocked(?:\s+over)?|ran\s+over|struck|clipped)\s+(?:a|an|the|some)\s+(?:\w+\s+)?(?:pedestrian|cyclist|biker|jogger|kid|child|person|man|woman|girl|boy)\b.{0,60}\b(?:(?:drove|sped|took|ran)\s+(?:off|away)|kept\s+(?:on\s+)?driving|didn'?t\s+stop|fled|left\s+the\s+scene)\b/i,
  // Stealing from the till at work, the safe or a charity tin.
  /\b(?:stole|stolen|stealing)\s+(?:\S+\s+){0,3}from\s+(?:the|my|our|a|work's)\s+(?:\w+\s+)?(?:till|cash\s+register|register|safe|charity\s+(?:tin|box|bucket)|collection\s+(?:plate|box)|donations?\s+(?:box|jar))\b/i,
  /\b(?:stole|steal|stealing|took|take|taking|nicked|pocketed|skimmed)\s+(?:\w+\s+){0,2}(?:money|cash|notes|(?:\w+\s+)?(?:dollars|pounds|quid|euros|bucks)|[$£€]\s?\d[\d,.]*k?)\s+(?:\w+\s+){0,2}(?:from|out\s+of)\s+(?:the|my|our|a|work's)\s+(?:\w+\s+)?(?:till|cash\s+register|register|safe|charity\s+(?:tin|box|bucket)|collection\s+(?:plate|box)|donations?\s+(?:box|jar))\b/i,
  /\bhit[\s-]and[\s-]run\b/i,
  /\b(?:stole|steal|stealing|cloned|skimmed|swiped)\s+(?:\w+(?:'s|s')?\s+){0,2}(?:credit|debit|bank)\s+cards?\b|\bcredit[\s-]card\s+(?:fraud|theft)\b|\bidentity\s+theft\b/i,
  /\brap(?:e|ed|ing|ist)\b/i,
  /\bmolest/i,
  /\bpaedo|\bpedo(?:phile)?s?\b/i,
  /\bchild\s+(?:porn|abuse|exploitation)\b/i,
  /\bunderage\s+(?:girls?|boys?|kids?|sex|porn|nudes?|pics|photos)\b/i,
  /\btraffick/i,
  /\b(?:commit(?:ted|ting)?|attempt(?:ed)?)\s+suicide\b/i,
  /\bself[-\s]?harm\b/i,
  /\bheroin\b|\bmeth(?:amphetamine)?\b|\bfentanyl\b/i,
  // A person, not "I could murder a pizza".
  new RegExp(`\\bmurder(?:ed)?\\s+${VICTIM}\\b${NOT_THEIR_THING}`, "i"),
];

// 36+ characters a line can't break inside ("keyboard-mash"). Emoji don't count (a row of 🍕
// wraps), and nor do scripts written without spaces (Chinese, Japanese, Thai, Lao, Khmer, Burmese).
// Underscores, dots and commas between letters don't break a line either, so they count
// ("the_cat_ate_my_homework_and_then…" slipped through when only letters counted, audit 44 #3);
// punctuation at either end of a word doesn't ("…volca!" is a 35-letter word and a "!").
const UNBREAKABLE_RUN = /(?:(?![\s\-‐-―\/­​\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{Extended_Pictographic}\p{Emoji_Modifier}‍️\u{1F1E6}-\u{1F1FF}]).){36,}/gu;
const LONG_WORD = {
  test(text: string): boolean {
    for (const run of text.match(UNBREAKABLE_RUN) ?? []) {
      if (Array.from(run.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "")).length >= 36) return true;
    }
    return false;
  },
};

function looksLikeSpam(text: string): boolean {
  if (/(.)\1{9,}/.test(text)) return true; // aaaaaaaaaa
  // …and long runs of one emoji (🏳️‍🌈 ×25), counted as whole graphemes. A playful row of 🍕
  // is fine; emoji-only confessions are refused by validation (they need words).
  let last = "";
  let run = 0;
  for (const { segment } of new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)) {
    run = segment === last && !/\s/.test(segment) ? run + 1 : 1;
    last = segment;
    if (run >= 25) return true;
  }
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

/**
 * Dates, times, score lists and counting are numbers people mention all the time; blank them out
 * before looking for phone numbers ("21-19, 21-17", "12/03/1998 10:30", "1 2 3 … 10 cookies").
 * A letter is left in their place so neighbouring digits don't join up.
 */
function withoutEverydayNumbers(t: string): string {
  return t
    .replace(/\b\d{1,2}\/\d{1,2}\/(?:\d{4}|\d{2})\b|\b\d{1,2}[.-]\d{1,2}[.-]\d{4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b/g, " X ")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " X ")
    .replace(/\b\d{1,3}\s*[-–]\s*\d{1,3}(?:\s*[,;]\s*\d{1,3}\s*[-–]\s*\d{1,3})+\b/g, " X ")
    // Money and big numbers written with thousands separators ("$1,500,000,000").
    // (A whole, well-formed amount only: "555,123,4567" and "07700,900,123" aren't.)
    .replace(/(?<![\d,.])\$?\s?[1-9]\d{0,2}(?:,\d{3})+(?:\.\d{1,2})?(?![\d,]|\.\d)|\$\s?\d+(?:\.\d{1,2})?(?![\d,]|\.\d)/g, " X ")
    // Lists of numbers with ", " between them ("187, 203, 225", "4.50, 5.25, 3.75"). Phone numbers
    // aren't written that way.
    // (Items of up to 3 digits, so "555, 123, 4567" is still a phone number.)
    .replace(/\b\d{1,3}(?:\.\d+)?(?:,\s+\d{1,3}(?:\.\d+)?)+\b(?![,.]?\s*\d)/g, " X ")
    .replace(/\b\d+(?:[\s,]+\d+){3,}\b/g, (run) => {
      const n = run.split(/[\s,]+/).map(Number);
      return n.every((x, i) => i === 0 || x === n[i - 1] + 1) ? " X " : run;
    });
}

// Webmail addresses with the ".com" left off ("johnsmith@gmail").
const EMAIL_PROVIDER = /\b[\w.+-]{2,}\s*@\s*(?:gmail|googlemail|yahoo|hotmail|outlook|icloud|protonmail|proton|aol|msn|gmx|yandex)\b/i;

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
    .replace(/\s+\.\s*(?=(?:com|net|org|io|co|uk|de|ru|me|tv|gg|xyz|app|dev|info|ninja)\b)/gi, ".")
    // Other stand-ins for the dot before the big three TLDs, which may be spaced out:
    // "pettyking·com", "pettyking, com", "pettyking / com", "pettyking dot c o m".
    // "pettyking .c o m": a real dot before a TLD spelled out with spaces (one inside it at least,
    // so "I sold it. Net profit…" stays a sentence).
    .replace(/([a-z0-9])\s*\.\s*(c\s[o0]\s?m|c[o0]\s+m|n\s[e3]\s?t|n[e3]\s+t|[o0]\s[r]\s?g|[o0]r\s+g)(?![a-z0-9-])/gi, (_, a: string, tld: string) =>
      `${a}.${tld.replace(/\s+/g, "").replace(/0/g, "o").replace(/3/g, "e")}`,
    )
    .replace(/([a-z0-9])\s*(?:[·•‧∙⋅・,/|]|\s+dot\s+)\s*(c\s?[o0]\s?m|n\s?[e3]\s?t|[o0]\s?r\s?g)(?![a-z0-9-])/gi, (_, a: string, tld: string) =>
      `${a}.${tld.replace(/\s+/g, "").replace(/0/g, "o").replace(/3/g, "e")}`,
    );
  const leet = undotted.replace(/[01345679@$!]/g, (c) => LEET[c] ?? c);
  // Digit-like tokens read O as 0 and I/l as 1 ("O77OO 9OO 123").
  const deLettered = text.replace(/\b[\dOoIl]*\d[\dOoIl]*\b/g, (tok) => tok.replace(/[Oo]/g, "0").replace(/[Il]/g, "1"));
  const numbered = deLettered.replace(/(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)/gi, (w) => NUMBER_WORDS[w.toLowerCase()] ?? w);
  // A lone "I" before a spelled-out word stays a word of its own ("I k n i f e d my…" → "I knifed my…").
  const joined = text
    .replace(/\b(I)\s+((?:[a-z][\s.\-_*]+){2,}[a-z])\b/g, (_, i: string, run: string) => `${i} ${run.replace(/[^a-z]/gi, "")}`)
    .replace(/\b(?:[a-z][\s.\-_*]+){2,}[a-z]\b/gi, (run) => run.replace(/[^a-z]/gi, ""));
  // …and words broken up or stretched inside: "st.abbed", "stab_bed", "stabbbbed" (audit 49 D2).
  const squeezed = joined.replace(/(\p{L})[.\-_*]+(?=\p{L})/gu, "$1").replace(/(\p{L})\1{2,}/gu, "$1$1");
  if (CREDENTIAL_ASK.test(text)) return fail("phishing");
  if (EMAIL.test(undotted) || EMAIL.test(text) || EMAIL_PROVIDER.test(text) || SSN.test(text) || STREET.test(text) || UK_POSTCODE.test(text) || STREET_LOWER.test(text) || STREET_SPELLED.test(text)) return fail("personal-info");
  // "j o h n @ g m a i l . c o m", "e v i l . c o m": runs of single characters, squashed back together.
  // Built from whole single-character tokens, so neighbouring words don't glue on ("visit e v i l . c o m to").
  const spacedRuns: string[] = [];
  let run: string[] = [];
  for (const token of [...text.split(/\s+/), ""]) {
    if ([...token].length === 1) run.push(token);
    else {
      if (run.length >= 5) spacedRuns.push(run.join(""));
      run = [];
    }
  }
  const spacedEmail = spacedRuns.some((run) => EMAIL.test(run));
  if (spacedRuns.some((run) => URL.test(run))) return fail("link");
  // Digits separated by anything that isn't a letter or digit ("555|123|4567", "555🍕123🍕4567"),
  // and keycap emoji digits ("5️⃣5️⃣5️⃣").
  const phoneish = withoutEverydayNumbers(numbered).replace(/[\uFE0F\u20E3]/g, "").replace(/[^\p{L}\p{Nd}\s+]/gu, " ");
  if (PHONE.test(withoutEverydayNumbers(text)) || PHONE.test(withoutEverydayNumbers(numbered)) || PHONE.test(phoneish) || EMAIL_SPELLED.test(text) || spelledPhone(text) || spacedEmail) return fail("personal-info");
  // Links spelled out with spaces ("h t t p s : / /") are links too.
  // Bare IPv4 addresses and the reserved .example/.test/.invalid names are links too.
  // A missing space between sentences ("I ate it.It was great", "Wait.So") isn't a domain.
  // Nor is "hungry.so i ate" or "cake.my bad": two-letter TLDs that are also English words count
  // as a sentence break when another word follows.
  const sentences = (t: string) =>
    t
      .replace(/([a-z0-9])\.(?=[A-Z][a-z])(?!(?:Com|Net|Org|Info|App|Dev|Xyz)\b)/g, "$1. ")
      .replace(/([a-z0-9])\.(so|my|no|it|is|in|am|at|by|do|go|as|on|or|we|hi|ok|up|if|of|he|an)(?=\s+[a-z])/gi, "$1. $2");
  // Version numbers ("firmware 2.10.3.1") look like IP addresses.
  const IPV4 = /(?<!\b(?:v|ver|version|firmware|update|build|release|patch|ios|android|windows|macos|python|node|chrome|firefox)\s?)\b(?:\d{1,3}\.){3}\d{1,3}\b/i;
  if (IPV4.test(text) || /\b[a-z0-9-]{2,}\.(?:example|test|invalid|localhost|onion|local)\b/i.test(undotted) || URL.test(sentences(text)) || URL.test(sentences(undotted)) || /\b[a-z0-9-]{2,}\.(?:com|net|org)\b/i.test(leet) || DOMAIN_SPELLED.test(text) || DOMAIN_SPACED.test(text) || /https?:\/\/|www\.[a-z0-9-]{2,}\.[a-z]{2,}/i.test(text.replace(/\s+/g, ""))) return fail("link");
  // "@ pettyking on twitter": a detached @name next to a platform name.
  const detachedHandle = /@\s+[a-z0-9_.]{3,}\b.{0,25}\b(?:insta(?:gram)?|ig|tiktok|snap(?:chat)?|twitter|discord|telegram|whatsapp|facebook|fb|threads|bluesky|reddit|youtube|twitch|kik)\b/i.test(text);
  // "pettyking#1234" (Discord tag), "u/pettyking" (Reddit).
  const taggedHandle = /\b[a-z][\w.]{2,31}#\d{4}\b/i.test(text) || /(?:^|[^\w/])u\/[a-z0-9_-]{3,}\b/i.test(text);
  if (HANDLE.test(text) || PLATFORM_HANDLE.test(text) || PLATFORM_COLON.test(text) || detachedHandle || taggedHandle) return fail("handle");

  // Idioms and names that contain a listed word ("a chink in my armour", "Dick Van Dyke", "Spic and Span").
  const forWords = text.replace(/\bchinks?\s+in\s+(?:\w+\s+)?armou?r\b|\bvan\s+dyke\b|\bspic\s+and\s+span\b/gi, " ");
  const words = normaliseForWords(forWords);
  // Plurals of listed words ("…s", "…es"), and the few whose "…ed" form is the slur itself.
  // (Not "…ed"/"…ing" in general: "spiced" or "chinking" are ordinary words.)
  const stems = words.flatMap((w) => [
    // "-es" only after s/x/z/ch/sh, as in English, so "spices" stays "spice".
    ...(w.endsWith("s") || w.endsWith("z") ? [w.slice(0, -1)] : []),
    ...(/(?:[sxz]|ch|sh)es$/.test(w) ? [w.slice(0, -2)] : []),
    ...(w.endsWith("ed") && ED_SLURS.has(w.slice(0, -2)) ? [w.slice(0, -2)] : []),
  ]);
  // Adjacent pairs too, for slurs split by a space ("fa ggot").
  const pairs = words.slice(1).map((w, i) => words[i] + w);
  // "q" drawn for "g" ("niqqer").
  const qForG = words.filter((w) => w.includes("q")).map((w) => w.replace(/q/g, "g"));
  // Letters masked with asterisks ("f*ggot", "n**ger"): each * stands for one letter.
  for (const masked of forWords.toLowerCase().match(/\b[a-z]+\*+[a-z*]*[a-z]\b|\b[a-z]+\*+[a-z]+\b/g) ?? []) {
    if (masked.replace(/\*/g, "").length < 3) continue;
    const re = new RegExp(`^${masked.replace(/\*/g, "[a-z]")}$`);
    if ([...SLURS].some((slur) => re.test(slur))) return fail("hate");
  }
  for (const word of [...words, ...stems, ...qForG, ...pairs, ...spacedOutWords(forWords)]) {
    if (SLURS.has(word)) return fail("hate");
    // Stretched spellings ("fooooo") are compared in collapsed form, but only when the word
    // actually has repeated letters, so ordinary words like "con" or "niger" never match.
    const collapsed = collapseRepeats(word);
    if (collapsed !== word && SLURS_COLLAPSED.has(collapsed)) return fail("hate");
  }
  // Hate without slurs: a protected group called vermin, disgusting, subhuman… or a stock
  // conspiracy line ("Jews control the banks").
  if (HATE_STATEMENTS.some((re) => re.test(text))) return fail("hate");
  // Also check a leetspeak-decoded copy ("k1ll" → "kill") for threats and serious crime.
  const decoded = text.replace(/[01345679@$!]/g, (c) => LEET[c] ?? c);
  if (VIOLENCE.some((re) => re.test(text) || re.test(decoded) || re.test(joined) || re.test(squeezed))) return fail("violence");
  if (SERIOUS.some((re) => re.test(text) || re.test(decoded) || re.test(joined) || re.test(squeezed))) return fail("serious-crime");
  // Same specific message as titles get, rather than the generic spam one.
  if (allowSpamCheck && LONG_WORD.test(raw)) return { ok: false, issue: "spam", message: LONG_WORD_MESSAGE };
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
