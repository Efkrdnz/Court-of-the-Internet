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
const DOMAIN_SPELLED = /\b[a-z0-9-]{2,}\s*(?:[[({]\s*dot\s*[\])}]|\sdot\s)\s*(?:com|net|org|io|co|uk|de|ru|me|tv|gg|xyz|app|dev|info)\b/i;
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
  for (const w of text.toLowerCase().split(/[^a-z]+/).filter(Boolean)) {
    run = w in NUMBER_WORDS ? [...run, Number(NUMBER_WORDS[w])] : [];
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
  "(?:him|her|them|someone|somebody|(?:my|his|her|their|our|a|an|the|this|that|some)\\s+(?:\\w+\\s+)?(?:neighbou?r|roommate|room-mate|flatmate|coworker|co-worker|colleague|boss|manager|friend|brother|sister|mom|mum|mother|dad|father|wife|husband|partner|boyfriend|girlfriend|kid|kids|child|children|son|daughter|teacher|student|cop|officer|man|woman|guy|girl|boy|person|people|baby|grandma|grandpa|cat|dog|puppy|kitten|landlord|ex))";
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

const VIOLENCE = [
  /\bkill\s+(?:your\s*self|urself|yourselves)\b/i,
  /\bkys\b/i,
  // Threats against someone named: "I'm going to kill Kevin", "I'll murder Sarah", "Gonna stab Dave".
  new RegExp(`\\b(?:[Gg]oing\\s+to|[Gg]onna|I\\s*(?:will|'ll|would|'d))\\s+(?:kill|murder|stab|shoot|strangle|shank|poison|choke|drown|end)\\s+${NAMED}`),
  /\bi\s*(?:will|'ll|am\s+going\s+to|'m\s+going\s+to|'m\s+gonna|m\s+gonna)\s+end\s+(?:you|u|him|her|them)\b/i,
  // "I'm going to punch my neighbour", "beat the crap out of him".
  new RegExp(`\\b(?:going\\s+to|gonna|i\\s*(?:will|'ll))\\s+(?:punch|smack|slap|headbutt|beat\\s+the\\s+(?:crap|hell|shit|snot|living\\s+daylights)\\s+out\\s+of)\\s+${TARGET}\\b${NOT_THEIR_THING}${NOT_A_GAME}`, "i"),
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
  new RegExp(`\\b(?:want(?:ed|s)?|plan(?:ned|ning|s)?|intend(?:ed|s)?|about|tr(?:y|ying|ied)|decided|need)\\s+to\\s+(?:kill|murder|stab|shoot|poison|strangle|hurt|beat\\s+up)\\s+${TARGET}\\b${NOT_THEIR_THING}`, "i"),
  // Poisoning or drugging someone's food or drink is aimed at them ("poison my roommate's coffee").
  new RegExp(`\\b(?:want(?:ed|s)?|plan(?:ned|ning|s)?|intend(?:ed|s)?|about|tr(?:y|ying|ied)|decided|need|going|gonna)\\s+(?:to\\s+)?(?:poison|drug|spike|lace)\\s+${TARGET}\\b`, "i"),
  // "I would kill my brother", but not the everyday "I could kill my brother for eating my fries".
  new RegExp(`\\bi\\s*(?:would|'d|could|should|might)\\s+(?:kill|murder|stab|shoot|poison|strangle)\\s+${TARGET}\\b${NOT_THEIR_THING}(?!\\s+for\\b)`, "i"),
  // "Someone should shoot him": wishing harm by someone else's hand.
  new RegExp(`\\b(?:someone|somebody|they|you|people)\\s+(?:should|needs?\\s+to|ought\\s+to)\\s+(?:kill|shoot|stab|murder|hurt|beat\\s+up|poison)\\s+${TARGET}\\b`, "i"),
  // "I will find you and break your legs", "put my neighbour in the hospital", "make sure he never wakes up".
  /\b(?:find|hunt\s+down|track\s+down)\s+(?:you|u|him|her|them)\s+and\s+(?:kill|hurt|break|beat|end|stab|shoot)\b/i,
  /\bbreak\s+(?:your|his|her|their|ur)\s+(?:legs?|arms?|neck|face|jaw|kneecaps?|skull|ribs?)\b/i,
  new RegExp(`\\bput\\s+${TARGET}\\s+in\\s+(?:the\\s+|a\\s+)?(?:hospital|icu|coma|ground|grave|morgue)\\b`, "i"),
  new RegExp(`\\b(?:make\\s+sure|so\\s+that)\\s+${TARGET}\\s+(?:never|doesn'?t|won'?t)\\s+wakes?\\s+up\\b`, "i"),
  /\bshoot\s+up\b/i,
  /\b(?:make|build|plant)\s+a\s+bomb\b/i,
  /\bswat(?:ting)?\s+(?:him|her|them|someone)\b/i,
];

const HARM_DONE = new RegExp(
  `\\bi\\s+(?:stabbed|shot|killed|murdered|poisoned|strangled|drowned|assaulted|beat\\s+up|drugged|kidnapped|ran\\s+over|mugged)\\s+${VICTIM}\\b${NOT_THEIR_THING}${NOT_A_GESTURE}${NOT_A_GAME}`,
  "i",
);

const SERIOUS = [
  HARM_DONE,
  // Dosing someone's food or drink, or spiking it.
  // Needs the act ("put", "slipped"…) or "in/into" the drink, so "Molly spilled her coffee" and
  // "Senna and I drink coffee" (people's names) stay fine.
  /\b(?:put|putting|slipped|slip|added|adding|dropped|mixed|crushed|stirred|poured|laced|dosed|spiked)\b.{0,30}\b(?:laxatives?|ex-?lax|dulcolax|senna|eye\s*drops|sleeping\s+pills|xanax|molly)\b.{0,40}\b(?:coffee|drink|food|lunch|water|tea|meal|soup|smoothie|cup|bottle|punch)\b/i,
  /\b(?:laxatives?|ex-?lax|dulcolax|senna|eye\s*drops|sleeping\s+pills|xanax|molly)\s+(?:in|into)\s+(?:\w+\s+){0,3}(?:coffee|drink|food|lunch|water|tea|meal|soup|smoothie|cup|bottle|punch)\b/i,
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
  // ("kicked my dad out of his recliner", "hit my dad up for cash" are something else.)
  /\bi\s+(?:hit|punched|slapped|kicked|choked|beat)\s+(?:my|his|her)\s+(?:wife|husband|girlfriend|boyfriend|partner|kid|kids|child|children|son|daughter|baby|mom|mum|mother|dad|father|grandma|grandpa)\b(?!['’]s|\s+(?:out|off|up)\b)(?!\s+(?:at|in|on)\s+(?:\w+\s+){0,2}(?:chess|scrabble|cards|poker|monopoly|uno|tennis|golf|pool|darts|bowling|fortnite|minecraft|video\s*games?|board\s*games?|games?|races?|trivia|checkers|ping\s*pong|basketball|football|soccer|wordle|arm\s+wrestling)\b|\s+to\s+(?:the|a)\b)/i,
  // Hitting or hurting non-family: housemates, neighbours, colleagues, pets ("kicked my dog").
  /\bi\s+(?:punched|kicked|slapped|choked|drowned|strangled|headbutted|bit)\s+(?:my|his|her|their|the|a|our)\s+(?:\w+\s+)?(?:roommate|room-mate|flatmate|neighbou?r|coworker|co-worker|colleague|boss|teacher|landlord|dog|cat|puppy|kitten|pet|hamster|rabbit|bird|parrot|horse)\b/i,
  /\b(?:beat|stabbed|kicked|choked|strangled|starved|burned|burnt)\s+(?:\w+(?:'s|s')?\s+){1,3}to\s+death\b/i,
  // Arson and vandalism of someone's property.
  /\b(?:burn|burned|burnt|burning|torch|torched|torching)\s+(?:down\s+)?(?:\w+(?:'s|s')?\s+){1,2}(?:house|home|car|truck|van|apartment|flat|garage|shop|store|school|office|building)\b/i,
  /\bslash(?:ed|ing)?\s+(?:\w+(?:'s|s')?\s+){1,2}(?:tires|tyres|tire|tyre)\b/i,
  // Hit-and-run and mugging.
  /\bhit\s+(?:a|an|the|some)\s+(?:\w+\s+)?(?:pedestrian|cyclist|biker|jogger|kid|child|person|man|woman|girl|boy)\b.{0,40}\b(?:drove|sped|took|ran)\s+(?:off|away)\b/i,
  /\bmugg(?:ed|ing)\s+(?:a|an|the|someone|somebody|him|her|them|people)\b/i,
  // Drink- or drug-driving.
  /\b(?:drove|driving|drive)\s+(?:home\s+|there\s+|back\s+)?(?:drunk|wasted|hammered|high|blackout)\b|\bdrunk[\s-]driving\b|\bDUI\b/i,
  // Anything sold to minors.
  /\b(?:sold|sell|selling|gave|supplied)\s+(?:\w+\s+){0,3}(?:weed|cannabis|marijuana|pot|vapes?|alcohol|booze|pills|drugs)\s+to\s+(?:\w+\s+)?(?:kids|children|minors|teens|teenagers|students|underage|high[\s-]?schoolers|middle[\s-]?schoolers|freshmen)\b/i,
  // Dealing hard drugs.
  /\b(?:sold|sell|selling|dealt|deal|dealing|supplied)\s+(?:\w+\s+){0,2}(?:cocaine|heroin|meth|fentanyl|crack|mdma|ecstasy|hard\s+drugs|drugs)\b/i,
  // "coke" is also the drink ("sold the last Coke"): only bare "sold coke" / "dealing some coke".
  /\b(?:sold|sell|selling|dealt|deal|dealing|supplied)\s+(?:some\s+)?coke\b(?!\s+(?:zero|cans?|bottles?))/,
  // Burglary (your own car or piggy bank is fine), shoplifting something big, fraud, hit-and-run.
  /\bbroke\s+into\s+(?:a|an|the|someone'?s|somebody'?s|his|her|their|(?:my|our|the|a)\s+[\w-]+(?:'s|s'))\s+(?:\w+\s+)?(?:house|home|apartment|flat|car|truck|van|garage|shop|store|office|school)\b|\bburglar(?:y|ies|ized|ised|izing|ising)\b|\bbreaking\s+and\s+entering\b/i,
  /\bshoplift(?:ed|ing)?\s+(?:a|an|the|two|three|some|several)\s+(?:\w+\s+)?(?:tvs?|televisions?|laptops?|phones?|iphones?|ipads?|tablets?|consoles?|ps5|xbox|switch|jewel\w*|watch|watches|bikes?|tools?)\b/i,
  /\bembezzl/i,
  // Spiking someone's drink (even without naming what): "spiked my friend's drink". ("Spiked the punch" isn't aimed at anyone.)
  /\bspiked\s+(?:(?:my|our|the|a)\s+[\w-]+(?:'s|s'|’s)|his|her|their|someone'?s|somebody'?s)\s+(?:\w+\s+)?(?:drink|coffee|tea|beer|cocktail|soda|food|lunch|meal|water|juice|smoothie|wine)\b/i,
  /\bburgl(?:ed|ing|es|e)\b/i,
  /\bbroke\s+into\s+(?:my|our|the)\s+(?:neighbou?rs?|ex|boss|coworkers?|co-workers?|landlords?|teachers?)['’]?s?\s+(?:\w+\s+)?(?:house|home|apartment|flat|car|truck|van|garage|shed|office)\b/i,
  /\b(?:hit|knocked(?:\s+over)?|ran\s+over|struck|clipped)\s+(?:a|an|the|some)\s+(?:\w+\s+)?(?:pedestrian|cyclist|biker|jogger|kid|child|person|man|woman|girl|boy)\b.{0,60}\b(?:(?:drove|sped|took|ran)\s+(?:off|away)|kept\s+(?:on\s+)?driving|didn'?t\s+stop|fled|left\s+the\s+scene)\b/i,
  // Stealing from the till at work, the safe or a charity tin.
  /\b(?:stole|steal|stealing|took|take|taking|nicked|pocketed|skimmed)\s+(?:\w+\s+){0,2}(?:money|cash|notes)\s+(?:\w+\s+){0,2}(?:from|out\s+of)\s+(?:the|my|our|a|work's)\s+(?:\w+\s+)?(?:till|cash\s+register|register|safe|charity\s+(?:tin|box|bucket)|collection\s+(?:plate|box)|donations?\s+(?:box|jar))\b/i,
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

// 36+ letters or digits in a row. Punctuation and emoji don't count ("honestly...i...ate", a row
// of 🍕), and nor do scripts written without spaces (Chinese, Japanese, Thai, Lao, Khmer, Burmese).
const LONG_WORD = /(?:(?![\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}])[\p{L}\p{N}\p{M}]){36,}/u;

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
  const joined = text.replace(/\b(?:[a-z][\s.\-_*]+){2,}[a-z]\b/gi, (run) => run.replace(/[^a-z]/gi, ""));
  if (EMAIL.test(undotted) || EMAIL.test(text) || EMAIL_PROVIDER.test(text) || SSN.test(text) || STREET.test(text) || STREET_LOWER.test(text) || STREET_SPELLED.test(text)) return fail("personal-info");
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
  if (IPV4.test(text) || /\b[a-z0-9-]{2,}\.(?:example|test|invalid|localhost|onion|local)\b/i.test(undotted) || URL.test(sentences(text)) || URL.test(sentences(undotted)) || /\b[a-z0-9-]{2,}\.(?:com|net|org)\b/i.test(leet) || DOMAIN_SPELLED.test(text) || /https?:\/\/|www\./i.test(text.replace(/\s+/g, ""))) return fail("link");
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
  // Also check a leetspeak-decoded copy ("k1ll" → "kill") for threats and serious crime.
  const decoded = text.replace(/[01345679@$!]/g, (c) => LEET[c] ?? c);
  if (VIOLENCE.some((re) => re.test(text) || re.test(decoded) || re.test(joined))) return fail("violence");
  if (SERIOUS.some((re) => re.test(text) || re.test(decoded) || re.test(joined))) return fail("serious-crime");
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
