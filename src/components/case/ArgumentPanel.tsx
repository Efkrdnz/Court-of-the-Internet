import clsx from "clsx";
import { HamsterDefendant, PigeonAttorney, RaccoonProsecutor, CryingPizza } from "@/components/art/characters";
import { WaxSeal } from "@/components/art/props";
import type { PersonDTO } from "@/server/queries/cases";
import { formatDateTime } from "@/lib/format";
import { PersonChip } from "./PersonChip";
import { LongWords } from "@/components/ui/LongWords";

type Kind = "confession" | "defense" | "prosecution";

const META: Record<Kind, { label: string; role: string; panel: string; accent: string }> = {
  confession: { label: "Exhibit A · The Confession", role: "The accused", panel: "argument-confession", accent: "text-gold-dark" },
  defense: { label: "For the Defense", role: "Defense attorney", panel: "argument-defense", accent: "text-teal" },
  prosecution: { label: "For the Prosecution", role: "Prosecutor", panel: "argument-prosecution", accent: "text-crimson" },
};

export function ArgumentPanel({
  kind,
  person,
  body,
  context,
  stricken = false,
  filedAt,
  pending,
  category,
  flip = false,
}: {
  kind: Kind;
  person: PersonDTO | null;
  body: string | null;
  context?: string | null;
  stricken?: boolean;
  filedAt?: string | null;
  /** Shown when this argument hasn't been filed yet. */
  pending?: string;
  category?: string;
  flip?: boolean;
}) {
  const m = META[kind];
  const Character = kind === "confession" ? (category === "food-crimes" ? CryingPizza : HamsterDefendant) : kind === "defense" ? PigeonAttorney : RaccoonProsecutor;
  return (
    <section aria-label={m.label} className={clsx("grid grid-cols-1 items-end gap-4 md:grid-cols-[150px_minmax(0,1fr)]", flip && "md:grid-cols-[minmax(0,1fr)_150px]")}>
      <div className={clsx("hidden md:block", flip && "md:order-2")}>
        <Character className="chr-hover chr-sticker w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]" title={kind === "confession" && category === "food-crimes" ? "The victim: a crying slice of pizza" : undefined} />
        {kind === "confession" && category === "food-crimes" ? <p className="mt-1 text-center text-xs italic text-parchment/60">The victim, pictured</p> : null}
      </div>
      <div className={clsx("argument min-w-0", m.panel, body === null && "opacity-90")}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={clsx("text-xs font-black uppercase tracking-[0.2em]", m.accent)}>{m.label}</p>
            {filedAt ? <p className="font-type text-xs text-sepia">Filed {formatDateTime(filedAt)}</p> : null}
          </div>
          <PersonChip person={person} role={m.role} size="sm" />
        </div>
        {body !== null ? (
          <>
            <p className={clsx("typewritten text-ink", stricken && "line-through decoration-crimson/70")}><LongWords text={body} /></p>
            {context ? (
              <p className="mt-4 border-l-2 border-sepia/40 pl-3 text-sm italic text-ink/75">
                <span className="font-bold not-italic">Additional context: </span>
                {context}
              </p>
            ) : null}
          </>
        ) : stricken ? (
          <div className="flex items-center gap-3">
            <WaxSeal color="burgundy" emblem="gavel" className="h-14 w-14 shrink-0" />
            <p className="font-type text-ink/80">This argument was stricken from the record by order of the court.</p>
          </div>
        ) : (
          <p className="font-type italic text-ink/60">{pending ?? "Not yet filed."}</p>
        )}
      </div>
    </section>
  );
}

export function CaseTimeline({ events }: { events: { key: string; label: string; at: string | null }[] }) {
  return (
    <ol className="relative space-y-4 border-l-2 border-gold/40 pl-5">
      {events.map((e) => (
        <li key={e.key} className="relative">
          <span className="absolute -left-[29px] top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-gold bg-mahogany" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          </span>
          <p className="font-bold text-parchment">{e.label}</p>
          {e.at ? <p className="font-type text-xs text-parchment/60">{formatDateTime(e.at)}</p> : null}
        </li>
      ))}
    </ol>
  );
}
