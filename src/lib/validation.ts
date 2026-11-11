import { z } from "zod";
import { CATEGORY_KEYS } from "./categories";
import { LIMITS } from "./limits";
import { charCount, normalizeText } from "./text";
import { avatarSchema } from "./avatar";
import { ADJECTIVES, CRITTERS } from "./alias";
import { skeleton } from "./confusables";

/**
 * Headings can't be turned into rows of rules or blank boxes (audit 49 D5): no runs of six or more
 * punctuation marks or symbols (emoji are fine), and none of the extra-wide characters ("⸻", "﷽")
 * or ancient scripts that no font here draws (cuneiform, hieroglyphs).
 */
const SYMBOL_RUN = /(?:(?!\p{Extended_Pictographic})[\p{P}\p{S}]){6,}/u;
const WIDE_OR_UNDRAWABLE = /[\u2E3A\u2E3B\uFDFD\uA9C1-\uA9CD\p{Script=Cuneiform}\p{Script=Egyptian_Hieroglyphs}\p{Script=Anatolian_Hieroglyphs}\p{Script=Linear_A}\p{Script=Linear_B}\p{Script=Old_Persian}\p{Script=Ugaritic}]/u;
export const headingFriendly = (s: string) => !SYMBOL_RUN.test(s) && !WIDE_OR_UNDRAWABLE.test(s);
const HEADING_MESSAGE = "Long runs of symbols or extra-wide characters aren't allowed here. Use words.";

const text = (opts: { min?: number; max: number; label: string; multiline?: boolean }) =>
  z
    .string({ error: `${opts.label} is required.` })
    .transform((s) => normalizeText(s, { multiline: opts.multiline ?? true }))
    .refine((s) => charCount(s) >= (opts.min ?? 0), {
      message:
        (opts.min ?? 0) > 0
          ? `${opts.label} must be at least ${opts.min} characters.`
          : `${opts.label} is required.`,
    })
    .refine((s) => charCount(s) <= opts.max, {
      message: `${opts.label} must be at most ${opts.max} characters.`,
    });

// Unchecked checkboxes are simply absent from FormData, so the key must be optional (Zod 4).
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean(), z.null()])
  .optional()
  .transform((v) => v === "on" || v === "true" || v === true);

