"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "./nav-items";
import { IconMenu, IconX } from "@/components/art/props";

export function MobileNav({ signedIn, staff }: { signedIn: boolean; staff: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  // Any navigation (a link, Back/Forward) closes the menu.
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const close = () => setOpen(false);
    // Rotating or resizing to the desktop layout hides the toggle, so the panel must go too.
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => wide.matches && close();
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", close);
    wide.addEventListener("change", onWide);
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", close);
      wide.removeEventListener("change", onWide);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid h-11 w-11 place-items-center rounded-lg border border-gold/40 text-gold-light"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <IconX className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
      </button>
      {/* Portalled to <body>: the header's backdrop-filter would otherwise trap this fixed panel inside the header. */}
      {open ? createPortal(
        <div id="mobile-nav" ref={panelRef} className="fixed inset-x-0 bottom-0 top-[64px] z-50 overflow-y-auto bg-night/95 px-5 pb-10 pt-4 backdrop-blur">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    onClick={() => setOpen(false)}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "block rounded-lg px-4 py-3 font-display text-xl font-bold",
                      active ? "bg-burgundy/60 text-gold-light" : "text-parchment hover:bg-burgundy/30",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="my-3 h-px bg-gold/25" />
            {signedIn ? (
              <>
                <li>
                  <Link onClick={() => setOpen(false)} href="/notifications" className="block rounded-lg px-4 py-3 font-bold text-parchment hover:bg-burgundy/30">
                    Notifications
                  </Link>
                </li>
                <li>
                  <Link onClick={() => setOpen(false)} href="/settings" className="block rounded-lg px-4 py-3 font-bold text-parchment hover:bg-burgundy/30">
                    Settings
                  </Link>
                </li>
                {staff ? (
                  <li>
                    <Link onClick={() => setOpen(false)} href="/moderation" className="block rounded-lg px-4 py-3 font-bold text-parchment hover:bg-burgundy/30">
                      Moderation
                    </Link>
                  </li>
                ) : null}
              </>
            ) : (
              <li className="flex gap-3 px-1 pt-2">
                <Link onClick={() => setOpen(false)} href="/login" className="btn btn-ghost flex-1">
                  Log in
                </Link>
                <Link onClick={() => setOpen(false)} href="/signup" className="btn flex-1">
                  Join the court
                </Link>
              </li>
            )}
            <li>
              <Link onClick={() => setOpen(false)} href="/rules" className="block rounded-lg px-4 py-3 text-sm text-parchment/70 hover:text-gold-light">
                Community rules
              </Link>
            </li>
          </ul>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
