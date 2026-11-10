"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { changePasswordAction, deleteAccountAction, updatePreferencesAction, updateProfileAction } from "@/app/actions/settings";
import { clearDrafts, restoreDrafts, snapshotDrafts } from "@/components/ui/clearDrafts";
import type { ActionResult } from "@/app/actions/_util";
import { useFormAction } from "@/components/ui/useFormAction";
import { ACCESSORIES, BACKDROPS, HEADWEAR, SPECIES, type AvatarConfig } from "@/lib/avatar";
import { CATEGORIES } from "@/lib/categories";
import { LIMITS } from "@/lib/limits";
import { Avatar } from "@/components/art/avatar";
import { CategoryIcon, IconLock } from "@/components/art/props";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError, FormAlert } from "@/components/ui/FormAlert";

function Result({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  // Field-level errors are already shown next to their inputs.
  if (!state.ok && state.fieldErrors && Object.keys(state.fieldErrors).length) return null;
  return state.ok ? (
    <FormAlert kind="success" className="!text-teal">
      {state.message}
    </FormAlert>
  ) : (
    <FormAlert className="!text-crimson">{state.error}</FormAlert>
  );
}

const LABELS: Record<string, string> = {
  none: "None",
  "barrister-wig": "Barrister wig",
  "judge-wig": "Judge's wig",
  bowler: "Bowler",
  beret: "Beret",
  crown: "Crown",
  "party-hat": "Party hat",
  detective: "Deerstalker",
  monocle: "Monocle",
  sunglasses: "Sunglasses",
  bowtie: "Bow tie",
  mustache: "Mustache",
  "reading-glasses": "Reading glasses",
};
const label = (v: string) => LABELS[v] ?? v.charAt(0).toUpperCase() + v.slice(1);

export interface LockInfo {
  /** e.g. "headwear:crown" → human-readable unlock requirement */
  [key: string]: string;
}

export function ProfileForm({
  initial,
  themes,
  badges,
  locks,
}: {
  initial: { displayName: string; bio: string; avatar: AvatarConfig; profileTheme: string; featuredBadge: string | null };
  themes: { key: string; label: string; description: string; locked: string | null; swatch: [string, string, string] }[];
  badges: { key: string; name: string }[];
  locks: LockInfo;
}) {
  const [state, formProps, pending] = useFormAction(updateProfileAction);
  const [avatar, setAvatar] = useState<AvatarConfig>(initial.avatar);
  const [theme, setTheme] = useState(initial.profileTheme);
  // Phones can't hover, so tapping a locked item spells out how to unlock it.
  const [lockHint, setLockHint] = useState<string | null>(null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  const group = <K extends keyof AvatarConfig>(kind: K, options: readonly AvatarConfig[K][], title: string) => (
    <fieldset>
      <legend className="field-label">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          // An item the player already wears stays selectable, even if it's locked for them.
          const lock = initial.avatar[kind] === opt ? null : locks[`${kind}:${opt}`];
          const on = avatar[kind] === opt;
          return (
            <label
              key={opt}
              title={lock ?? undefined}
              onClick={lock ? () => setLockHint(`${label(opt)}: ${lock}`) : undefined}
              className={clsx(
                "relative inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                on ? "border-burgundy bg-burgundy text-ivory" : "border-sepia/40 bg-white/40 text-ink hover:bg-white/70",
                lock && "cursor-not-allowed opacity-55",
              )}
            >
              <input
                type="radio"
                name={kind}
                value={opt}
                checked={on}
                disabled={!!lock}
                onChange={() => setAvatar((a) => ({ ...a, [kind]: opt }))}
                className="sr-only"
              />
              {lock ? <IconLock className="h-3.5 w-3.5" /> : null}
              {label(opt)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <form {...formProps} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[180px_1fr]">
        <div className="text-center">
          <Avatar config={avatar} className="mx-auto h-40 w-40" />
          <p className="muted mt-2 text-xs">Live preview</p>
        </div>
        <div className="space-y-4">
          {group("species", SPECIES, "Species")}
          {group("headwear", HEADWEAR, "Headwear")}
          {group("accessory", ACCESSORIES, "Accessory")}
          {group("backdrop", BACKDROPS, "Backdrop")}
          <p className="text-xs text-sepia" aria-live="polite">
            {lockHint ? (
              <>
                <IconLock className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                {lockHint}
              </>
            ) : (
              "Locked items unlock through levels and achievements. Tap or hover a locked item to see how."
            )}
          </p>
          <FieldError errors={fe?.avatar} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-name" className="field-label">
            Display name
          </label>
          <input id="pf-name" name="displayName" defaultValue={initial.displayName} maxLength={LIMITS.displayName.max * 4} className="input" required />
          <FieldError errors={fe?.displayName} />
        </div>
        <div>
          <label htmlFor="pf-badge" className="field-label">
            Featured badge
          </label>
          <select id="pf-badge" name="featuredBadge" defaultValue={initial.featuredBadge ?? ""} className="select">
            <option value="">None</option>
            {badges.map((b) => (
              <option key={b.key} value={b.key}>
                {b.name}
              </option>
            ))}
          </select>
          <FieldError errors={fe?.featuredBadge} />
        </div>
      </div>
      <div>
        <label htmlFor="pf-bio" className="field-label">
          Bio
        </label>
        <textarea id="pf-bio" name="bio" defaultValue={initial.bio} maxLength={LIMITS.bio.max * 4} rows={2} className="textarea !min-h-0" placeholder="A short, dignified statement for the record." />
        <FieldError errors={fe?.bio} />
      </div>

      <fieldset>
        <legend className="field-label">Profile theme</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theTheme) => {
            const on = theme === theTheme.key;
            // The theme already in use stays selectable even if it's locked for this player.
            const t = theTheme.key === initial.profileTheme ? { ...theTheme, locked: null } : theTheme;
            return (
              <label
                key={t.key}
                className={clsx(
                  "relative flex cursor-pointer flex-col rounded-xl border-2 p-3 transition",
                  on ? "border-burgundy ring-2 ring-gold/60" : "border-sepia/30 hover:border-sepia/70",
                  t.locked && "cursor-not-allowed opacity-60",
                )}
              >
                <input type="radio" name="profileTheme" value={t.key} checked={on} disabled={!!t.locked} onChange={() => setTheme(t.key)} className="sr-only" />
                <span className="flex h-10 overflow-hidden rounded-md" aria-hidden>
                  <span className="flex-1" style={{ background: t.swatch[0] }} />
                  <span className="flex-1" style={{ background: t.swatch[1] }} />
                  <span className="w-6" style={{ background: t.swatch[2] }} />
                </span>
                <span className="mt-2 flex items-center gap-1.5 font-bold">
                  {t.locked ? <IconLock className="h-4 w-4" /> : null}
                  {t.label}
                </span>
                <span className="text-xs text-sepia">{t.locked ?? t.description}</span>
              </label>
            );
          })}
        </div>
        <FieldError errors={fe?.profileTheme} />
      </fieldset>
      <Result state={state} />
      <div className="flex justify-end">
        <SubmitButton pending={pending} className="btn-burgundy" pendingLabel="Saving…">
          Save profile
        </SubmitButton>
      </div>
    </form>
  );
}

export function PreferencesForm({ initial }: { initial: { reducedMotion: boolean; allowFeaturing: boolean; mutedCategories: string[] } }) {
  const [state, formProps, pending] = useFormAction(updatePreferencesAction);
  return (
    <form {...formProps} className="space-y-5">
      <label className="flex items-start gap-3">
        <input type="checkbox" name="reducedMotion" defaultChecked={initial.reducedMotion} className="mt-1 h-5 w-5 accent-burgundy" />
        <span>
          <span className="block font-bold">Reduce motion</span>
          <span className="block text-sm text-sepia">Turns off gavel slams, stamps, confetti and character animations, on top of your system setting.</span>
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="allowFeaturing" defaultChecked={initial.allowFeaturing} className="mt-1 h-5 w-5 accent-burgundy" />
        <span>
          <span className="block font-bold">Allow my confessions to be featured</span>
          <span className="block text-sm text-sepia">
            Eligible for &ldquo;Featured case of the day&rdquo;, the front page&apos;s community highlights and the &ldquo;Most entertaining&rdquo; board. The &ldquo;Fresh from the bench&rdquo; list of recent verdicts, the archives and search show every closed case either way. Anonymous confessions keep the choice you had when you filed them, so they can&apos;t be linked to you.
          </span>
        </span>
      </label>
      <fieldset>
        <legend className="field-label">Muted categories</legend>
        <p className="mb-2 text-sm text-sepia">Hide these categories from your queues, jury duty, and the archives (unless you filter for them directly).</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <label key={c.key} className="flex items-center gap-2 rounded-lg border border-sepia/25 bg-white/30 px-3 py-2 text-sm">
              <input type="checkbox" name="mutedCategories" value={c.key} defaultChecked={initial.mutedCategories.includes(c.key)} className="h-4 w-4 accent-burgundy" />
              <CategoryIcon category={c.key} className="h-6 w-6" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Result state={state} />
      <div className="flex justify-end">
        <SubmitButton pending={pending} className="btn-burgundy" pendingLabel="Saving…">
          Save preferences
        </SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, formProps, pending] = useFormAction(changePasswordAction);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form {...formProps} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label htmlFor="pw-current" className="field-label">
          Current password
        </label>
        <input id="pw-current" type="password" name="currentPassword" autoComplete="current-password" className="input" required />
        <FieldError errors={fe?.currentPassword} />
      </div>
      <div>
        <label htmlFor="pw-new" className="field-label">
          New password
        </label>
        <input id="pw-new" type="password" name="newPassword" autoComplete="new-password" minLength={8} className="input" required />
        <FieldError errors={fe?.newPassword} />
      </div>
      <div>
        <label htmlFor="pw-confirm" className="field-label">
          Confirm new password
        </label>
        <input id="pw-confirm" type="password" name="confirmPassword" autoComplete="new-password" className="input" required />
        <FieldError errors={fe?.confirmPassword} />
      </div>
      <div className="sm:col-span-3">
        <Result state={state} />
      </div>
      <div className="flex justify-end sm:col-span-3">
        <SubmitButton pending={pending} className="btn-burgundy" pendingLabel="Updating…">
          Change password
        </SubmitButton>
      </div>
    </form>
  );
}

