"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { changePasswordSchema, preferencesSchema, profileSchema } from "@/lib/validation";
import { clearSessionCookie, getSessionToken, requireActiveUser, getCurrentUser } from "@/server/auth/current-user";
import { changePassword, deleteAccount, updatePreferences, updateProfile } from "@/server/services/accounts";
import { enforceRateLimit } from "@/server/rate-limit";
import { screenText } from "@/lib/content-filter";
import { CourtError } from "@/server/errors";
import { toFailure, type ActionResult } from "./_util";

export async function updateProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireActiveUser();
    await enforceRateLimit(`profile:${user.id}`, 20, 600);
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
    await updateProfile(user.id, input);
    refresh();
    return { ok: true, message: "Profile updated. Looking sharp, counselor." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function updatePreferencesAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireActiveUser();
    const input = preferencesSchema.parse({
      reducedMotion: formData.get("reducedMotion"),
      allowFeaturing: formData.get("allowFeaturing"),
      mutedCategories: formData.getAll("mutedCategories").map(String),
    });
    await updatePreferences(user.id, input);
    refresh();
    return { ok: true, message: "Preferences saved." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function changePasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new CourtError("UNAUTHENTICATED", "Please sign in again.");
    await enforceRateLimit(`password:${user.id}`, 5, 900);
    const input = changePasswordSchema.parse(Object.fromEntries(formData.entries()));
    await changePassword(user.id, input.currentPassword, input.newPassword, await getSessionToken());
    return { ok: true, message: "Password changed. Other devices have been signed out." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function deleteAccountAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
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
