"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/art/avatar";
import type { AvatarConfig } from "@/lib/avatar";
import { logoutAction } from "@/app/actions/auth";

export function UserMenu({
  username,
  displayName,
  avatar,
  level,
  levelTitle,
  pct,
  staff,
}: {
  username: string;
  displayName: string;
  avatar: AvatarConfig;
  level: number;
  levelTitle: string;
  pct: number;
  staff: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-gold/40 bg-night/40 py-1 pl-1 pr-3 transition hover:border-gold-light"
        aria-expanded={open}
        aria-haspopup="menu"
        // Starts with the visible text ("Hammy Lv 2"), so voice-control users can say what they see.
        aria-label={`${displayName} Lv ${level}, account menu`}
      >
        <Avatar config={avatar} className="h-9 w-9" title={displayName} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[9rem] truncate text-sm font-bold text-parchment">{displayName}</span>
          <span className="block text-[11px] font-semibold text-gold-light">Lv {level}</span>
        </span>
      </button>
      {open ? (
        <div role="menu" className="velvet !absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden p-2">
          <div className="px-3 py-2">
            <p className="font-display font-bold text-parchment">{displayName}</p>
            <p className="text-xs text-gold-light">
              Level {level} · {levelTitle}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-night/60" aria-hidden>
              <div className="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold-light" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="my-1 h-px bg-gold/20" />
          {[
            { href: `/u/${username}`, label: "My profile" },
            { href: "/court", label: "My courtroom" },
            { href: "/notifications", label: "Notifications" },
            { href: "/settings", label: "Settings" },
            ...(staff ? [{ href: "/moderation", label: "Moderation console" }] : []),
          ].map((item) => (
            <Link key={item.href} role="menuitem" href={item.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-parchment hover:bg-burgundy/50 hover:text-gold-light">
              {item.label}
            </Link>
          ))}
          <div className="my-1 h-px bg-gold/20" />
          <form action={logoutAction}>
            <button role="menuitem" type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-parchment hover:bg-burgundy/50 hover:text-gold-light">
              Leave the courtroom (log out)
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
