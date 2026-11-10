import "server-only";
import type { Prisma } from "@prisma/client";
import { db, type Tx } from "../db";
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
import { bioClaimsAdmin, bioImpersonatesStaff, COURT_TITLE_MESSAGE, hasAdminTitle, hasCourtTitle } from "@/lib/validation";
import { getAchievement } from "@/lib/achievements";
import { CATEGORY_KEYS } from "@/lib/categories";
import { clock } from "../clock";
import { skeleton } from "@/lib/confusables";
import { releaseClaims } from "./claims";
import { withdrawOpenReports } from "./reports";

/** Letters and digits only, case- and accent-folded: "Judge Wigsworth." and "Judge\u200bWigsworth" collide. */
const DIGIT_LOOKALIKES: Record<string, string> = { i: "l", "1": "l", "|": "l", "0": "o", "5": "s", "3": "e", "4": "a", "@": "a", $: "s" };
const nameKey = (name: string) =>
  // Multi-letter look-alikes first: "vv" reads as "w", "rn" as "m".
  [...skeleton(name).toLowerCase().normalize("NFKD").replace(/vv/g, "w").replace(/rn/g, "m")]
    .map((ch) => DIGIT_LOOKALIKES[ch] ?? ch)
    .join("")
    .replace(/[^\p{L}\p{N}]+/gu, "");

/** True when a and b differ by at most one insertion, deletion or substitution. */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** True when some stretch of `hay` is within one edit of `needle` ("yourhonourwiggsworth" ∋ "wigsworth"). */
function containsNearly(hay: string, needle: string): boolean {
  for (let len = needle.length - 1; len <= needle.length + 1; len++) {
    for (let start = 0; start + len <= hay.length; start++) if (withinOneEdit(hay.slice(start, start + len), needle)) return true;
  }
  return false;
}

/** Titles and filler that don't identify a particular officer. */
const TITLE_WORDS = new Set(["judge", "clerk", "the", "court", "your", "honour", "honor", "justice", "officer", "bailiff", "chief", "presiding", "moderator", "admin", "marshal", "sheriff", "sir", "lord", "lady", "madam", "mister", "dame", "citizen", "former"]);

/**
 * A player's bio naming a real officer with a claim to act for them ("Clerk Pemberton's alt",
 * "Notice from Judge Wigsworth", "Wigsworth told me I'm in charge"), audit 55 D2.
 */
const OFFICER_CLAIM = /\b(?:alt|alts|account|told\s+me|asked\s+me|sent\s+me|notice|on\s+behalf|behalf\s+of|deputy|assistant|appointed|official|speaks?\s+for|speaking\s+for|says|said|orders?|via|trusts?\s+me|works?\s+(?:closely\s+)?with|with\s+me|gavel|bans?|banning|seals?|sealing|reports?|appeals?|queue)\b/iu;
export async function assertBioDoesNotSpeakForOfficers(bio: string, selfId: string, client: Tx | typeof db = db) {
  if (!OFFICER_CLAIM.test(bio)) return;
  const staff = await client.user.findMany({
    where: { role: { in: ["ADMIN", "MODERATOR"] }, deletedAt: null, id: { not: selfId } },
    select: { displayName: true, username: true },
    take: 200,
  });
  const key = nameKey(bio);
  const named = staff.some((u) =>
    [u.displayName, u.username.replace(/_/g, " ")]
      .flatMap((n) => n.split(/[^\p{L}\p{N}]+/u))
      .filter((w) => !TITLE_WORDS.has(w.toLowerCase()))
      .map(nameKey)
      .some((w) => w.length >= 5 && key.includes(w)),
  );
  if (named) throw new CourtError("VALIDATION", "Your bio can't speak for an officer of the court.", "bio");
}

/** Whether `candidate` could pass for the officer called `staffName` (exact, contained, a typo away, or their distinctive name word). */
export function nameClashesWithOfficer(staffName: string, candidate: string): boolean {
  const key = nameKey(candidate);
  if (!key) return false;
  const staffKey = nameKey(staffName);
  if (staffKey === key || (staffKey.length >= 8 && (key.includes(staffKey) || withinOneEdit(staffKey, key)))) return true;
  return staffName
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => !TITLE_WORDS.has(word.toLowerCase()))
    .map(nameKey)
    .some((word) => word.length >= 5 && containsNearly(key, word));
}

/** Nobody (player or another officer) can take an officer of the court's display name ("Judge Wigsworth" is the real one). */
/**
 * Display names are checked against officers' names, and promotions against everyone's names: both
 * take this lock first, so a save and an appointment at the same moment can't both pass and leave a
 * player sharing a new officer's reserved name (audit 51 #1).
 */