export function DeleteAccountForm({ userId }: { userId: string }) {
  const [state, formProps, pending] = useFormAction(deleteAccountAction);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  // Drafts are cleared as the request goes out (a successful deletion signs the player out and
  // redirects), and put back if the court refuses it (audit 52 D3: a wrong password lost them).
  const saved = useRef<Record<string, string> | null>(null);
  useEffect(() => {
    if (state && !state.ok && saved.current) {
      restoreDrafts(saved.current);
      saved.current = null;
    }
  }, [state]);
  return (
    <form
      {...formProps}
      onSubmit={(e) => {
        // Unsent drafts go with the account (on this device), as they do when logging out.
        saved.current = snapshotDrafts(userId);
        clearDrafts(userId);
        formProps.onSubmit(e);
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <p className="text-sm sm:col-span-2">
        Your profile, bio and display name are scrubbed and you are signed out everywhere. Your username is retired (no one else can take it). Cases and
        votes you took part in stay in the record, credited to &ldquo;Former Citizen&rdquo;. This cannot be undone.
      </p>
      <div>
        <label htmlFor="del-password" className="field-label">
          Password
        </label>
        <input id="del-password" type="password" name="password" autoComplete="current-password" className="input" required />
        <FieldError errors={fe?.password} />
      </div>
      <div>
        <label htmlFor="del-confirm" className="field-label">
          Type DELETE to confirm
        </label>
        <input id="del-confirm" name="confirm" className="input" required autoComplete="off" />
        <FieldError errors={fe?.confirm} />
      </div>
      {state && !state.ok && !fe ? <FormAlert className="sm:col-span-2 !text-crimson">{state.error}</FormAlert> : null}
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton pending={pending} className="btn-crimson" pendingLabel="Sealing your record…">
          Delete my account
        </SubmitButton>
      </div>
    </form>
  );
}
