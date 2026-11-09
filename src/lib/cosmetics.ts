/**
 * Cosmetic catalog. Cosmetics are purely visual. Nothing here may ever influence
 * claims, votes, verdicts, XP or rankings (enforced by keeping the gameplay services
 * free of any import from this module).
 *
 * Unlock rules:
 *  - free:               everyone
 *  - level:N             reach level N
 *  - achievement:KEY     earn that achievement
 *  - premium             Patron membership or an explicit entitlement (not on sale yet)
 */
import type { Accessory, Backdrop, Headwear, Species } from "./avatar";

export type UnlockRule = "free" | `level:${number}` | `achievement:${string}` | "premium";

export interface ProfileTheme {
  key: string;
  label: string;
  description: string;
  unlock: UnlockRule;
  /** CSS custom properties applied to the profile page. */
  vars: { bg: string; panel: string; ink: string; accent: string; accent2: string; pattern: "damask" | "pinstripe" | "dots" | "none" | "stars" };
}

export const PROFILE_THEMES: ProfileTheme[] = [
  {
    key: "mahogany",
    label: "Mahogany Chambers",
    description: "Classic burgundy and gold. Smells faintly of old books.",
    unlock: "free",
    vars: { bg: "#2a0a12", panel: "#4a0f1e", ink: "#f6ecd6", accent: "#c9a227", accent2: "#8c1d2f", pattern: "damask" },
  },
  {
    key: "parchment",
    label: "Parchment Docket",
    description: "Ivory pages and ink stains, for the bookish litigator.",
    unlock: "free",
    vars: { bg: "#e9dcbc", panel: "#f6eedb", ink: "#2a1c16", accent: "#7a1424", accent2: "#a07c22", pattern: "pinstripe" },
  },
  {
    key: "midnight",
    label: "Midnight Recess",
    description: "Charcoal and moonlight. Court is in session at 3am.",
    unlock: "free",
    vars: { bg: "#121014", panel: "#1f1a20", ink: "#ece3cf", accent: "#8fb8ad", accent2: "#c9a227", pattern: "dots" },
  },
  {
    key: "gilded",
    label: "Gilded Gavel",
    description: "Unlocked at level 5. Gold leaf on everything, including the stapler.",
    unlock: "level:5",
    vars: { bg: "#1a1206", panel: "#2e2210", ink: "#fbefc8", accent: "#f0c94a", accent2: "#b8862b", pattern: "damask" },
  },
  {
    key: "evidence-locker",
    label: "Evidence Locker",
    description: "Unlocked by Certified Menace. Tape, labels, and suspicion.",
    unlock: "achievement:certified-menace",
    vars: { bg: "#1d2418", panel: "#2a3322", ink: "#efe8c9", accent: "#e8d14a", accent2: "#b3202a", pattern: "pinstripe" },
  },
  {
    key: "velvet-rope",
    label: "Velvet Rope",
    description: "Patron perk. Plum velvet and starlight for the VIP gallery.",
    unlock: "premium",
    vars: { bg: "#1e0d24", panel: "#341640", ink: "#f4e6f7", accent: "#e8c766", accent2: "#b05bd0", pattern: "stars" },
  },
];

export interface AvatarItem {
  kind: "species" | "headwear" | "accessory" | "backdrop";
  value: Species | Headwear | Accessory | Backdrop;
  unlock: UnlockRule;
}

/** Only items that are *not* free are listed; everything else is free. */
export const LOCKED_AVATAR_ITEMS: AvatarItem[] = [
  { kind: "headwear", value: "judge-wig", unlock: "level:3" },
  { kind: "headwear", value: "detective", unlock: "achievement:first-conviction" },
  { kind: "headwear", value: "party-hat", unlock: "achievement:justice-served" },
  { kind: "headwear", value: "crown", unlock: "premium" },
  { kind: "accessory", value: "sunglasses", unlock: "achievement:certified-menace" },
  { kind: "accessory", value: "mustache", unlock: "level:4" },
  { kind: "species", value: "goose", unlock: "achievement:professional-liar" },
  { kind: "backdrop", value: "plum", unlock: "premium" },
];

export interface UnlockContext {
  level: number;
  achievements: ReadonlySet<string>;
  entitlements: ReadonlySet<string>;
  isPatron: boolean;
}

export function isUnlocked(rule: UnlockRule, ctx: UnlockContext, itemKey?: string): boolean {
  if (itemKey && ctx.entitlements.has(itemKey)) return true;
  if (rule === "free") return true;
  if (rule === "premium") return ctx.isPatron;
  if (rule.startsWith("level:")) return ctx.level >= Number(rule.slice(6));
  if (rule.startsWith("achievement:")) return ctx.achievements.has(rule.slice(12));
  return false;
}

export function avatarItemKey(item: Pick<AvatarItem, "kind" | "value">): string {
  return `avatar:${item.kind}:${item.value}`;
}

/** Human name for an entitlement key: "theme:gilded" → "Gilded … (profile theme)", "avatar:headwear:judge-wig" → "Judge wig (headwear)". */
export function cosmeticLabel(itemKey: string): string {
  const [kind, a, b] = itemKey.split(":");
  if (kind === "theme") return `${PROFILE_THEMES.find((t) => t.key === a)?.label ?? a} (profile theme)`;
  if (kind === "avatar" && a && b) {
    const name = b.replace(/-/g, " ");
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} (${a})`;
  }
  return itemKey;
}

export function themeItemKey(themeKey: string): string {
  return `theme:${themeKey}`;
}

export function avatarItemRule(kind: AvatarItem["kind"], value: string): UnlockRule {
  return LOCKED_AVATAR_ITEMS.find((i) => i.kind === kind && i.value === value)?.unlock ?? "free";
}

export function getTheme(key: string | null | undefined): ProfileTheme {
  return PROFILE_THEMES.find((t) => t.key === key) ?? PROFILE_THEMES[0];
}

export function describeUnlock(rule: UnlockRule, achievementName?: (key: string) => string): string {
  if (rule === "free") return "Free";
  if (rule === "premium") return "Patron perk (not on sale yet)";
  if (rule.startsWith("level:")) return `Reach level ${rule.slice(6)}`;
  const key = rule.slice(12);
  return `Earn “${achievementName ? achievementName(key) : key}”`;
}
