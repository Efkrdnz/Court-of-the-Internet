import Link from "next/link";
import clsx from "clsx";
import { longestWordEm } from "@/lib/fit-text";
import { Avatar } from "@/components/art/avatar";
import type { PersonDTO } from "@/server/queries/cases";

export function AnonymousMugshot({ className, critter }: { className?: string; critter?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={critter ? `Anonymous ${critter}` : "Anonymous defendant"}>
      <title>{critter ? `Anonymous ${critter}` : "Anonymous defendant"}</title>
      <circle cx="32" cy="32" r="30" fill="#2a2326" stroke="#c9a227" strokeWidth="3" />
      <path d="M14 50c3-10 10-15 18-15s15 5 18 15" fill="#3d3537" stroke="#1a0f12" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="32" cy="26" r="12" fill="#5c5254" stroke="#1a0f12" strokeWidth="2.5" />
      <rect x="16" y="21" width="32" height="8" rx="1.5" fill="#0d0a0b" transform="rotate(-6 32 25)" />
      <text x="32" y="58" textAnchor="middle" fontSize="7" fontWeight="800" fill="#e8c766" fontFamily="Bricolage Grotesque, sans-serif" letterSpacing="1">
        ???
      </text>
    </svg>
  );
}

export function PersonChip({
  person,
  role,
  size = "md",
  className,
  dark = false,
}: {
  person: PersonDTO | null;
  role?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  dark?: boolean;
}) {
  const avatarSize = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-14 w-14" : "h-9 w-9";
  if (!person) {
    return (
      <span className={clsx("inline-flex items-center gap-2", className)}>
        <span className={clsx(avatarSize, "grid place-items-center rounded-full border-2 border-dashed", dark ? "border-gold/40" : "border-sepia/40")} aria-hidden />
        <span className="leading-tight">
          {role ? <span className={clsx("block text-[11px] font-bold uppercase tracking-widest", dark ? "text-gold-light/80" : "text-sepia")}>{role}</span> : null}
          <span className={clsx("block text-sm italic", dark ? "text-parchment/60" : "text-sepia/80")}>Seat vacant</span>
        </span>
      </span>
    );
  }
  const avatar = person.avatar ? (
    <Avatar config={person.avatar} className={clsx(avatarSize, "shrink-0")} title={person.displayName} />
  ) : (
    <AnonymousMugshot className={clsx(avatarSize, "shrink-0")} critter={person.anonymousCritter} />
  );
  const longName = longestWordEm(person.displayName) > 9;
  const content = (
    <>
      {avatar}
      <span className="min-w-0 leading-tight">
        {role ? <span className={clsx("block text-[11px] font-bold uppercase tracking-widest", dark ? "text-gold-light/80" : "text-sepia")}>{role}</span> : null}
        {/* Long names wrap onto a second line (and show in full on hover) rather than being cut off. */}
        <span
          className={clsx(
            "break-words font-bold [overflow-wrap:anywhere]",
            // Long words get a smaller size and a third line rather than being broken and cut (audit 51 #7).
            longName ? "line-clamp-3 text-xs" : clsx("line-clamp-2", size === "lg" ? "text-lg" : "text-sm"),
            dark ? "text-parchment" : "text-ink",
          )}
          title={person.displayName}
        >
          {person.displayName}
        </span>
        {person.username ? <span className={clsx("block truncate text-xs", dark ? "text-parchment/50" : "text-sepia")}>@{person.username}</span> : null}
      </span>
    </>
  );
  if (!person.username) return <span className={clsx("inline-flex min-w-0 max-w-full items-center gap-2", className)}>{content}</span>;
  return (
    <Link href={`/u/${person.username}`} className={clsx("inline-flex min-w-0 max-w-full items-center gap-2 rounded-full pr-2 hover:underline", className)}>
      {content}
    </Link>
  );
}
