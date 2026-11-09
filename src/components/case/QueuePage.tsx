import { pageParam } from "@/lib/text";
import Link from "next/link";
import clsx from "clsx";
import { getCurrentUser } from "@/server/auth/current-user";
import { currentClaim, listQueue, type QueueSort } from "@/server/queries/cases";
import { runMaintenance } from "@/server/services/maintenance";
import { db } from "@/server/db";
import { publicGameConfig } from "@/server/config";
import { CATEGORIES, isCategoryKey } from "@/lib/categories";
import { percent } from "@/lib/format";
import { casePath, formatCaseNumber } from "@/lib/text";
import { PigeonAttorney, RaccoonProsecutor } from "@/components/art/characters";
import { CategoryIcon } from "@/components/art/props";
import { TumbleweedDocket } from "@/components/art/scenes";
import { CaseFileCard } from "./CaseFileCard";
import { AssignMeButton, ClaimButton } from "./ClaimButton";
import { Pagination } from "@/components/ui/Pagination";
import { Countdown } from "@/components/ui/Countdown";
import { FormAlert } from "@/components/ui/FormAlert";

const COPY = {
  DEFENSE: {
    path: "/defend",
    eyebrow: "Game mode · Defense Attorney",
    title: "Become an",
    highlight: "attorney",
    blurb: "Strangers have confessed. They need a lawyer: specifically, a clever, shameless one. Claim a case and write a defense of up to 750 characters.",
    empty: "Every defendant has a lawyer. Justice has never been so well-staffed.",
  },
  PROSECUTION: {
    path: "/prosecute",
    eyebrow: "Game mode · Prosecutor",
    title: "Become a",
    highlight: "prosecutor",
    blurb: "The defense has spoken. Read the confession and the defense, then tear it apart in up to 750 characters. The people are counting on you.",
    empty: "No defenses are waiting for a rebuttal. The prosecution may enjoy a snack.",
  },
} as const;

