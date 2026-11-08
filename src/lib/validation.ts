import { z } from "zod";
import { CATEGORY_KEYS } from "./categories";
import { LIMITS } from "./limits";
import { charCount, normalizeText } from "./text";
import { avatarSchema } from "./avatar";

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

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean(), z.undefined(), z.null()])
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

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(LIMITS.username.min, `Username must be at least ${LIMITS.username.min} characters.`)
  .max(LIMITS.username.max, `Username must be at most ${LIMITS.username.max} characters.`)
  .regex(/^[a-z0-9_]+$/, "Use only letters, numbers and underscores.")
  .refine((u) => !/^(admin|moderator|mod|judge|court|system|anonymous|deleted|null|undefined)$/.test(u), {
    message: "That username is reserved by the court.",
  });

export const passwordSchema = z
  .string()
  .min(LIMITS.password.min, `Password must be at least ${LIMITS.password.min} characters.`)
  .max(LIMITS.password.max, "Password is too long.");

export const signupSchema = z
  .object({
    username: usernameSchema,
    displayName: text({ ...LIMITS.displayName, label: "Display name", multiline: false }),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptRules: checkbox.refine((v) => v, { message: "You must accept the community rules." }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});

export const profileSchema = z.object({
  displayName: text({ ...LIMITS.displayName, label: "Display name", multiline: false }),
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

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
