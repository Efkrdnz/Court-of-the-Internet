"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { durationShort } from "@/lib/format";

/** Live countdown. Refreshes the route once when it hits zero so server state catches up. */
export function Countdown({
  to,
  className,
  expiredLabel = "Time's up",
  warnBelowMs = 5 * 60_000,
  refreshOnExpire = true,
}: {
  to: string;
  className?: string;
  expiredLabel?: string;
  warnBelowMs?: number;
  refreshOnExpire?: boolean;
}) {
  const router = useRouter();
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0); // client-only clock: avoids a hydration mismatch
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  const remaining = now === null ? null : target - now;
  const expired = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (!expired || !refreshOnExpire) return;
    const t = setTimeout(() => router.refresh(), 1500);
    return () => clearTimeout(t);
  }, [expired, refreshOnExpire, router]);

  return (
    <time
      dateTime={to}
      className={clsx("tabular-nums", remaining !== null && remaining < warnBelowMs && !expired && "text-[#ff9d8a]", className)}
      suppressHydrationWarning
    >
      {remaining === null ? "…" : expired ? expiredLabel : durationShort(remaining)}
    </time>
  );
}