export const confessionSchema = z.object({
  // A title needs some words (audit 42 D4: 90 emoji were accepted, while the confession and the
  // arguments already insist on words).
  title: text({ ...LIMITS.title, label: "Case title", multiline: false }).refine((s) => (s.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 3, {
    message: "Give your case a title in words, not just emoji or symbols.",
  }).refine(headingFriendly, { message: HEADING_MESSAGE }),
  category: z.enum(CATEGORY_KEYS, { error: "Pick a category for your crime." }),
  confession: text({ ...LIMITS.confession, label: "Confession" }).refine((s) => (s.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 15, {
    message: "Tell the court what happened in words, not just emoji or symbols.",
  }),
  context: text({ max: LIMITS.context.max, label: "Additional context" })
    .optional()
    .transform((s) => (s ? s : undefined)),
  anonymous: checkbox,
  acceptRules: checkbox.refine((v) => v, { message: "You must accept the community rules." }),
});
export type ConfessionInput = z.input<typeof confessionSchema>;

export const argumentSchema = z.object({
  caseId: z.string().min(1).max(40),
  body: text({ ...LIMITS.argument, label: "Your argument" }),
});

export const voteSchema = z.object({
  caseId: z.string().min(1).max(40),
  choice: z.enum(["GUILTY", "NOT_GUILTY"], { error: "Choose Guilty or Not Guilty." }),
});

export const reactionSchema = z.object({
  caseId: z.string().min(1).max(40),
  type: z.enum(["HILARIOUS", "OUTRAGEOUS", "LEGENDARY", "RELATABLE"]),
});

/**
 * Display names can't mix Latin letters with Cyrillic or Greek ones: that mix is how look-alike
 * impersonation works ("Judge Wіgsworth" with a Cyrillic і). Single-script names in any
 * alphabet are fine.
 */
// Latin letters mixed with letters of any other script (Cyrillic і, Armenian ս, Cherokee Ꮯ…).
const mixesConfusableScripts = (s: string) => /\p{Script=Latin}/u.test(s) && /(?![\p{Script=Latin}])\p{L}/u.test(s);
// Full-width letters and spaces ("Ｗｉｄｅ　Ｎａｍｅ") are folded to ordinary ones before any check, so
// the stored name renders and wraps like normal text.
const foldFullWidth = (s: string) =>
  s.replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\u3000/g, " ").replace(/ {2,}/g, " ").trim();

const displayNameField = text({ ...LIMITS.displayName, label: "Display name", multiline: false })
  .transform(foldFullWidth)
  .refine((s) => /[\p{L}\p{N}]/u.test(s), { message: "Display names need at least one letter or number." })
  .refine(headingFriendly, { message: HEADING_MESSAGE })
  .refine((s) => !mixesConfusableScripts(s), {
    message: "Display names can't mix Latin letters with letters from other alphabets.",
  })
  // "Sweaty Walrus #D89B" is what anonymous confessors are called; nobody may pose as one.
  // (Checked on the NFKC form, so a full-width ＃ or trailing punctuation doesn't slip past.)
  // Any hash-like symbol (#, ＃, ♯, ⋕, ﹟…) or other symbol before a hex tag counts.
  .refine((s) => !/[#\uFF03\u266F\u22D5\uFE5F]\s*[0-9a-f]{3,6}\b|[^\p{L}\p{N}\s]\s*[0-9a-f]{4}\s*[^\p{L}\p{N}]*$/iu.test(s.normalize("NFKC")), {
    message: "Names with a #tag look like an anonymous alias. Pick something else.",
  })
  // …or without the hash at all: "Sneaky Pigeon D577" (an alias critter followed by a 4-hex tag).
  .refine((s) => !new RegExp(`\\b(?:${CRITTERS.join("|")})\\W*(?:(?:no|nr|num|number)\\.?\\W*)?[0-9a-f]{4}\\W*$`, "iu").test(s.normalize("NFKC")), {
    message: "Names with a #tag look like an anonymous alias. Pick something else.",
  })
  // "Anonymous", "Anonymous Defendant", "Anon Pigeon": what anonymous confessors are labelled as (audit 47 D4).
  .refine((s) => !new RegExp(`^\\s*(?:an?\\s+)?anon(?:ymous)?(?!\\p{L})(?:[\\s_.-]+(?:defendant|confessor|user|player|citizen|accused|${CRITTERS.join("|")}))?(?:[\\s#._-]*[\\p{N}a-f]{0,6})?\\s*$`, "iu").test(s.normalize("NFKC")), {
    message: "That's what anonymous confessors are called. Pick something else.",
  })
  // "Citizen 1234" is the stand-in name for a demoted officer, and "Former Citizen" a deleted account's.
  .refine((s) => !/^\s*(?:former\s+citizen\b.*|citizen\s*\d+)\s*$/iu.test(s.normalize("NFKC")), {
    message: "That name is reserved by the court. Pick something else.",
  })
  // An alias's two words alone ("Mysterious Walrus") would pass for one too.
  .refine((s) => !new RegExp(`^\\s*(?:${ADJECTIVES.join("|")})\\s+(?:${CRITTERS.join("|")})\\s*$`, "iu").test(s.normalize("NFKC")), {
    message: "That's what anonymous confessors are called. Pick something else.",
  });

/**
 * Staff titles anywhere in a name ("Head Moderator", "Bob (Moderator)", "Clerk of the Court",
 * "Chief Justice Bob", "court_moderator"): players may not wear them (audit 44 #1). Both sides are
 * folded the way the officer-name check folds: look-alike letters, accents, digits for letters
 * and doubled letters ("Clërk", "M0derator", "Adm1n", "Admln", "Moderatorr"), audit 45 D2.
 * Officers' own names carry titles ("Clerk Pemberton"), so the services apply this to signups,
 * usernames and players' profile changes. "Judge …" and "Sheriff …" stay allowed as everyday puns
 * ("Judge Mental"); real officers wear a badge on their profile.
 */
const TITLE_FOLD: Record<string, string> = { "0": "o", "1": "i", l: "i", "|": "i", "!": "i", "3": "e", "4": "a", "@": "a", "5": "s", $: "s", "7": "t", "8": "b" };
function foldTitle(s: string): string {
  const folded = [...skeleton(foldFullWidth(s)).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()].map((ch) => TITLE_FOLD[ch] ?? ch).join("");
  return ` ${folded.replace(/[^\p{L}\p{N}]+/gu, " ").replace(/(\p{L})\1+/gu, "$1").trim()} `;
}
const COURT_TITLES = [
  "presiding judge", "chief judge", "chief justice", "chief clerk", "lord justice", "justice of the", "the judge", "head judge",
  "court clerk", "court officer", "court official", "court staff", "court admin", "court administrator", "court moderator",
  "clerk", "clerks", "the court", "of the court", "bailiff", "bailiffs", "your honour", "your honor", "his honour", "his honor",
  "her honour", "her honor", "their honour", "their honor", "moderator", "moderators", "mod", "mods", "modteam", "admin", "admins",
  "administrator", "administrators", "sysop", "sysops", "staff", "support team", "site team", "officer", "officers",
  // Audit 47 D4.
  "supreme court", "high court", "magistrate", "magistrates", "your worship", "his worship", "her worship", "the bench", "official judge",
  // Audit 51 #3: names posing as the site itself or its staff.
  "court of the internet", "coti", "official court", "presiding", "verified", "official", "deleted", "registrar", "court system", "official account", "court account", "court team", "trust and safety", "trust safety", "site owner", "site official", "support", "helpdesk", "help desk",
].map(foldTitle);

// Distinctive stems also caught inside joined, numbered or split-up names ("ModeratorBob",
// "moderator9", "siteadmin", "Ad-min", "C l e r k", "Head of Moderation"), audit 46 D1. Everyday
// words that happen to contain one are removed first.
const TITLE_STEMS = ["moderator", "moderation", "admin", "clerk", "bailiff", "sysop", "officer", "yourhonour", "yourhonor", "courtstaff",
  // The site's own name, however it's joined or reordered (audit 52 D2).
  "courtoftheinternet", "courtinternet", "internetcourt", "courtsupport", "courtofficial", "courthq", "courtbot", "courtnews", "courtnotices",
  // Audit 53 #3.
  "internetscourt", "cotiteam", "cotiofficial", "cotistaff", "cotisupport", "cotiadmin", "court notification", "court message", "system message", "system notice", "deleted user", "removed user",
  // Audit 54 D4: "Court of the Interwebs" / "of the Web", "Courtroom Bot", "The Gavel Team".
  "court of the", "courtroom bot", "courtroom team", "gavel team", "gavel staff", "gavel official"].map((t) => foldTitle(t).replace(/[^\p{L}]+/gu, ""));
const NOT_A_TITLE = /\b(?:badminton\w*|administ(?:er|ers|ered|ering|rative)|clerkenwell|staff(?:ie|ies|y|ordshire|ord)|staff\s+sergeants?|officers?\s+mess)\b/giu;

// Short titles spelled out letter by letter ("M o d", "M.o.d"), audit 51 #3.
const SHORT_TITLES = new Set(["mod", "mods", "admin", "admins", "staf", "cierk", "coti"].map((t) => foldTitle(t).trim()));

// Names the site itself might use for notices, matched as the whole name (audit 52 D2).
const SYSTEM_NAMES = new Set(["system", "notifications", "notification", "announcements", "announcement", "the system", "court notices", "news", "bot", "court bot", "server", "root"].map((t) => foldTitle(t)));

export function hasCourtTitle(name: string): boolean {
  // Everyday words containing a title ("Staff Sergeant", "Badminton") are set aside first (audit 54 D4).
  const folded = foldTitle(foldFullWidth(name).replace(NOT_A_TITLE, " "));
  if (SYSTEM_NAMES.has(folded)) return true;
  // Verification ticks ("Verified ✔", "✔ Official") and the site's name misspelled around
  // "internet" ("Kourt of the Internet", "Court ov da Internet"), audit 53 #3.
  if (/[\u2713\u2714\u2611\u2705\u{1F5F8}]/u.test(name)) return true;
  const letters = folded.replace(/[^\p{L}]+/gu, "");
  if (letters.includes("internet") && /[ck]o?u?r+t/.test(letters.replace("internet", " "))) return true;
  if (COURT_TITLES.some((title) => folded.includes(title))) return true;
  if (SHORT_TITLES.has(folded.replace(/[^\p{L}]+/gu, "").replace(/\d+$/, ""))) return true;
  // Split camel case before folding ("ModeratorBob"), drop harmless words, then squash to letters.
  const spaced = foldFullWidth(name).replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2").replace(NOT_A_TITLE, " ");
  const squashed = foldTitle(spaced).replace(/[^\p{L}]+/gu, "");
  return TITLE_STEMS.some((stem) => squashed.includes(stem));
}
/**
 * A bio that claims to speak for the court ("Official court moderator here", "Head of
 * Moderation", "I'm an admin, appeal your ban with me"), audit 49 D3. Narrower than the name check,
 * since bios are free text ("I work in admin", "everything in moderation" are fine).
 */
const BIO_IMPERSONATION = [
  /(?<!\bnot\s+(?:a|an|the|your)\s+)\b(?:official|real|actual|verified)\s+(?:court\s+)?(?:moderator|mod|admin(?:istrator)?|clerk|staff|officer|judge|bailiff)\b/iu,
  /\bcourt\s+(?:moderator|mod|admin(?:istrator)?|clerk|staff|official|officer)\b/iu,
  /\b(?:head|chief|lead|senior)\s+(?:of\s+)?(?:moderation|moderator|mod|admin(?:istrator)?|clerk|staff)\b/iu,
  /\b(?:i\s*(?:'m|am)|we\s*(?:'re|are))\s+(?:a|an|the|your)?\s*(?:moderator|mod|admin(?:istrator)?|clerk|officer\s+of\s+the\s+court|bailiff|presiding\s+judge)s?\b/iu,
  /\b(?:moderator|mod|admin|clerk)\s+here\b/iu,
  /\bpresiding\s+judge\b|\bofficer\s+of\s+the\s+court\b|\bspeak\s+for\s+the\s+(?:bench|court)\b/iu,
  /\bappeal\s+(?:your|a|the)\s+(?:ban|contempt|verdict)\b/iu,
  // Audit 51 #2: "I'm on the mod team", "admin of this site", "Court of the Internet staff", "I can unban you".
  /\b(?:on|in|with|from|part\s+of|member\s+of)\s+the\s+(?:mod(?:eration)?|admin|staff|support|safety|trust\s+(?:and|&)\s+safety|court)\s+team\b/iu,
  /\b(?:admin(?:istrator)?|moderator|mod|owner|staff|official\s+account)\s+(?:of|for|at|on)\s+(?:this|the)\s+(?:site|court|app|game|website)\b/iu,
  /\b(?:court\s+of\s+the\s+internet|coti)(?:'s)?\s+(?:staff|team|admin|support|official|moderator|mod|account|owner|trust)\b|\bofficial\s+(?:court\s+)?account\b/iu,
  /\b(?:i\s*(?:'ll|will|can)|let\s+me)\s+(?:get\s+you\s+)?(?:unban|un-ban|pardon|restore|reinstate)\s+(?:you|your)\b|\bget\s+(?:you\s+)?unbanned\b|\bremove\s+your\s+(?:ban|case|contempt)\b/iu,
  // Audit 52 D2: "Staff member. Ask me to reverse any verdict.", "I handle bans and appeals here".
  /\bstaff\s+member\b|\b(?:reverse|overturn|undo|change|fix)\s+(?:any|your|a|the)\s+(?:verdict|ban|sentence|ruling)s?\b/iu,
  /\bi\s+(?:handle|deal\s+with|process|review|run|manage|decide)\s+(?:the\s+|all\s+)?(?:bans|appeals|reports|moderation|verdicts|contempt)\b/iu,
  // Audit 53 #4: "your friendly neighbourhood clerk", "one of the clerks", "appointed by Judge …",
  // "DMs open for appeals", "I can get your case restored".
  /\b(?:your|the)\s+(?:(?:friendly|local|neighbou?rhood|resident|favou?rite|trusty|humble)\s+){1,3}(?:clerk|moderator|mod|admin|bailiff|judge|officer)\b/iu,
  /\bone\s+of\s+the\s+(?:clerks|moderators|mods|admins|judges|bailiffs|officers)\b/iu,
  /\b(?:officially\s+)?appointed\s+by\s+(?:the\s+)?(?:judge|court|bench|presiding|admin|administrator|moderators?|clerks?|staff)\b/iu,
  /\b(?:dms?|messages?|inbox|pms?)\s+(?:are\s+|is\s+)?open\s+for\s+(?:appeals|unbans|bans|reports|pardons)\b/iu,
  // Audit 58 D4: "part of the moderation crew", "reports go through me", "I can get your sealed case back".
  /\b(?:part\s+of|on|in|with)\s+the\s+(?:moderation|mod|admin|clerks?'?|court)\s+(?:crew|squad|team|staff|desk|office)\b/iu,
  // Audit 59 D3: a bare staff title up front ("Mod. DM for appeals", "Moderator since 2019"),
  // "I moderate this court", "clerk of this court", "I handle them", "head of trust and safety",
  // "the judge's deputy".
  /^\W*(?:mod|mods|moderator|admin|administrator|clerk|bailiff)\b(?=\s*(?:[.,!:;|\-–—]|$|here\b|on\s+duty\b))/iu,
  /\b(?:mod|moderator|admin|clerk|bailiff|staff|officer)\s+(?:since|for)\s+(?:\d{4}|\w+\s+years?)\b/iu,
  /\bi\s+(?:moderate|run|police|manage|oversee)\s+(?:this|the)\s+(?:court|site|app|game|website|place)\b/iu,
  /\b(?:clerk|moderator|mod|admin|bailiff|officer|staff)\s+(?:of|for|at)\s+(?:this|the)\s+(?:court|site|app|game|website)\b/iu,
  /\b(?:dms?|message|pm)\s+(?:me\s+)?(?:for|about|with)\s+(?:appeals|unbans|bans|reports|pardons)\b/iu,
  /\b(?:send|give|forward)\s+(?:them|reports?|appeals?|those)\s+to\s+me\b|\bi\s+handle\s+(?:them|it|those|reports|appeals|bans)\b/iu,
  /\b(?:head|lead|chief|member|part)\s+of\s+(?:the\s+)?trust\s*(?:and|&)\s*safety\b|\btrust\s*(?:and|&)\s*safety\s+(?:team|lead|head|officer)\b/iu,
  /\b(?:judge|clerk|court|bailiff|moderator)'?s\s+(?:deputy|assistant|right[\s-]hand|second|apprentice)\b|\b(?:deputy|assistant|apprentice)\s+(?:judge|clerk|moderator|bailiff)\b/iu,
  // Audit 60 #2: "ping me if your case gets sealed, I can get it reviewed quickly".
  /\bi\s+can\s+(?:get|have)\s+(?:it|them|your\s+(?:case|ban|report|appeal|account))\s+(?:reviewed|looked\s+at|fast[\s-]?tracked|prioriti[sz]ed|escalated|unsealed|restored|reinstated)\b/iu,
  /\b(?:ping|dm|message|pm|contact|tell)\s+me\s+if\s+(?:your|you\s+get)\s+(?:case\s+)?(?:gets?\s+)?(?:sealed|banned|struck|removed|held\s+in\s+contempt|reported)\b/iu,
  /\b(?:reports?|appeals?|bans?|unbans?|verdicts?)\s+(?:go|goes|come|comes|run|runs)\s+(?:through|past|via)\s+me\b/iu,
  /\b(?:get|bring)\s+(?:your|a)\s+(?:sealed|banned|removed|struck|deleted)\s+(?:case|account|argument|profile)\s+back\b/iu,
  /\b(?:get|have)\s+(?:your|a)\s+(?:case|ban|verdict|contempt|sentence)\s+(?:restored|unsealed|lifted|overturned|reversed|removed|cleared)\b/iu,
  // Audit 55 D2: announcements accounts, "in charge of bans", notices from the court, "verify your account".
  /\b(?:official\s+)?(?:court\s+of\s+the\s+internet\s+|court\s+|site\s+)?announcements?\s+(?:account|channel|page)\b/iu,
  /\bin\s+charge\s+of\s+(?:bans|banning|reports|moderation|the\s+court|appeals|verdicts|contempt|unbans)\b/iu,
  // Audit 56 D3: "I run the report queue", "I'll personally make sure it gets sealed".
  /\bi\s+(?:run|manage|handle|own|control|watch|check)\s+(?:the\s+)?(?:report|moderation|ban|appeals?|review)s?\s+(?:queue|desk|team|system|inbox)\b/iu,
  /\bi\s*(?:'ll|will|can)\s+(?:personally\s+)?(?:make\s+sure|ensure|see\s+to\s+it|guarantee)\b.{0,40}\b(?:sealed|banned|removed|struck|unsealed|restored|overturned|held\s+in\s+contempt)\b/iu,
  /\bnotice\s+from\s+(?:the\s+)?(?:judge|court|clerks?|admin|moderat|bench|bailiff|staff)/iu,
  /\b(?:must|need\s+to|should|have\s+to)\s+verify\s+(?:your|their|all)\s+accounts?\b|\bverify\s+your\s+accounts?\s+(?:at|on|via|with|here)\b/iu,
  /\b(?:held\s+in\s+contempt|banned|suspended)\b.{0,40}\b(?:dm|pm|message|contact|ping|write\s+to)\s+me\b|\b(?:dm|pm|message|contact|ping)\s+me\b.{0,40}\b(?:held\s+in\s+contempt|banned|unban|appeal)/iu,
];
export function bioImpersonatesStaff(bio: string): boolean {
  const text = skeleton(foldFullWidth(bio)).normalize("NFKD").replace(/\p{M}/gu, "");
  return BIO_IMPERSONATION.some((re) => re.test(text));
}

/** The presiding judge's own titles: a moderator may carry clerk titles, but not these (audit 47 D2). */
const ADMIN_TITLES = ["presiding", "presiding judge", "chief justice", "chief judge", "head judge", "lord justice", "the judge", "your honour", "your honor", "his honour", "his honor", "her honour", "her honor", "their honour", "their honor", "administrator"].map(foldTitle);
export function hasAdminTitle(name: string): boolean {
  const folded = foldTitle(name);
  if (ADMIN_TITLES.some((title) => folded.includes(title))) return true;
  // "Head Admin Pemberton", "Chief Admin", "SiteAdmin" (audit 50 D1): "admin" is the judge's role.
  const spaced = foldFullWidth(name).replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2").replace(NOT_A_TITLE, " ");
  return foldTitle(spaced).replace(/[^\p{L}]+/gu, "").includes(foldTitle("admin").trim());
}

/** A bio claiming the presiding judge's role ("I am the presiding judge and site administrator"). */
const BIO_ADMIN_CLAIM = [
  // Audit 57 #2: "Admin", "Admin of this site, I can unban you", "owner of this site", "official account".
  /^\s*(?:the\s+)?admin(?:istrator)?\s*[.!]?\s*$/iu,
  /\b(?:admin(?:istrator)?|owner|official\s+account)\s+(?:of|for)\s+(?:this|the)\s+(?:site|court|app|game|website)\b/iu,
  /\bofficial\s+(?:court\s+)?account\b|\bi\s*(?:'m|am)\s+the\s+owner\b/iu,
  /\bpresiding\s+judge\b|\bchief\s+justice\b|\byour\s+hono(?:u)?r\b/iu,
  /\b(?:site|head|chief|the|an?|main)\s+admin(?:istrator)?\b/iu,
  /\b(?:i\s*(?:'m|am)|we\s*(?:'re|are))\s+(?:the\s+|an?\s+)?admin(?:istrator)?s?\b/iu,
  /\bappeal\s+(?:your|a|the)\s+(?:ban|contempt|verdict)\b/iu,
];
export function bioClaimsAdmin(bio: string): boolean {
  const text = skeleton(foldFullWidth(bio)).normalize("NFKD").replace(/\p{M}/gu, "");
  return BIO_ADMIN_CLAIM.some((re) => re.test(text));
}

/**
 * Names posing as the site itself, the system or a deleted account: refused for everyone,
 * officers and the presiding judge included (audit 57 #2). Officers may carry court titles, but
 * not "Court of the Internet", "System", "Trust and Safety", "Deleted User" or a verification tick.
 */
const SITE_TITLES = ["court of the internet", "coti", "trust and safety", "trust safety", "site owner", "site official", "official support", "official account", "support team", "helpdesk", "help desk", "deleted user", "deleted", "verified"].map(foldTitle);
const SITE_STEMS = ["courtoftheinternet", "courtinternet", "internetcourt", "internetscourt", "cotiteam", "cotiofficial", "cotistaff", "cotisupport", "cotiadmin", "trustandsafety", "siteowner"].map((t) => foldTitle(t).replace(/[^\p{L}]+/gu, ""));
export function posesAsSite(name: string): boolean {
  const folded = foldTitle(name);
  if (SYSTEM_NAMES.has(folded) || SITE_TITLES.some((t) => folded.includes(t))) return true;
  if (/[\u2713\u2714\u2611\u2705\u{1F5F8}]/u.test(name)) return true;
  const letters = folded.replace(/[^\p{L}]+/gu, "");
  if (SITE_STEMS.some((t) => letters.includes(t))) return true;
  return letters.includes("internet") && /[ck]o?u?r+t/.test(letters.replace("internet", " "));
}

export const COURT_TITLE_MESSAGE = "That name is reserved: it reads as a court title, the site itself or a system account (like \"Deleted User\"). Pick your own name.";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(LIMITS.username.min, `Username must be at least ${LIMITS.username.min} characters.`)
  .max(LIMITS.username.max, `Username must be at most ${LIMITS.username.max} characters.`)
  .regex(/^[a-z0-9_]+$/, "Use only letters, numbers and underscores.")
  // `deleted_*` is how deleted accounts are renamed: reserving it keeps deletion collision-free and
  // stops anyone posing as a former citizen.
  .refine((u) => !/^(admin|moderator|mod|judge|court|system|anonymous|deleted|null|undefined)$|^deleted_/.test(u), {
    message: "That username is reserved by the court.",
  })
  // Usernames show as @handles on cards, so they can't pass for an anonymous alias either
  // ("anon_pigeon", "sneaky_otter"), audit 56 D5.
  .refine(
    (u) =>
      !/^anon(?:ymous)?(?:_|$)/.test(u) &&
      !new RegExp(`^(?:${ADJECTIVES.join("|")})_?(?:${CRITTERS.join("|")})(?:_?[0-9a-f]{0,6})?$`, "i").test(u),
    { message: "That's what anonymous confessors are called. Pick something else." },
  );

// The most common passwords (and their obvious shapes) are refused outright: with a public site,
// they're the first ones any guesser tries (audit 65 #3). Not a full breach list, which would need
// a large download or an external service; see README → Known limitations.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "password1234", "passw0rd", "p@ssword", "p@ssw0rd", "letmein1", "letmein123",
  "12345678", "123456789", "1234567890", "12345678910", "123123123", "11111111", "00000000", "87654321", "11223344", "12341234",
  "qwertyui", "qwertyuiop", "qwerty123", "qwerty12", "1q2w3e4r", "1q2w3e4r5t", "asdfghjk", "asdfghjkl", "zxcvbnm1", "abcd1234",
  "abc12345", "abcdefgh", "iloveyou", "iloveyou1", "sunshine", "sunshine1", "princess", "football", "football1", "baseball",
  "welcome1", "welcome123", "monkey123", "dragon123", "superman", "trustno1", "whatever", "starwars", "computer", "michelle",
  "jennifer", "shadow12", "master12", "admin123", "administrator", "changeme", "changeme1", "default1", "secret123", "loveyou1",
  "court123", "internet", "courtoftheinternet", "objection", "guilty123", "notguilty",
]);
// Words that, dressed up with a digit, symbol or capital ("Dragon12", "letmein!!", "Passw0rd!"),
// are still among the first guesses (audit 70 D5).
const COMMON_BASES = new Set([
  "password", "passwd", "letmein", "welcome", "dragon", "monkey", "shadow", "master", "football", "baseball", "soccer",
  "sunshine", "princess", "iloveyou", "qwerty", "qwertyuiop", "admin", "login", "hello", "freedom", "whatever", "trustno",
  "superman", "batman", "starwars", "secret", "changeme", "abc", "abcdef", "court", "internet", "objection", "guilty",
]);
const LEET: Record<string, string> = { "0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };
export function isWeakPassword(password: string): boolean {
  const p = password.toLowerCase();
  if (COMMON_PASSWORDS.has(p)) return true;
  // Strip a decoration of digits/symbols from either end, then undo leetspeak.
  const core = p.replace(/^[^a-z]+(?=[a-z])/, "").replace(/(?<=[a-z0-9])[^a-z]+$/, "");
  const decoded = p.replace(/[013457@$!]/g, (ch) => LEET[ch] ?? ch).replace(/[^a-z]+$/, "");
  for (const c of [core, decoded, decoded.replace(/^[^a-z]+/, "")]) {
    if (COMMON_PASSWORDS.has(c) || COMMON_BASES.has(c)) return true;
  }
  // One character repeated with a single extra character tacked on ("11111111a").
  if (/^(.)\1{5,}.?$/.test(p) || /^.?(.)\1{5,}$/.test(p)) return true;
  if (/^(.)\1+$/.test(p)) return true; // "aaaaaaaa"
  // One short chunk repeated ("abcabcabc", "12121212").
  if (/^(.{1,4})\1{2,}$/.test(p)) return true;
  // A straight run up or down the alphabet or digits ("abcdefgh", "98765432").
  const codes = [...p].map((c) => c.charCodeAt(0));
  const step = codes[1] - codes[0];
  return Math.abs(step) === 1 && codes.every((c, k) => k === 0 || c - codes[k - 1] === step);
}

export const passwordSchema = z
  .string()
  .min(LIMITS.password.min, `Password must be at least ${LIMITS.password.min} characters.`)
  .max(LIMITS.password.max, "Password is too long.")
  .refine((p) => !isWeakPassword(p), "That password is one of the first any guesser tries. Pick something less common (a short phrase works well).");

export const signupSchema = z
  .object({
    username: usernameSchema,
    displayName: displayNameField,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptRules: checkbox.refine((v) => v, { message: "You must accept the community rules." }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const loginSchema = z.object({
  // Bounded like real usernames/passwords: also keeps rate-limit keys small.
  username: z.string().trim().toLowerCase().min(1, "Enter your username.").max(40, "Unknown username or wrong password."),
  password: z.string().min(1, "Enter your password.").max(200, "Unknown username or wrong password."),
});

export const profileSchema = z.object({
  displayName: displayNameField,
  bio: text({ max: LIMITS.bio.max, label: "Bio" }),
  avatar: avatarSchema,
  profileTheme: z.string().min(1).max(40),
  featuredBadge: z
    .string()
    .max(60)
    .optional()
    .transform((s) => (s ? s : null)),
});

export const preferencesSchema = z.object({
  reducedMotion: checkbox,
  allowFeaturing: checkbox,
  mutedCategories: z.array(z.enum(CATEGORY_KEYS)).max(CATEGORY_KEYS.length),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const REPORT_REASONS = [
  { value: "PERSONAL_INFO", label: "Personal information / doxxing" },
  { value: "REAL_PERSON", label: "Serious accusation against a real person" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "HATE", label: "Hate speech" },
  { value: "VIOLENCE", label: "Threats or violence" },
  { value: "SEXUAL", label: "Sexual content" },
  { value: "ILLEGAL", label: "Illegal content" },
  { value: "SPAM", label: "Spam" },
  { value: "OTHER", label: "Something else" },
] as const;

export const reportSchema = z.object({
  caseId: z.string().min(1).max(40),
  target: z.enum(["CASE", "DEFENSE", "PROSECUTION"]).default("CASE"),
  reason: z.enum(REPORT_REASONS.map((r) => r.value) as [string, ...string[]], {
    error: "Pick a reason for the report.",
  }),
  details: text({ max: LIMITS.reportDetails.max, label: "Details" })
    .optional()
    .transform((s) => (s ? s : undefined)),
});

export type FieldErrors = Record<string, string[] | undefined>;

// Zod's built-in messages ("Invalid option: expected one of …", "Too big: …") only reach players
// through hand-crafted requests, since every real field has its own wording. Keep them human.
const ZOD_DEFAULT = /^(?:Invalid (?:input|option|type|value|enum|string|key|union|element)|Too (?:big|small)|Expected |Required$|Unrecognized)/;
const GENERIC_FIELD_ERROR = "That value isn't valid. Reload the page and try again.";

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    const message = ZOD_DEFAULT.test(issue.message) ? GENERIC_FIELD_ERROR : issue.message;
    const list = (out[key] ??= []);
    if (!list.includes(message)) list.push(message); // two rules can share a message
  }
  return out;
}
