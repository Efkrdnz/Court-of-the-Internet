"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { durationShort } from "@/lib/format";

/** Milliseconds left until `to` (null before the first client tick). Refreshes the route once at zero. */
function useRemaining(to: string, refreshOnExpire: boolean) {
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

  return { remaining, expired };
}

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
  const { remaining, expired } = useRemaining(to, refreshOnExpire);
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

/**
 * "Your claim expires in 12m 03s", and once it has run out, the truth about the grace period:
 * the holder can still file for a couple of minutes before anyone else may take the case.
 */
export function ClaimCountdown({ to, prefix = "Your claim expires in", className }: { to: string; prefix?: string; className?: string }) {
  const { remaining, expired } = useRemaining(to, true);
  if (expired) {
    return <span className={clsx("text-[#ff9d8a]", className)}>Your claim time is up. You&apos;re in a short grace period: file now, before someone else takes the case.</span>;
  }
  return (
    <span className={className}>
      {prefix}{" "}
      <time dateTime={to} className={clsx("tabular-nums font-bold", remaining !== null && remaining < 5 * 60_000 ? "text-[#ff9d8a]" : "text-gold-light")} suppressHydrationWarning>
        {remaining === null ? "…" : durationShort(remaining)}
      </time>
    </span>
  );
}
