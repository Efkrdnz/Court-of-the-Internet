"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { changePasswordSchema, preferencesSchema, profileSchema } from "@/lib/validation";
import { clearSessionCookie, getSessionToken, requireActiveUser, getCurrentUser } from "@/server/auth/current-user";
import { changePassword, deleteAccount, updatePreferences, updateProfile } from "@/server/services/accounts";
import { enforceRateLimit, reserveAttempt } from "@/server/rate-limit";
import { screenText } from "@/lib/content-filter";
import { CourtError } from "@/server/errors";
import { assertForm, toFailure, type ActionResult } from "./_util";

export async function updateProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    assertForm(formData);
    const user = await requireActiveUser();
    const input = profileSchema.parse({
      displayName: formData.get("displayName"),
      bio: formData.get("bio") ?? "",
      profileTheme: formData.get("profileTheme"),
      featuredBadge: formData.get("featuredBadge") || undefined,
      avatar: {
        species: formData.get("species"),
        headwear: formData.get("headwear"),
        accessory: formData.get("accessory"),
        backdrop: formData.get("backdrop"),
      },
    });
    for (const [field, value] of [
      ["displayName", input.displayName],
      ["bio", input.bio],
    ] as const) {
      const screened = screenText(value, { allowSpamCheck: false });
      if (!screened.ok) throw new CourtError("CONTENT_REJECTED", screened.message!, field);
    }
    // Only saves that go through count: a save the service refuses (locked cosmetics, a court
    // title, a staff claim in the bio) gives its attempt back (audit 50 D5).
    const refund = await reserveAttempt([{ key: `profile:${user.id}`, limit: 20, windowSeconds: 600, message: "Order in the court! You're doing that too fast. Try again in a moment." }]);
    try {
      await updateProfile(user.id, input);
    } catch (e) {
      await refund();
      throw e;
    }
    refresh();
    return { ok: true, message: "Profile updated. Looking sharp, counselor." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function updatePreferencesAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    assertForm(formData);
    const user = await requireActiveUser();
    const input = preferencesSchema.parse({
      reducedMotion: formData.get("reducedMotion"),
      allowFeaturing: formData.get("allowFeaturing"),
      mutedCategories: formData.getAll("mutedCategories").map(String),
    });
    await enforceRateLimit(`preferences:${user.id}`, 30, 600);
    await updatePreferences(user.id, input);
    refresh();
    return { ok: true, message: "Preferences saved." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function changePasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    assertForm(formData);
    const user = await getCurrentUser();
    if (!user) throw new CourtError("UNAUTHENTICATED", "Please sign in again.");
    const input = changePasswordSchema.parse(Object.fromEntries(formData.entries()));
    // After validation (a mistyped confirmation shouldn't count), before the password check.
    // Only wrong current passwords count, and the message says how long the pause is (audit 68 #3).
    const refund = await reserveAttempt([
      { key: `password:${user.id}`, limit: 5, windowSeconds: 900, message: "Too many wrong current passwords. For your account's safety, password changes are paused for 15 minutes." },
    ]);
    await changePassword(user.id, input.currentPassword, input.newPassword, await getSessionToken());
    await refund();
    return { ok: true, message: "Password changed. Other devices have been signed out." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function deleteAccountAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    assertForm(formData);
    const user = await getCurrentUser();
    if (!user) throw new CourtError("UNAUTHENTICATED", "Please sign in again.");
    await enforceRateLimit(`delete:${user.id}`, 5, 900);
    if (formData.get("confirm") !== "DELETE") throw new CourtError("VALIDATION", "Type DELETE to confirm.", "confirm");
    await deleteAccount(user.id, String(formData.get("password") ?? ""));
    await clearSessionCookie();
  } catch (e) {
    return toFailure(e);
  }
  redirect("/?farewell=1");
}
