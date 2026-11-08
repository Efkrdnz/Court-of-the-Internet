import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { requireUserOrRedirect } from "@/server/auth/current-user";
import { db } from "@/server/db";
import { clock } from "@/server/clock";
import { listNotifications } from "@/server/queries/players";
import { relativeTime } from "@/lib/format";
import { getAchievement } from "@/lib/achievements";
import { AchievementBadge } from "@/components/art/badges";
import { TumbleweedDocket } from "@/components/art/scenes";
import { IconBell, IconGavel, IconClock, IconTrophy, IconFlag, IconBriefcase, IconScales } from "@/components/art/props";

export const metadata: Metadata = { title: "Notifications" };

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CASE_CLAIMED: IconBriefcase,
  DEFENSE_FILED: IconScales,
  PROSECUTION_FILED: IconScales,
  VERDICT: IconGavel,
  CLAIM_EXPIRED: IconClock,
  LEVEL_UP: IconTrophy,
  DELIBERATION_EXTENDED: IconClock,
  MODERATION: IconFlag,
};

export default async function NotificationsPage() {
  const user = await requireUserOrRedirect("/notifications");
  const items = await listNotifications(user.id, 60);
  const unread = items.filter((n) => !n.readAt).length;
  // Opening the inbox marks everything as read (items above still show as new for this view).
  if (unread) await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: clock.now() } });
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Court correspondence</p>
          <h1 className="font-display text-4xl font-black text-parchment">Notifications</h1>
          <p className="text-parchment/60">{unread ? `${unread} unread` : "All caught up."}</p>
        </div>

      </header>
      {items.length === 0 ? (
        <div className="velvet flex flex-col items-center p-10 text-center">
          <TumbleweedDocket className="w-full max-w-xs" />
          <p className="mt-4 text-parchment/70">No mail from the court yet. Go cause some trouble.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const ach = n.type === "ACHIEVEMENT" ? getAchievement(String((n.data as { key?: string } | null)?.key ?? "")) : undefined;
            const Icon = ICONS[n.type] ?? IconBell;
            const body = (
              <div className={clsx("flex items-start gap-4 rounded-xl border p-4 transition", n.readAt ? "border-gold/15 bg-night/30" : "border-gold/45 bg-burgundy/30")}>
                {ach ? (
                  <AchievementBadge icon={ach.icon} tier={ach.tier} className="h-14 w-12 shrink-0" />
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-night/60 text-gold-light ring-1 ring-gold/30">
                    <Icon className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-parchment">{n.title}</p>
                  <p className="text-sm text-parchment/75">{n.body}</p>
                  <p className="mt-1 text-xs text-parchment/50">{relativeTime(n.createdAt)}</p>
                </div>
                {!n.readAt ? <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-gold" aria-label="Unread" /> : null}
              </div>
            );
            return <li key={n.id}>{n.href ? <Link href={n.href}>{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
