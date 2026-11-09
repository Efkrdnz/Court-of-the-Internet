import { z } from "zod";
import { CATEGORY_KEYS } from "./categories";
import { LIMITS } from "./limits";
import { charCount, normalizeText } from "./text";
import { avatarSchema } from "./avatar";
import { CRITTERS } from "./alias";

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
  title: text({ ...LIMITS.title, label: "Case title", multiline: false }),
  category: z.enum(CATEGORY_KEYS, { error: "Pick a category for your crime." }),
  confession: text({ ...LIMITS.confession, label: "Confession" }),
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
  // The court's own titles for staff.
  .refine((s) => !/^\s*(?:presiding\s+judge|court\s+clerk|the\s+court|the\s+clerks?|the\s+judge|the\s+bailiff|(?:your|his|her|their)\s+hono(?:u)?r|officer\s+of\s+the\s+court|moderator|mod|administrator|admin)\b/i.test(s.normalize("NFKC")), {
    message: "That's an official title of the court. Pick your own name.",
  });

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
    (out[key] ??= []).push(ZOD_DEFAULT.test(issue.message) ? GENERIC_FIELD_ERROR : issue.message);
  }
  return out;
}
