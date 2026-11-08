import clsx from "clsx";
import { STATUS_LABEL, VERDICT_LABEL } from "@/lib/format";

const STATUS_STYLE: Record<string, string> = {
  AWAITING_DEFENSE: "bg-teal/20 text-[#9fe0cf] ring-1 ring-teal-light/50",
  DEFENSE_CLAIMED: "bg-teal/10 text-[#9fe0cf]/80 ring-1 ring-teal-light/30",
  AWAITING_PROSECUTION: "bg-crimson/20 text-[#ffb3b3] ring-1 ring-crimson/50",
  PROSECUTION_CLAIMED: "bg-crimson/10 text-[#ffb3b3]/80 ring-1 ring-crimson/30",
  DELIBERATION: "bg-gold/20 text-gold-light ring-1 ring-gold/50",
  CLOSED: "bg-parchment/10 text-parchment ring-1 ring-parchment/30",
};

const VERDICT_STYLE: Record<string, string> = {
  GUILTY: "bg-crimson text-ivory",
  NOT_GUILTY: "bg-teal text-ivory",
  MISTRIAL: "bg-plum text-ivory",
  DISMISSED: "bg-charcoal-2 text-parchment",
};

const STATUS_STYLE_LIGHT: Record<string, string> = {
  AWAITING_DEFENSE: "bg-teal/15 text-teal ring-1 ring-teal/40",
  DEFENSE_CLAIMED: "bg-teal/10 text-teal ring-1 ring-teal/30",
  AWAITING_PROSECUTION: "bg-crimson/10 text-crimson ring-1 ring-crimson/40",
  PROSECUTION_CLAIMED: "bg-crimson/10 text-crimson ring-1 ring-crimson/30",
  DELIBERATION: "bg-gold/25 text-gold-dark ring-1 ring-gold-dark/40",
  CLOSED: "bg-ink/10 text-ink ring-1 ring-ink/20",
};

export function StatusPill({ status, verdict, light = false, className }: { status: string; verdict?: string | null; light?: boolean; className?: string }) {
  if (status === "CLOSED" && verdict) {
    return <span className={clsx("pill", VERDICT_STYLE[verdict], className)}>{VERDICT_LABEL[verdict]}</span>;
  }
  return (
    <span className={clsx("pill", (light ? STATUS_STYLE_LIGHT : STATUS_STYLE)[status], className)}>
      {status === "DELIBERATION" ? <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" aria-hidden /> : null}
      {STATUS_LABEL[status]}
    </span>
  );
}
