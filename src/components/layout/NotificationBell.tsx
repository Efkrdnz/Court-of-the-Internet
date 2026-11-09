"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBell } from "@/components/art/props";

/**
 * Header bell. Opening /notifications marks everything read on the server, but the shared
 * layout isn't re-rendered on client-side navigation, so the badge is cleared here once the
 * inbox has been seen. Fresh server data (a different count) shows the badge again.
 */
export function NotificationBell({ unread }: { unread: number }) {
  const pathname = usePathname();
  const [seenCount, setSeenCount] = useState<number | null>(null);
  // Derived state, updated during render (no effect needed).
  if (pathname === "/notifications" && unread > 0 && seenCount !== unread) setSeenCount(unread);
  const shown = seenCount === unread ? 0 : unread;
  return (
    <Link
      href="/notifications"
      className="relative grid h-11 w-11 place-items-center rounded-full text-parchment/80 transition hover:bg-burgundy/40 hover:text-gold-light"
      aria-label={shown ? `Notifications (${shown} unread)` : "Notifications"}
    >
      <IconBell className="h-5 w-5" />
      {shown ? (
        <span className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-crimson px-1 text-[11px] font-black text-ivory ring-2 ring-[#1b070c]">
          {shown > 99 ? "99+" : shown}
        </span>
      ) : null}
    </Link>
  );
}
