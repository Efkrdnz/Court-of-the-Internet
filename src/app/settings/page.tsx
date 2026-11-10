import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/server/auth/current-user";
import { getUnlockContext } from "@/server/services/accounts";
import { parseAvatar } from "@/lib/avatar";
import { ACHIEVEMENTS, getAchievement } from "@/lib/achievements";
import { LOCKED_AVATAR_ITEMS, PROFILE_THEMES, avatarItemKey, describeUnlock, isUnlocked, themeItemKey } from "@/lib/cosmetics";
import { DeleteAccountForm, PasswordForm, PreferencesForm, ProfileForm } from "@/components/forms/SettingsForms";
import { WaxSeal } from "@/components/art/props";

export const metadata: Metadata = { title: "Settings" };

const name = (key: string) => getAchievement(key)?.name ?? key;

export default async function SettingsPage() {
  const user = await requireUserOrRedirect("/settings");
  const ctx = await getUnlockContext(user.id);
  const locks: Record<string, string> = {};
  for (const item of LOCKED_AVATAR_ITEMS) {
    if (!isUnlocked(item.unlock, ctx, avatarItemKey(item))) locks[`${item.kind}:${item.value}`] = describeUnlock(item.unlock, name);
  }
  const themes = PROFILE_THEMES.map((t) => ({
    key: t.key,
    label: t.label,
    description: t.description,
    locked: isUnlocked(t.unlock, ctx, themeItemKey(t.key)) ? null : describeUnlock(t.unlock, name),
    swatch: [t.vars.bg, t.vars.panel, t.vars.accent] as [string, string, string],
  }));
  const badges = ACHIEVEMENTS.filter((a) => ctx.achievements.has(a.key)).map((a) => ({ key: a.key, name: a.name }));
  const premium = [...PROFILE_THEMES.filter((t) => t.unlock === "premium").map((t) => t.label), ...LOCKED_AVATAR_ITEMS.filter((i) => i.unlock === "premium").map((i) => `${i.value} (${i.kind})`)];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="eyebrow">Chambers</p>
        <h1 className="font-display text-4xl font-black text-parchment sm:text-5xl">Settings</h1>
        <nav aria-label="Settings sections" className="mt-4 flex flex-wrap gap-2">
          {[
            ["#appearance", "Appearance"],
            ["#preferences", "Content & motion"],
            ["#patron", "Patron perks"],
            ["#security", "Password"],
            ["#danger", "Delete account"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="chip">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <div className="space-y-8">
        <section id="appearance" aria-labelledby="appearance-heading" className="doc doc-ruled scroll-mt-24 p-6 sm:p-8">
          <h2 id="appearance-heading" className="mb-1 font-display text-2xl font-black">
            Appearance
          </h2>
          <p className="muted mb-6 text-sm">Your portrait, title card and theme, as seen on your public profile at /u/{user.username}.</p>
          <ProfileForm
            initial={{ displayName: user.displayName, bio: user.bio, avatar: parseAvatar(user.avatar), profileTheme: user.profileTheme, featuredBadge: user.featuredBadge }}
            themes={themes}
            badges={badges}
            locks={locks}
          />
        </section>

        <section id="preferences" aria-labelledby="pref-heading" className="doc doc-ruled scroll-mt-24 p-6 sm:p-8">
          <h2 id="pref-heading" className="mb-4 font-display text-2xl font-black">
            Content &amp; motion
          </h2>
          <PreferencesForm initial={{ reducedMotion: user.reducedMotion, allowFeaturing: user.allowFeaturing, mutedCategories: user.mutedCategories }} />
        </section>

        <section id="patron" aria-labelledby="patron-heading" className="velvet scroll-mt-24 p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-5">
            <WaxSeal color="gold" emblem="crown" className="h-20 w-20 shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 id="patron-heading" className="font-display text-2xl font-black text-parchment">
                Patron of the Court
              </h2>
              <p className="mt-1 text-parchment/75">
                {ctx.isPatron
                  ? "You are a Patron. Thank you for keeping the lights on and the wigs powdered!"
                  : "Patron memberships aren't on sale yet. When they arrive they will be purely cosmetic: themes, badges and courtroom flair. Votes, verdicts and rankings can never be bought."}
              </p>
              <p className="mt-3 text-sm text-parchment/60">Planned Patron cosmetics: {premium.join(", ")}.</p>
            </div>
          </div>
        </section>

        <section id="security" aria-labelledby="sec-heading" className="doc doc-ruled scroll-mt-24 p-6 sm:p-8">
          <h2 id="sec-heading" className="mb-4 font-display text-2xl font-black">
            Change password
          </h2>
          <PasswordForm />
        </section>

        <section id="danger" aria-labelledby="danger-heading" className="doc scroll-mt-24 border-2 border-crimson/60 p-6 sm:p-8">
          <h2 id="danger-heading" className="mb-2 font-display text-2xl font-black text-crimson">
            Delete account
          </h2>
          <DeleteAccountForm userId={user.id} />
        </section>
      </div>
    </div>
  );
}