export async function QueuePage({ role, searchParams }: { role: "DEFENSE" | "PROSECUTION"; searchParams: Record<string, string | string[] | undefined> }) {
  await runMaintenance();
  const user = await getCurrentUser();
  const copy = COPY[role];
  const cfg = publicGameConfig();
  const category = typeof searchParams.category === "string" && isCategoryKey(searchParams.category) ? searchParams.category : undefined;
  const sort: QueueSort = searchParams.sort === "oldest" ? "oldest" : "newest";
  const page = pageParam(searchParams.page);

  const [queue, claims, stats] = await Promise.all([
    listQueue({ role, viewer: user ? { id: user.id, mutedCategories: user.mutedCategories } : null, category, sort, page }),
    user ? currentClaim(user.id) : Promise.resolve([]),
    user ? db.userStats.findUnique({ where: { userId: user.id } }) : Promise.resolve(null),
  ]);
  const myClaim = claims.find((c) => c.status === (role === "DEFENSE" ? "DEFENSE_CLAIMED" : "PROSECUTION_CLAIMED"));
  const wins = role === "DEFENSE" ? stats?.defenseWins ?? 0 : stats?.prosecutionWins ?? 0;
  const losses = role === "DEFENSE" ? stats?.defenseLosses ?? 0 : stats?.prosecutionLosses ?? 0;
  const streak = role === "DEFENSE" ? stats?.currentDefenseStreak ?? 0 : stats?.currentProsecutionStreak ?? 0;
  const best = role === "DEFENSE" ? stats?.longestDefenseStreak ?? 0 : stats?.longestProsecutionStreak ?? 0;
  const filed = role === "DEFENSE" ? stats?.defensesFiled ?? 0 : stats?.prosecutionsFiled ?? 0;
  const href = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { category, sort: sort === "newest" ? undefined : sort, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return qs ? `${copy.path}?${qs}` : copy.path;
  };
  const Character = role === "DEFENSE" ? PigeonAttorney : RaccoonProsecutor;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className={clsx("velvet relative overflow-hidden p-6 sm:p-10", role === "DEFENSE" ? "bg-gradient-to-br from-teal/30" : "bg-gradient-to-br from-crimson/30")}>
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="animate-in">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 className="mt-2 font-display text-4xl font-black leading-tight text-parchment sm:text-6xl">
              {copy.title} <span className="gilded-text italic">{copy.highlight}</span>
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-parchment/75">{copy.blurb}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {user ? (
                myClaim ? (
                  <Link href={`${copy.path}/${myClaim.id}`} className="btn btn-lg">
                    Resume Case No. {formatCaseNumber(myClaim.number)}
                  </Link>
                ) : (
                  <AssignMeButton role={role} />
                )
              ) : (
                <Link href={`/login?next=${copy.path}`} className="btn btn-lg">
                  Sign in to take cases
                </Link>
              )}
            </div>
          </div>
          <Character className="chr-hover chr-sticker mx-auto w-48 sm:w-60" />
        </div>
      </header>

      {searchParams.released ? <FormAlert kind="info" className="mt-6">Case released back to the docket. No hard feelings.</FormAlert> : null}

      {myClaim ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-5 py-4">
          <p className="min-w-0 flex-[1_1_14rem] break-words text-parchment">
            You&apos;re on <strong className="text-gold-light">“{myClaim.title}”</strong>. Your claim expires in{" "}
            <Countdown to={myClaim.claimExpiresAt!} className="font-bold text-gold-light" />.
          </p>
          <Link href={`${copy.path}/${myClaim.id}`} className="btn btn-sm">
            Back to the editor
          </Link>
        </div>
      ) : null}

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section aria-labelledby="queue-heading" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 id="queue-heading" className="font-display text-2xl font-bold text-parchment">
              {role === "DEFENSE" ? "Defendants awaiting counsel" : "Defenses awaiting rebuttal"}{" "}
              <span className="font-ui text-base font-semibold text-parchment/50">({queue.total})</span>
            </h2>
            <div className="flex gap-2" role="group" aria-label="Sort">
              <Link href={href({ sort: undefined, page: undefined })} className={clsx("chip", sort === "newest" && "chip-active")} aria-current={sort === "newest" ? "page" : undefined}>
                Newest
              </Link>
              <Link href={href({ sort: "oldest", page: undefined })} className={clsx("chip", sort === "oldest" && "chip-active")} aria-current={sort === "oldest" ? "page" : undefined}>
                Waiting longest
              </Link>
            </div>
          </div>
          <nav aria-label="Filter by category" className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
            <Link href={href({ category: undefined, page: undefined })} className={clsx("chip", !category && "chip-active")}>
              All categories
            </Link>
            {CATEGORIES.map((c) => (
              <Link key={c.key} href={href({ category: c.key, page: undefined })} className={clsx("chip", category === c.key && "chip-active")}>
                <CategoryIcon category={c.key} className="h-5 w-5" />
                {c.label}
              </Link>
            ))}
          </nav>

          {queue.cards.length === 0 ? (
            <div className="velvet flex flex-col items-center p-10 text-center">
              <TumbleweedDocket className="w-full max-w-sm" />
              <p className="mt-4 font-display text-2xl font-bold text-parchment">The docket is empty.</p>
              <p className="mt-1 max-w-md text-parchment/70">{category ? "Nothing in this category right now. Try another statute." : copy.empty}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/confess" className="btn">
                  Confess a crime yourself
                </Link>
                <Link href="/jury" className="btn btn-ghost">
                  Serve on a jury instead
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {queue.cards.map((c) => (
                <CaseFileCard
                  key={c.id}
                  c={c}
                  excerpt={
                    role === "PROSECUTION" && c.defenseExcerpt ? (
                      <div className="argument argument-defense mt-3 !p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal">The defense argues</p>
                        <p className="mt-1 line-clamp-4 font-type text-sm text-ink/85">{c.defenseExcerpt}</p>
                      </div>
                    ) : undefined
                  }
                  footer={
                    user ? (
                      <ClaimButton caseId={c.id} role={role} disabledReason={c.eligibility.ok ? (myClaim ? "Finish your current case first" : undefined) : c.eligibility.reason} />
                    ) : (
                      <Link href={`/login?next=${encodeURIComponent(casePath(c))}`} className={`btn w-full ${role === "DEFENSE" ? "btn-teal" : "btn-crimson"}`}>
                        Sign in to take this case
                      </Link>
                    )
                  }
                />
              ))}
            </div>
          )}
          <Pagination page={queue.page} pages={queue.pages} basePath={copy.path} params={{ category, sort: sort === "newest" ? undefined : sort }} />
        </section>

        <aside className="space-y-6">
          <div className="velvet p-5">
            <p className="eyebrow">Your {role === "DEFENSE" ? "defense" : "prosecution"} record</p>
            {user ? (
              <dl className="mt-4 grid grid-cols-2 gap-4 text-center">
                <Stat label="Wins" value={wins} />
                <Stat label="Losses" value={losses} />
                <Stat label="Win rate" value={percent(wins + losses ? wins / (wins + losses) : null)} />
                <Stat label="Filed" value={filed} />
                <Stat label="Current streak" value={streak} />
                <Stat label="Best streak" value={best} />
              </dl>
            ) : (
              <p className="mt-2 text-sm text-parchment/70">Sign in to start building a legal reputation.</p>
            )}
            <Link href="/leaderboards" className="btn btn-ghost btn-sm mt-5 w-full">
              See the rankings
            </Link>
          </div>
          <div className="velvet p-5 text-sm text-parchment/75">
            <p className="eyebrow mb-2">How it works</p>
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>Claim a case. It&apos;s yours for {cfg.claimMinutes} minutes.</li>
              <li>Write one {role === "DEFENSE" ? "defense" : "rebuttal"}, up to 750 characters.</li>
              <li>{role === "DEFENSE" ? "A prosecutor responds, then the jury votes." : `The jury deliberates for ${cfg.deliberationHours} hours.`}</li>
              <li>{role === "DEFENSE" ? "A Not Guilty verdict means you win." : "A Guilty verdict means you win."}</li>
            </ol>
            <p className="mt-3 text-parchment/55">If your claim runs out, the case returns to the docket for someone else.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-night/40 p-3">
      <dd className="font-display text-2xl font-black text-gold-light">{value}</dd>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-parchment/60">{label}</dt>
    </div>
  );
}