export async function lockStaffNames(tx: Tx) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('staff-names'))`;
}

export async function assertNotStaffName(displayName: string, selfId?: string, field: "displayName" | "username" = "displayName", client: Tx | typeof db = db) {
  const staff = await client.user.findMany({
    where: { role: { in: ["ADMIN", "MODERATOR"] }, deletedAt: null, ...(selfId ? { id: { not: selfId } } : {}) },
    select: { displayName: true, username: true },
    take: 200,
  });
  const key = nameKey(displayName);
  // "Former Citizen" is what deleted accounts show as, so a live player can't wear it either.
  if (key && key === nameKey("Former Citizen")) {
    throw new CourtError("VALIDATION", "That name is reserved for retired accounts. Pick your own.", field);
  }
  // Exact matches, and names that contain a (reasonably long) officer's name: "Judge Wigsworth Jr".
  // …and near-misses one typo away ("Judge Wiggsworth").
  // The officer's own name word on its own or with another title, typo included: "Wigsworth",
  // "Your Honour Wiggsworth" (only distinctive words of 5+ letters, so "Judge" alone is fine).
  const clashes = (staffName: string) => nameClashesWithOfficer(staffName, displayName);
  if (key && staff.some((u) => clashes(u.displayName) || clashes(u.username.replace(/_/g, " ")))) {
    throw new CourtError("VALIDATION", "That name belongs to an officer of the court. Pick your own.", field);
  }
}

export async function registerUser(input: {
  username: string;
  displayName: string;
  password: string;
  avatar?: AvatarConfig;
  role?: "PLAYER" | "MODERATOR" | "ADMIN";
}) {
  // Staff titles anywhere in a player's name (officers are created with theirs).
  if ((input.role ?? "PLAYER") === "PLAYER") {
    if (hasCourtTitle(input.displayName)) throw new CourtError("VALIDATION", COURT_TITLE_MESSAGE, "displayName");
    if (hasCourtTitle(input.username)) throw new CourtError("VALIDATION", "That username uses an official title of the court. Pick your own.", "username");
  }
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.$transaction(async (tx) => {
      // Re-checked under the staff-names lock, so an appointment racing this signup is seen.
      if ((input.role ?? "PLAYER") === "PLAYER") {
        await lockStaffNames(tx);
        await assertNotStaffName(input.displayName, undefined, "displayName", tx);
        await assertNotStaffName(input.username.replace(/_/g, " "), undefined, "username", tx);
      }
      return tx.user.create({
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
  // Officers can't take another officer's name either (audit 43 #2: a moderator could become a
  // second "Judge Wigsworth"); their own name is excluded from the check.
  await assertNotStaffName(input.displayName, userId);
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
  await db.$transaction(async (tx) => {
    // The role decides which titles are allowed, so read it under the same row lock a role change
    // takes: a save racing a demotion either lands first (and the demotion resets the title) or
    // sees the new role (audit 47 D1: "Moderator Jay" outlived the demotion 1 time in 8).
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR NO KEY UPDATE`;
    await lockStaffNames(tx);
    await assertNotStaffName(input.displayName, userId, "displayName", tx);
    const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
    if (me.role === "PLAYER" && hasCourtTitle(input.displayName)) throw new CourtError("VALIDATION", COURT_TITLE_MESSAGE, "displayName");
    // …or a bio that claims to speak for the court (audit 49 D3).
    if (me.role === "PLAYER" && bioImpersonatesStaff(input.bio)) {
      throw new CourtError("VALIDATION", "Your bio can't claim to be an officer of the court or speak for it.", "bio");
    }
    if (me.role === "PLAYER") await assertBioDoesNotSpeakForOfficers(input.bio, userId, tx);
    // A moderator may wear clerk titles, but not the presiding judge's (audit 47 D2).
    if (me.role === "MODERATOR" && hasAdminTitle(input.displayName)) {
      throw new CourtError("VALIDATION", "That title belongs to the presiding judge. Pick your own.", "displayName");
    }
    if (me.role === "MODERATOR" && bioClaimsAdmin(input.bio)) {
      throw new CourtError("VALIDATION", "Your bio can't claim the presiding judge's role.", "bio");
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        displayName: input.displayName,
        bio: input.bio,
        avatar: input.avatar as Prisma.InputJsonValue,
        profileTheme: input.profileTheme,
        featuredBadge: input.featuredBadge,
      },
    });
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
    // Write the user row first: in-flight actions hold a share lock on it (assertActiveUser),
    // so this waits for them, and the claim sweep below then sees everything they did.
    const deleted = await tx.user.updateMany({
      where: { id: userId, deletedAt: null },
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
    // A second, simultaneous request finds the account already gone.
    if (deleted.count === 0) throw new CourtError("INVALID_STATE", "This account has already been deleted.");
    // Free any case they were drafting so other players aren't blocked until it expires.
    await releaseClaims(tx, { userId });
    // Their open reports stop counting toward the queue and auto-review (their votes stand).
    await withdrawOpenReports(tx, userId);
    await tx.session.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
  });
}
