import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { CourtError, isUniqueViolation } from "../errors";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../auth/password";
import { destroyAllSessions } from "../auth/sessions";
import { parseAvatar, randomAvatar, type AvatarConfig } from "@/lib/avatar";
import {
  PROFILE_THEMES,
  avatarItemKey,
  avatarItemRule,
  isUnlocked,
  themeItemKey,
  type UnlockContext,
} from "@/lib/cosmetics";
import { levelForXp } from "@/lib/progression";
import { getAchievement } from "@/lib/achievements";
import { CATEGORY_KEYS } from "@/lib/categories";
import { clock } from "../clock";
import { skeleton } from "@/lib/confusables";
import { releaseClaims } from "./claims";

/** Letters and digits only, case- and accent-folded: "Judge Wigsworth." and "Judge\u200bWigsworth" collide. */
const DIGIT_LOOKALIKES: Record<string, string> = { i: "l", "1": "l", "|": "l", "0": "o", "5": "s", "3": "e", "4": "a", "@": "a", $: "s" };
const nameKey = (name: string) =>
  [...skeleton(name).toLowerCase().normalize("NFKD")]
    .map((ch) => DIGIT_LOOKALIKES[ch] ?? ch)
    .join("")
    .replace(/[^\p{L}\p{N}]+/gu, "");

/** Players can't take an officer of the court's display name ("Judge Wigsworth" is the real one). */
export async function assertNotStaffName(displayName: string, selfId?: string) {
  const staff = await db.user.findMany({
    where: { role: { in: ["ADMIN", "MODERATOR"] }, deletedAt: null, ...(selfId ? { id: { not: selfId } } : {}) },
    select: { displayName: true },
    take: 200,
  });
  const key = nameKey(displayName);
  // "Former Citizen" is what deleted accounts show as, so a live player can't wear it either.
  if (key && key === nameKey("Former Citizen")) {
    throw new CourtError("VALIDATION", "That name is reserved for retired accounts. Pick your own.", "displayName");
  }
  // Exact matches, and names that contain a (reasonably long) officer's name: "Judge Wigsworth Jr".
  const clashes = (staffKey: string) => staffKey === key || (staffKey.length >= 8 && key.includes(staffKey));
  if (key && staff.some((u) => clashes(nameKey(u.displayName)))) {
    throw new CourtError("VALIDATION", "That name belongs to an officer of the court. Pick your own.", "displayName");
  }
}

export async function registerUser(input: {
  username: string;
  displayName: string;
  password: string;
  avatar?: AvatarConfig;
  role?: "PLAYER" | "MODERATOR" | "ADMIN";
}) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.user.create({
      data: {
        username: input.username,
        displayName: input.displayName,
        passwordHash,
        role: input.role ?? "PLAYER",
        avatar: (input.avatar ?? randomAvatar()) as Prisma.InputJsonValue,
        createdAt: clock.now(),
        stats: { create: {} },
      },
      select: { id: true, username: true },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new CourtError("CONFLICT", "That username is already taken.", "username");
    throw e;
  }
}

export async function authenticate(username: string, password: string) {
  const user = await db.user.findUnique({
    where: { username },
    select: { id: true, passwordHash: true, deletedAt: true },
  });
  if (!user || user.deletedAt) {
    await burnPasswordCheck(password);
    throw new CourtError("UNAUTHENTICATED", "Unknown username or wrong password.");
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new CourtError("UNAUTHENTICATED", "Unknown username or wrong password.");
  return { id: user.id };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, keepToken?: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new CourtError("VALIDATION", "Your current password is incorrect.", "currentPassword");
  }
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
  await destroyAllSessions(userId, keepToken);
}

export async function getUnlockContext(userId: string): Promise<UnlockContext> {
  const [user, stats, achievements, entitlements] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { membershipTier: true, membershipExpiresAt: true } }),
    db.userStats.findUnique({ where: { userId }, select: { xp: true } }),
    db.userAchievement.findMany({ where: { userId }, select: { key: true } }),
    db.entitlement.findMany({ where: { userId }, select: { itemKey: true } }),
  ]);
  const isPatron =
    user.membershipTier === "PATRON" && (!user.membershipExpiresAt || user.membershipExpiresAt > clock.now());
  return {
    level: levelForXp(stats?.xp ?? 0),
    achievements: new Set(achievements.map((a) => a.key)),
    entitlements: new Set(entitlements.map((e) => e.itemKey)),
    isPatron,
  };
}

export async function updateProfile(
  userId: string,
  input: { displayName: string; bio: string; avatar: AvatarConfig; profileTheme: string; featuredBadge: string | null },
) {
  const ctx = await getUnlockContext(userId);
  const me = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
  if (me.role === "PLAYER") await assertNotStaffName(input.displayName, userId);
  const current = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { avatar: true, profileTheme: true } });
  const wearing = parseAvatar(current.avatar);
  const theme = PROFILE_THEMES.find((t) => t.key === input.profileTheme);
  if (!theme) throw new CourtError("VALIDATION", "Unknown profile theme.", "profileTheme");
  if (theme.key !== current.profileTheme && !isUnlocked(theme.unlock, ctx, themeItemKey(theme.key))) {
    throw new CourtError("FORBIDDEN", `The “${theme.label}” theme is still locked.`, "profileTheme");
  }
  for (const kind of ["species", "headwear", "accessory", "backdrop"] as const) {
    const value = input.avatar[kind];
    const rule = avatarItemRule(kind, value);
    // Something already worn can be kept (e.g. granted by an admin, or an older starter avatar).
    if (value !== wearing[kind] && !isUnlocked(rule, ctx, avatarItemKey({ kind, value }))) {
      throw new CourtError("FORBIDDEN", `That ${kind} is still locked. Keep playing to earn it!`, "avatar");
    }
  }
  if (input.featuredBadge) {
    if (!getAchievement(input.featuredBadge) || !ctx.achievements.has(input.featuredBadge)) {
      throw new CourtError("FORBIDDEN", "You can only feature a badge you have earned.", "featuredBadge");
    }
  }
  await db.user.update({
    where: { id: userId },
    data: {
      displayName: input.displayName,
      bio: input.bio,
      avatar: input.avatar as Prisma.InputJsonValue,
      profileTheme: input.profileTheme,
      featuredBadge: input.featuredBadge,
    },
  });
}

export async function updatePreferences(
  userId: string,
  input: { reducedMotion: boolean; allowFeaturing: boolean; mutedCategories: string[] },
) {
  const muted = input.mutedCategories.filter((c) => (CATEGORY_KEYS as readonly string[]).includes(c));
  await db.user.update({
    where: { id: userId },
    data: { reducedMotion: input.reducedMotion, allowFeaturing: input.allowFeaturing, mutedCategories: muted },
  });
}

/**
 * Account deletion keeps the court record intact (cases are public history) but
 * scrubs the identity: username/display name are replaced and the user is signed out.
 */
export async function deleteAccount(userId: string, password: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new CourtError("VALIDATION", "Password is incorrect.", "password");
  }
  await db.$transaction(async (tx) => {
    // Free any case they were drafting so other players aren't blocked until it expires.
    await releaseClaims(tx, { userId });
    await tx.user.update({
      where: { id: userId },
      data: {
        // The username stays on the row (never shown: deleted players appear as "Former Citizen"),
        // so nobody can re-register it and inherit old /u/<name> links.
        displayName: "Former Citizen",
        bio: "",
        passwordHash: "deleted",
        deletedAt: clock.now(),
        featuredBadge: null,
      },
    });
    await tx.session.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
  });
}
