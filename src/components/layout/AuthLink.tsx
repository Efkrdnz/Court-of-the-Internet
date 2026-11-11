"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

const NO_RETURN = new Set(["/", "/login", "/signup"]);

/**
 * The header's "Log in" / "Join the court": come back to this page afterwards (audit 61 D4).
 * The query string is read at click time, so pages don't need `useSearchParams` (which would
 * opt every static page out of prerendering).
 */
export function AuthLink({ to, className, onNavigate, children }: { to: "/login" | "/signup"; className: string; onNavigate?: () => void; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const href = NO_RETURN.has(pathname) ? to : `${to}?next=${encodeURIComponent(pathname)}`;
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    onNavigate?.();
    const search = window.location.search;
    if (NO_RETURN.has(pathname) || !search || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const full = `${pathname}${search}`;
    if (full.length > 480) return;
    e.preventDefault();
    router.push(`${to}?next=${encodeURIComponent(full)}`);
  }
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
