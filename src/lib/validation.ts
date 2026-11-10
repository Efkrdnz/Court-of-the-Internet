import { z } from "zod";
import { CATEGORY_KEYS } from "./categories";
import { LIMITS } from "./limits";
import { charCount, normalizeText } from "./text";
import { avatarSchema } from "./avatar";
import { ADJECTIVES, CRITTERS } from "./alias";
import { skeleton } from "./confusables";

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
  }),
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
  .refine((s) => !new RegExp(`\\b(?:${CRITTERS.join("|")})\\W*[0-9a-f]{4}\\W*$`, "iu").test(s.normalize("NFKC")), {
    message: "Names with a #tag look like an anonymous alias. Pick something else.",
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
].map(foldTitle);

// Distinctive stems also caught inside joined, numbered or split-up names ("ModeratorBob",
// "moderator9", "siteadmin", "Ad-min", "C l e r k", "Head of Moderation"), audit 46 D1. Everyday
// words that happen to contain one are removed first.
const TITLE_STEMS = ["moderator", "moderation", "admin", "clerk", "bailiff", "sysop", "officer", "yourhonour", "yourhonor", "courtstaff"].map((t) => foldTitle(t).trim());
const NOT_A_TITLE = /\b(?:badminton\w*|administ(?:er|ers|ered|ering|rative)|clerkenwell|staff(?:ie|ies|y|ordshire|ord)|officers?\s+mess)\b/giu;

export function hasCourtTitle(name: string): boolean {
  const folded = foldTitle(name);
  if (COURT_TITLES.some((title) => folded.includes(title))) return true;
  // Split camel case before folding ("ModeratorBob"), drop harmless words, then squash to letters.
  const spaced = foldFullWidth(name).replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2").replace(NOT_A_TITLE, " ");
  const squashed = foldTitle(spaced).replace(/[^\p{L}]+/gu, "");
  return TITLE_STEMS.some((stem) => squashed.includes(stem));
}
export const COURT_TITLE_MESSAGE = "That's an official title of the court. Pick your own name.";

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
  });

export const passwordSchema = z
  .string()
  .min(LIMITS.password.min, `Password must be at least ${LIMITS.password.min} characters.`)
  .max(LIMITS.password.max, "Password is too long.");

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
