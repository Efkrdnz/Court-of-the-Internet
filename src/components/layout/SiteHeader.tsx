import Link from "next/link";
import { Crest } from "@/components/art/props";
import { IconBell } from "@/components/art/props";
import { parseAvatar } from "@/lib/avatar";
import type { SessionUser } from "@/server/auth/sessions";
import { getViewerSummary } from "@/server/queries/players";
import { NavLinks } from "./NavLinks";
import { MobileNav } from "./MobileNav";
import { UserMenu } from "./UserMenu";

export async function SiteHeader({ user }: { user: SessionUser | null }) {
  const summary = user ? await getViewerSummary(user.id) : null;
  const staff = user?.role === "ADMIN" || user?.role === "MODERATOR";
  return (
    <header className="sticky top-0 z-40 border-b border-gold/25 bg-gradient-to-b from-[#1b070c]/95 to-[#14060a]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label="Court of the Internet: home">
          <Crest className="h-11 w-11 shrink-0 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
          <span className="min-w-0 leading-none">
            <span className="block truncate font-blackletter text-xl text-gold-light sm:text-2xl">Court of the Internet</span>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.3em] text-parchment/50 sm:block">All rise · Est. 2026</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-2">
          {user && summary ? (
            <>
              <Link
                href="/notifications"
                className="relative grid h-11 w-11 place-items-center rounded-full text-parchment/80 transition hover:bg-burgundy/40 hover:text-gold-light"
                aria-label={summary.unread ? `Notifications (${summary.unread} unread)` : "Notifications"}
              >
                <IconBell className="h-5 w-5" />
                {summary.unread ? (
                  <span className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-crimson px-1 text-[11px] font-black text-ivory ring-2 ring-[#1b070c]">
                    {summary.unread > 99 ? "99+" : summary.unread}
                  </span>
                ) : null}
              </Link>
              <UserMenu
                username={user.username}
                displayName={user.displayName}
                avatar={parseAvatar(user.avatar)}
                level={summary.level.level}
                levelTitle={summary.level.title}
                pct={summary.level.pct}
                staff={staff}
              />
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-sm">
                Join the court
              </Link>
            </div>
          )}
          <MobileNav signedIn={!!user} staff={staff} />
        </div>
      </div>
      {user?.bannedAt ? (
        <div className="bg-crimson/90 px-4 py-1.5 text-center text-sm font-bold text-ivory">
          You have been held in contempt of court. You can browse, but you can&apos;t play. Reason: {user.banReason ?? "unspecified"}
        </div>
      ) : null}
    </header>
  );
}
