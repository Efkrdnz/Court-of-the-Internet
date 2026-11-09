import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { requireUserOrRedirect } from "@/server/auth/current-user";
import { getDashboard } from "@/server/queries/community";
import { getViewerSummary } from "@/server/queries/players";
import { runMaintenance } from "@/server/services/maintenance";
import { casePath, formatCaseNumber } from "@/lib/text";
import { parseAvatar } from "@/lib/avatar";
import { relativeTime } from "@/lib/format";
import type { CaseCardDTO } from "@/server/queries/cases";
import { Avatar } from "@/components/art/avatar";
import { PigeonAttorney, RaccoonProsecutor, CatJury, HamsterDefendant } from "@/components/art/characters";
import { CategoryIcon } from "@/components/art/props";
import { TumbleweedDocket } from "@/components/art/scenes";
import { StatusPill } from "@/components/case/StatusPill";
import { CaseFileCard } from "@/components/case/CaseFileCard";
import { Countdown } from "@/components/ui/Countdown";
import { FormAlert } from "@/components/ui/FormAlert";

export const metadata: Metadata = { title: "Your courtroom" };

export default async function CourtPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUserOrRedirect("/court");
  await runMaintenance();
  const sp = await searchParams;
  const [d, summary] = await Promise.all([getDashboard(user), getViewerSummary(user.id)]);
  // Banned players can browse but not play, so don't invite them to vote or claim.
  if (user.bannedAt) d.recommended = { jury: [], defense: [], prosecution: [] };

  const quests = [
    { label: "Serve on 3 juries", done: Math.min(d.today.votes, 3), goal: 3, href: "/jury" },
    { label: "File 1 argument", done: Math.min(d.today.arguments, 1), goal: 1, href: "/defend" },
    { label: "Confess 1 crime", done: Math.min(d.today.confessions, 1), goal: 1, href: "/confess" },
  ];
  const questsDone = quests.filter((q) => q.done >= q.goal).length;
  const roleOf = (c: CaseCardDTO) => (c.viewer.role === "ACCUSED" ? "Accused" : c.viewer.role === "DEFENSE" ? "Defense" : c.viewer.role === "PROSECUTION" ? "Prosecutor" : "");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {sp.welcome ? (
        <FormAlert kind="success" className="mb-6">
          Welcome to the bar, {user.displayName}! You&apos;ve been sworn in. Start by serving on a jury, or confess something deliciously petty.
        </FormAlert>
      ) : null}

      {/* Bench header */}
      <header className="velvet grid grid-cols-1 gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center">
        <Avatar config={parseAvatar(user.avatar)} className="h-20 w-20 sm:h-24 sm:w-24" />
        <div className="min-w-0">
          <p className="eyebrow">Your courtroom</p>
          <h1 className="font-display text-3xl font-black text-parchment sm:text-4xl">Good day, {user.displayName.replace(/[.!?]+$/, "")}.</h1>
          <p className="text-parchment/70">
            Level {summary.level.level} · <span className="text-gold-light">{summary.level.title}</span> · Reputation {summary.reputation}
          </p>
          <div className="mt-3 max-w-md">
            <div className="h-2.5 overflow-hidden rounded-full bg-night/60 ring-1 ring-gold/25" role="progressbar" aria-valuenow={summary.level.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level">
              <div className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" style={{ width: `${summary.level.pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-parchment/60">
              {summary.level.current} / {summary.level.needed} XP to level {summary.level.level + 1}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center md:w-72">
          <MiniStat label="XP today" value={`+${d.today.xp}`} />
          <MiniStat label="Votes today" value={d.today.votes} />
          <MiniStat label="Filed today" value={d.today.arguments} />
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          {/* Pending actions */}
          <section aria-labelledby="pending-heading">
            <h2 id="pending-heading" className="mb-4 font-display text-2xl font-bold text-parchment">
              Pending actions
            </h2>
            {d.claims.length === 0 && d.recommended.jury.length === 0 ? (
              <p className="velvet p-5 text-parchment/70">Nothing urgent. Enjoy the quiet; it never lasts in this court.</p>
            ) : (
              <ul className="space-y-3">
                {d.claims.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-gold/50 bg-gold/10 p-4">
                    <CategoryIcon category={c.category} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-parchment">
                        Finish your {c.status === "DEFENSE_CLAIMED" ? "defense" : "prosecution"}: “{c.title}”
                      </p>
                      <p className="text-sm text-parchment/70">
                        Claim expires in <Countdown to={c.claimExpiresAt!} className="font-bold text-gold-light" />
                      </p>
                    </div>
                    <Link href={`/${c.status === "DEFENSE_CLAIMED" ? "defend" : "prosecute"}/${c.id}`} className="btn btn-sm">
                      Open editor
                    </Link>
                  </li>
                ))}
                {d.recommended.jury.slice(0, 2).map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-gold/20 bg-night/40 p-4">
                    <CategoryIcon category={c.category} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-parchment">The jury needs you: “{c.title}”</p>
                      <p className="text-sm text-parchment/70">
                        {c.votesCast >= d.quorum ? `${c.votesCast} votes (quorum reached)` : `${c.votesCast}/${d.quorum} votes`} · closes in <Countdown to={c.deliberationEndsAt!} className="text-gold-light" />
                      </p>
                    </div>
                    <Link href={`/jury?case=${c.number}`} className="btn btn-ghost btn-sm">
                      Vote
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Docket overview */}
          <section aria-labelledby="docket-heading">
            <h2 id="docket-heading" className="mb-4 font-display text-2xl font-bold text-parchment">
              Today&apos;s docket
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DocketDoor href="/defend" count={d.stages.awaitingDefense} label="Awaiting defense" cta="Defend someone" tone="teal">
                <PigeonAttorney className="chr-hover chr-sticker h-28 w-auto" />
              </DocketDoor>
              <DocketDoor href="/prosecute" count={d.stages.awaitingProsecution} label="Awaiting prosecution" cta="Prosecute" tone="crimson">
                <RaccoonProsecutor className="chr-hover chr-sticker h-28 w-auto" />
              </DocketDoor>
              <DocketDoor href="/jury" count={d.stages.deliberation} label="In deliberation" cta="Jury duty" tone="gold">
                <CatJury count={3} mood="judging" className="chr-hover chr-sticker h-28 w-auto" />
              </DocketDoor>
            </div>
          </section>

          {/* My cases */}
          <section aria-labelledby="mine-heading">
            <div className="mb-4 flex items-end justify-between">
              <h2 id="mine-heading" className="font-display text-2xl font-bold text-parchment">
                Your active cases
              </h2>
              <Link href={`/u/${user.username}`} className="inline-flex min-h-9 items-center text-sm font-semibold text-gold-light hover:underline">
                Full history →
              </Link>
            </div>
            {d.active.length === 0 ? (
              <div className="velvet flex flex-wrap items-center gap-6 p-6">
                <HamsterDefendant className="chr-hover chr-sticker w-28" />
                <div className="min-w-0 flex-[1_1_12rem]">
                  <p className="font-display text-xl font-bold text-parchment">No open cases. Suspiciously innocent.</p>
                  <p className="text-parchment/70">Confess something, or take on a client.</p>
                </div>
                <Link href="/confess" className="btn">
                  Confess a crime
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gold/15 overflow-hidden rounded-xl border border-gold/25 bg-night/30">
                {d.active.map((c) => (
                  <li key={c.id}>
                    <Link href={casePath(c)} className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-burgundy/30">
                      <CategoryIcon category={c.category} className="h-9 w-9" />
                      {/* Basis 11rem: on narrow phones the status pill wraps below instead of squeezing the title. */}
                      <div className="min-w-0 flex-[1_1_11rem]">
                        <p className="line-clamp-2 font-bold text-parchment">{c.title}</p>
                        <p className="text-xs text-parchment/60">
                          No. {formatCaseNumber(c.number)} · You: <span className="text-gold-light">{roleOf(c)}</span>
                          {c.anonymous && c.viewer.role === "ACCUSED" ? " (anonymous)" : ""} · {relativeTime(c.createdAt)}
                        </p>
                      </div>
                      <StatusPill status={c.status} verdict={c.verdict} />
                      {c.status === "DELIBERATION" ? <span className="text-xs text-parchment/60">{c.votesCast} votes</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {d.closed.length ? (
              <>
                <h3 className="mb-3 mt-8 font-display text-lg font-bold text-parchment/90">Recently decided</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {d.closed.slice(0, 4).map((c) => (
                    <CaseFileCard key={c.id} c={c} />
                  ))}
                </div>
              </>
            ) : null}
          </section>

          {/* Recommendations */}
          <section aria-labelledby="rec-heading">
            <h2 id="rec-heading" className="mb-4 font-display text-2xl font-bold text-parchment">
              Recommended for you
            </h2>
            {d.recommended.defense.length + d.recommended.prosecution.length === 0 ? (
              <div className="velvet flex flex-col items-center p-8 text-center">
                <TumbleweedDocket className="w-full max-w-xs" />
                <p className="mt-3 text-parchment/70">Every case has counsel. Remarkable.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {d.recommended.defense.map((c) => (
                  <CaseFileCard key={c.id} c={c} footer={<Link className="btn btn-teal btn-sm w-full" href={casePath(c)}>Needs a defense attorney</Link>} />
                ))}
                {d.recommended.prosecution.map((c) => (
                  <CaseFileCard key={c.id} c={c} footer={<Link className="btn btn-crimson btn-sm w-full" href={casePath(c)}>Needs a prosecutor</Link>} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="quests-heading" className="doc doc-ruled p-5">
            <h2 id="quests-heading" className="font-display text-xl font-black">
              Daily docket
            </h2>
            <p className="muted text-sm">
              {questsDone === quests.length ? "All done! The court is impressed." : `${questsDone}/${quests.length} complete · resets at midnight UTC`}
            </p>
            <ul className="mt-4 space-y-3">
              {quests.map((q) => {
                const complete = q.done >= q.goal;
                return (
                  <li key={q.label}>
                    <Link href={q.href} className="group block min-h-9 py-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={clsx("font-bold", complete && "line-through decoration-burgundy/60")}>{q.label}</span>
                        <span className="font-type">
                          {q.done}/{q.goal}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10">
                        <div className={clsx("h-full rounded-full", complete ? "bg-teal" : "bg-burgundy")} style={{ width: `${(q.done / q.goal) * 100}%` }} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="velvet p-5">
            <h2 className="eyebrow mb-3">Quick links</h2>
            <div className="grid gap-2">
              <Link href="/confess" className="btn btn-sm">Confess a crime</Link>
              <Link href="/defend" className="btn btn-teal btn-sm">Defend a stranger</Link>
              <Link href="/prosecute" className="btn btn-crimson btn-sm">Prosecute a defendant</Link>
              <Link href="/jury" className="btn btn-ghost btn-sm">Serve on a jury</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-night/50 p-2.5">
      <p className="font-display text-xl font-black text-gold-light">{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wider text-parchment/60">{label}</p>
    </div>
  );
}

function DocketDoor({ href, count, label, cta, tone, children }: { href: string; count: number; label: string; cta: string; tone: "teal" | "crimson" | "gold"; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={clsx(
        "velvet velvet-hover group flex flex-col items-center overflow-hidden p-5 text-center",
        tone === "teal" && "bg-gradient-to-b from-teal/25",
        tone === "crimson" && "bg-gradient-to-b from-crimson/25",
        tone === "gold" && "bg-gradient-to-b from-gold/20",
      )}
    >
      <div className="flex h-28 items-end">{children}</div>
      <p className="mt-3 font-display text-4xl font-black text-parchment">{count}</p>
      <p className="text-sm font-semibold text-parchment/70">{label}</p>
      <span className="mt-3 text-sm font-bold text-gold-light group-hover:underline">{cta} →</span>
    </Link>
  );
}
