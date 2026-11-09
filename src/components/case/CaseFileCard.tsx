import Link from "next/link";
import clsx from "clsx";
import { CategoryIcon, VerdictStamp } from "@/components/art/props";
import { getCategory } from "@/lib/categories";
import { casePath, formatCaseNumber, pluralize } from "@/lib/text";
import { relativeTime } from "@/lib/format";
import type { CaseCardDTO } from "@/server/queries/cases";
import { PersonChip } from "./PersonChip";
import { StatusPill } from "./StatusPill";

/**
 * A manila case folder. Used in every listing; the footer slot carries
 * role-specific actions (claim buttons, vote prompts…).
 */
export function CaseFileCard({
  c,
  footer,
  excerpt,
  className,
  showStamp = true,
  linkTitle = true,
}: {
  c: CaseCardDTO;
  footer?: React.ReactNode;
  excerpt?: React.ReactNode;
  className?: string;
  showStamp?: boolean;
  linkTitle?: boolean;
}) {
  const cat = getCategory(c.category);
  const href = casePath(c);
  return (
    <article className={clsx("folder group relative mt-4 flex flex-col p-5 pt-6 transition-transform duration-300 hover:-translate-y-1", className)}>
      <span className="absolute -top-3 left-4 z-10 font-type text-xs font-bold tracking-wider text-sepia">
        CASE No. {formatCaseNumber(c.number)}
      </span>
      <div className="flex items-start gap-3">
        <CategoryIcon category={c.category} className="h-9 w-9 shrink-0 min-[400px]:h-11 min-[400px]:w-11 transition-transform duration-300 group-hover:rotate-[-8deg]" title={cat.label} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-sepia">
            {cat.label}
          </p>
          <h3 className="font-display text-lg font-bold leading-snug text-ink min-[400px]:text-xl">
            {linkTitle ? (
              <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:underline">
                {c.title}
              </Link>
            ) : (
              c.title
            )}
          </h3>
        </div>
        {showStamp && c.status === "CLOSED" && c.verdict ? (
          // Decorative (the footer pill states the verdict), so narrow phones give its room to the title.
          <VerdictStamp verdict={c.verdict} className="pointer-events-none -mr-2 -mt-1 hidden w-20 shrink-0 rotate-[-8deg] opacity-90 mix-blend-multiply min-[400px]:block" />
        ) : null}
      </div>
      <div className="mt-3 line-clamp-3 font-type text-[0.95rem] leading-relaxed text-ink/85">“{c.confession}”</div>
      {excerpt}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-sepia/40 pt-3">
        <PersonChip person={c.accused} role="The accused" size="sm" className="relative z-10" />
        <div className="flex flex-wrap items-center gap-2 text-xs text-sepia">
          <StatusPill status={c.status} verdict={c.verdict} light />
          {c.status === "DELIBERATION" ? <span>{pluralize(c.votesCast, "vote")}</span> : null}
          {c.status === "CLOSED" && c.tallies ? (
            <span className="font-type">
              {c.tallies.guilty}–{c.tallies.notGuilty}
            </span>
          ) : null}
          <span>{relativeTime(c.closedAt ?? c.createdAt)}</span>
        </div>
      </div>
      {footer ? <div className="relative z-10 mt-4">{footer}</div> : null}
    </article>
  );
}
