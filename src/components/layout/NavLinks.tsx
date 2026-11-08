"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "./nav-items";

export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="hidden items-center gap-1 lg:flex">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative rounded-md px-3 py-2 text-sm font-bold tracking-wide transition-colors",
                active ? "text-gold-light" : "text-parchment/80 hover:text-gold-light",
              )}
            >
              {item.label}
              {active ? <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded bg-gradient-to-r from-transparent via-gold to-transparent" /> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
