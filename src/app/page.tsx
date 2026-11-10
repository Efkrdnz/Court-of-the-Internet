import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { getCommunityStats, getFeaturedCase, getHighlights, getRecentVerdicts } from "@/server/queries/community";
import { runMaintenance } from "@/server/services/maintenance";
import { gameConfig } from "@/server/config";
import { casePath, formatCaseNumber, pluralize } from "@/lib/text";
import { compact, percent } from "@/lib/format";
import { JudgeOwl, PigeonAttorney, RaccoonProsecutor, HamsterDefendant, CatJury, BailiffBulldog, CryingPizza } from "@/components/art/characters";
import { FlourishDivider, VerdictStamp, WaxSeal, Gavel } from "@/components/art/props";
import { Avatar } from "@/components/art/avatar";
import { CaseFileCard } from "@/components/case/CaseFileCard";
import { FormAlert } from "@/components/ui/FormAlert";

export default async function LandingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await runMaintenance();
  const sp = await searchParams;
  const user = await getCurrentUser();
  const [stats, featured, recent, highlights] = await Promise.all([getCommunityStats(), getFeaturedCase(user), getRecentVerdicts(user, 6), getHighlights(user)]);

  const modes = [
    {
      href: "/confess",
      title: "Confess a crime",
      blurb: "Admit your pettiest offense. Strangers decide your fate.",
      art: <HamsterDefendant nervous className="h-36 w-auto" />,
      tone: "from-gold/25",
      cta: "Confess",
    },
    {
      href: "/defend",
      title: "Defend a stranger",
      blurb: "Claim a case. Spin the crime into a public service.",
      art: <PigeonAttorney className="h-36 w-auto" />,
      tone: "from-teal/35",
      cta: "Defend",
    },
    {
      href: "/prosecute",
      title: "Prosecute",
      blurb: "Read the defense. Tear it apart. Point dramatically.",
      art: <RaccoonProsecutor className="h-36 w-auto" />,
      tone: "from-crimson/35",
      cta: "Prosecute",
    },
    {
      href: "/jury",
      title: "Jury duty",
      blurb: "Read all three statements and cast the deciding vote.",
      art: <CatJury count={3} mood="judging" className="h-36 w-auto" />,
      tone: "from-plum/50",
      cta: "Vote",
    },
  ];

  return (
    <div>
      {sp.farewell ? (
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <FormAlert kind="info">Your account has been deleted. The court will remember you fondly (and anonymously).</FormAlert>
        </div>
      ) : null}

      {/* ---------- Hero: the courtroom ---------- */}
      <section className="relative overflow-hidden">
        <div className="spotlight pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,230,160,0.22),transparent_65%)]" aria-hidden />
        <div className="mx-auto grid grid-cols-1 max-w-7xl items-center gap-10 px-4 pb-6 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div className="relative z-10 text-center lg:text-left">
            <p className="eyebrow animate-in">The internet&apos;s most prestigious court for its least important crimes</p>
            <h1 className="animate-in-delay-1 mt-4 text-balance font-display text-5xl font-black leading-[1.02] text-parchment sm:text-7xl">
              Justice for the <span className="gilded-text italic">pettiest</span> crimes ever committed.
            </h1>
            <p className="animate-in-delay-2 mx-auto mt-5 max-w-xl text-lg text-parchment/80 lg:mx-0">
              Confess that you ate the last slice. Let a pigeon in a suit defend you. Watch a raccoon demand justice. Then a jury of strangers decides your fate,
              live, in a court that takes this <em>far</em> too seriously.
            </p>
            <div className="animate-in-delay-3 mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link href="/confess" className="btn btn-lg">
                Confess a crime
              </Link>
              <Link href="/defend" className="btn btn-teal btn-lg">
                Defend
              </Link>
              <Link href="/prosecute" className="btn btn-crimson btn-lg">
                Prosecute
              </Link>
              <Link href="/jury" className="btn btn-ghost btn-lg">
                Jury duty
              </Link>
            </div>
            <p className="mt-5 text-sm text-parchment/55">
              {user ? "Catch up on past verdicts in the" : "Free to play · no registration needed to browse the"}{" "}
              <Link href="/archives" className="inline-flex min-h-9 items-center font-semibold text-gold-light underline underline-offset-2">
                public archives
              </Link>
            </p>
          </div>

          {/* Animated courtroom scene */}
          <div className="relative mx-auto aspect-[5/4] w-full max-w-xl" aria-label="An illustrated courtroom: an owl judge, a pigeon attorney, a raccoon prosecutor, a nervous hamster and a jury of cats" role="img">
            <div className="absolute inset-x-[6%] bottom-[18%] top-[6%] rounded-t-[40%] border-x-4 border-t-4 border-gold/40 bg-gradient-to-b from-burgundy/60 to-burgundy-dark/80 shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]" />
            <div className="absolute left-1/2 top-[2%] w-[38%] -translate-x-1/2">
              <JudgeOwl className="chr-hover chr-sticker w-full" />
            </div>
            <div className="absolute inset-x-[10%] top-[44%] h-[14%] rounded-md border-2 border-gold/60 bg-gradient-to-b from-[#6b3a22] to-[#3d1f12] shadow-xl">
              <WaxSeal color="gold" emblem="scales" className="absolute left-1/2 top-1/2 h-[90%] -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="absolute bottom-[3%] left-0 w-[30%] sm:left-[-2%]">
              <PigeonAttorney className="chr-hover chr-sticker w-full" />
            </div>
            <div className="absolute bottom-[1%] left-[33%] w-[26%]">
              <HamsterDefendant nervous className="chr-hover chr-sticker w-full" />
            </div>
            <div className="absolute bottom-[3%] right-0 w-[33%] sm:right-[-4%]">
              <RaccoonProsecutor className="chr-hover chr-sticker w-full" />
            </div>
            <div className="doc !absolute -right-4 top-[18%] hidden w-[27%] rotate-6 p-1.5 sm:block">
              <VerdictStamp verdict="GUILTY" animate className="w-full" />
            </div>
            <div className="absolute -left-4 top-[24%] hidden w-[22%] -rotate-12 sm:block">
              <Gavel className="w-full" />
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <CatJury count={6} mood="judging" className="chr-hover chr-sticker mx-auto -mt-2 w-full max-w-md" />
        </div>
      </section>

      {/* ---------- Community stats ---------- */}
      <section aria-label="Community statistics" className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        <dl className="velvet grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-4">
          {[
            [compact(stats.cases), "crimes confessed"],
            [compact(stats.votes), "jury votes cast"],
            [percent(stats.convictionRate), "conviction rate"],
            [compact(stats.players), "sworn-in players"],
          ].map(([value, label]) => (
            <div key={label} className="bg-night/30 px-4 py-6 text-center">
              <dd className="font-display text-4xl font-black text-gold-light sm:text-5xl">{value}</dd>
              <dt className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-parchment/60">{label}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-center text-sm text-parchment/60">
          Right now: {pluralize(stats.inDeliberation, "case")} before a jury · {stats.awaiting.toLocaleString("en-US")} awaiting counsel · {pluralize(stats.todayVotes, "vote")} in the last 24h
        </p>
      </section>

      {/* ---------- Game modes ---------- */}
      <section aria-labelledby="modes-heading" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <h2 id="modes-heading" className="text-center font-display text-4xl font-black text-parchment sm:text-5xl">
          Pick your <span className="gilded-text italic">role</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-parchment/70">Every case needs all four. There&apos;s always something to do.</p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modes.map((m) => (
            <Link key={m.href} href={m.href} className={`velvet velvet-hover chr-hover group flex flex-col items-center bg-gradient-to-b ${m.tone} p-6 text-center`}>
              {/* Art shrinks to fit the card (four across at 1024px) instead of spilling over its edges. */}
              <div className="chr-sticker flex h-40 w-full items-end justify-center transition-transform duration-300 group-hover:-translate-y-1 [&>svg]:max-w-full">{m.art}</div>
              <h3 className="mt-4 font-display text-2xl font-black text-parchment">{m.title}</h3>
              <p className="mt-1 text-sm text-parchment/70">{m.blurb}</p>
              <span className="btn btn-sm mt-5">{m.cta} →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Featured case ---------- */}
      {featured ? (
        <section aria-labelledby="featured-heading" className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="eyebrow">Featured case of the day</p>
              <h2 id="featured-heading" className="mt-2 font-display text-4xl font-black text-parchment">
                Today&apos;s most scandalous ruling
              </h2>
              <p className="mt-3 text-parchment/70">Hand-picked by the bench from the most-discussed verdicts. Read the arguments. Agree with the jury. Or don&apos;t.</p>
              <Link href={casePath(featured)} className="btn mt-6">
                Read the transcript
              </Link>
            </div>
            <CaseFileCard c={featured} className="ring-2 ring-gold/60" />
          </div>
        </section>
      ) : null}

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" aria-labelledby="how-heading" className="mx-auto mt-24 max-w-6xl scroll-mt-24 px-4 sm:px-6">
        <FlourishDivider className="mx-auto mb-8 h-8 w-full max-w-lg text-gold" />
        <h2 id="how-heading" className="text-center font-display text-4xl font-black text-parchment sm:text-5xl">
          How a trial works
        </h2>
        <ol className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-5">
          {[
            ["I", "Confession", "A player confesses a ridiculous, harmless crime, publicly or anonymously."],
            ["II", "Defense", "Another player claims the case and writes one defense (750 characters max)."],
            ["III", "Prosecution", "A third player reads both and argues for conviction."],
            ["IV", "Deliberation", `The jury votes for ${Math.round(gameConfig.deliberationMs / 3_600_000)} hours. Tallies stay hidden until you vote. ${gameConfig.quorum} votes are needed.`],
            ["V", "Verdict", "Guilty, Not Guilty, or Mistrial. Winners earn XP, reputation and achievements, and the case enters the archives forever."],
          ].map(([n, title, body]) => (
            <li key={n} className="doc doc-ruled relative p-5 pt-8">
              <span className="plaque absolute -top-4 left-5 text-sm">{n}</span>
              <h3 className="font-display text-xl font-black">{title}</h3>
              <p className="muted mt-2 text-sm">{body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 grid grid-cols-1 gap-4 text-sm text-parchment/70 md:grid-cols-3">
          <p className="velvet p-4">
            <strong className="text-gold-light">Too few jurors?</strong> Deliberation is extended once. If quorum still isn&apos;t reached, the case is dismissed and
            nobody wins or loses.
          </p>
          <p className="velvet p-4">
            <strong className="text-gold-light">Abandoned a case?</strong> Claims last {Math.round(gameConfig.claimMs / 60_000)} minutes. If time runs out, the case goes back on the docket.
          </p>
          <p className="velvet p-4">
            <strong className="text-gold-light">Fair play.</strong> You can never judge your own case, defend yourself, or buy a verdict. Everything is enforced
            by the court&apos;s servers.
          </p>
        </div>
      </section>

      {/* ---------- Recent verdicts ---------- */}
      {recent.length ? (
        <section aria-labelledby="recent-heading" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 id="recent-heading" className="font-display text-4xl font-black text-parchment">
              Fresh from the bench
            </h2>
            <Link href="/archives" className="inline-flex min-h-9 items-center font-semibold text-gold-light hover:underline">
              Browse all verdicts →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((c) => (
              <CaseFileCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------- Community highlights ---------- */}
      {highlights.closest || highlights.blowout || highlights.legendary || highlights.attorneyOfTheMonth ? (
        <section aria-labelledby="highlights-heading" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
          <h2 id="highlights-heading" className="text-center font-display text-4xl font-black text-parchment">
            Community highlights
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {highlights.closest ? (
              <Highlight label="Closest call" title={highlights.closest.title} href={casePath(highlights.closest)} detail={highlights.closest.tallies ? `${highlights.closest.tallies.guilty}–${highlights.closest.tallies.notGuilty}` : ""} art={<CatJury count={3} mood="shocked" className="h-24 w-auto" />} />
            ) : null}
            {highlights.blowout ? (
              <Highlight label="Biggest blowout" title={highlights.blowout.title} href={casePath(highlights.blowout)} detail={highlights.blowout.tallies ? `${highlights.blowout.tallies.guilty}–${highlights.blowout.tallies.notGuilty}` : ""} art={<BailiffBulldog className="h-24 w-auto" />} />
            ) : null}
            {highlights.legendary ? (
              <Highlight label="Most legendary" title={highlights.legendary.title} href={casePath(highlights.legendary)} detail={`${highlights.legendary.reactions.LEGENDARY} Legendary reactions`} art={<CryingPizza className="h-24 w-auto" />} />
            ) : null}
            {highlights.attorneyOfTheMonth ? (
              <Highlight
                label="Attorney of the month"
                title={highlights.attorneyOfTheMonth.displayName}
                href={`/u/${highlights.attorneyOfTheMonth.username}`}
                detail={`${highlights.attorneyOfTheMonth.wins} acquittals won`}
                art={<Avatar config={highlights.attorneyOfTheMonth.avatar} className="h-24 w-24" />}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ---------- Final CTA ---------- */}
      <section className="mx-auto mt-24 max-w-4xl px-4 sm:px-6">
        <div className="doc doc-ruled flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:text-left">
          <WaxSeal color="burgundy" emblem="gavel" className="h-28 w-28 shrink-0" />
          <div className="flex-1">
            <h2 className="font-display text-3xl font-black">The court is now in session.</h2>
            <p className="muted mt-1">Case No. {formatCaseNumber(stats.nextCaseNumber)} could be yours. What did you do?</p>
          </div>
          <Link href={user ? "/confess" : "/signup"} className="btn btn-burgundy btn-lg">
            {user ? "Confess now" : "Get sworn in"}
          </Link>
        </div>
      </section>
    </div>
  );
}

function Highlight({ label, title, href, detail, art }: { label: string; title: string; href: string; detail: string; art: React.ReactNode }) {
  return (
    <Link href={href} className="velvet velvet-hover chr-hover flex min-w-0 flex-col items-center p-5 text-center">
      <div className="chr-sticker flex h-24 w-full items-end justify-center [&>svg]:max-w-full">{art}</div>
      <p className="eyebrow mt-3">{label}</p>
      {/* w-full lets a long unbroken name wrap inside the card instead of widening the page. */}
      <p className="mt-1 line-clamp-2 w-full break-words font-display text-lg font-bold text-parchment">{title}</p>
      <p className="text-sm text-parchment/60">{detail}</p>
    </Link>
  );
}
