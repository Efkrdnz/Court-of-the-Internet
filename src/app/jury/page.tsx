import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { getCaseDetail, listJuryCases } from "@/server/queries/cases";
import { refreshCase, runMaintenance } from "@/server/services/maintenance";
import { gameConfig } from "@/server/config";
import { db } from "@/server/db";
import { formatCaseNumber, casePath } from "@/lib/text";
import { getCategory } from "@/lib/categories";
import { percent } from "@/lib/format";
import { ArgumentPanel } from "@/components/case/ArgumentPanel";
import { VoteBooth } from "@/components/case/VoteBooth";
import { CaseFileCard } from "@/components/case/CaseFileCard";
import { CatJury } from "@/components/art/characters";
import { CategoryIcon } from "@/components/art/props";
import { SleepingBailiff } from "@/components/art/scenes";

export const metadata: Metadata = {
  title: "Jury duty",
  description: "Read the confession, the defense and the prosecution, then cast your vote: guilty or not guilty?",
};

export default async function JuryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await runMaintenance();
  const sp = await searchParams;
  const user = await getCurrentUser();
  const viewer = user ? { id: user.id, mutedCategories: user.mutedCategories } : null;
  const queue = await listJuryCases(viewer);

  // Pin the case being judged in the URL so the tally reveal survives the post-vote refresh.
  const pinned = sp.case ? Number(sp.case) : null;
  if (!pinned && queue.cards[0]) redirect(`/jury?case=${queue.cards[0].number}`);

  let focus = null as Awaited<ReturnType<typeof getCaseDetail>>;
  if (pinned && Number.isSafeInteger(pinned)) {
    const ref = await db.case.findUnique({ where: { number: pinned }, select: { id: true } });
    if (ref) {
      await refreshCase(ref.id);
      focus = await getCaseDetail(pinned, user ? { id: user.id, role: user.role } : null);
    }
  }
  const focusCase = focus?.kind === "ok" ? focus.case : null;
  const others = queue.cards.filter((c) => c.number !== pinned).slice(0, 6);
  const stats = user ? await db.userStats.findUnique({ where: { userId: user.id }, select: { juryVotes: true, juryMajorityVotes: true } }) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="velvet relative overflow-hidden bg-gradient-to-br from-gold/15 p-6 sm:p-10">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="animate-in">
            <p className="eyebrow">Game mode · Juror</p>
            <h1 className="mt-2 font-display text-4xl font-black leading-tight text-parchment sm:text-6xl">
              Jury <span className="gilded-text italic">duty</span>
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-parchment/75">
              Read all three statements and cast your vote. You won&apos;t see how others voted until you&apos;ve voted too. Each case needs {gameConfig.quorum} jurors
              for a verdict.
            </p>
            {user && stats ? (
              <p className="mt-4 text-sm text-parchment/70">
                You&apos;ve served on <strong className="text-gold-light">{stats.juryVotes}</strong> juries · sided with the majority{" "}
                <strong className="text-gold-light">{percent(stats.juryVotes ? stats.juryMajorityVotes / stats.juryVotes : null)}</strong> of the time ·{" "}
                <strong className="text-gold-light">{queue.total}</strong> cases await your judgement
              </p>
            ) : null}
          </div>
          <CatJury mood="judging" count={6} className="chr-hover chr-sticker w-full max-w-xs md:w-80" />
        </div>
      </header>

      {focusCase && focus?.kind === "ok" ? (
        <section aria-labelledby="focus-heading" className="mt-10 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <CategoryIcon category={focusCase.category} className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <p className="eyebrow">
                Now judging · Case No. {formatCaseNumber(focusCase.number)} · {getCategory(focusCase.category).label}
              </p>
              <h2 id="focus-heading" className="font-display text-3xl font-black leading-tight text-parchment">
                <Link href={casePath(focusCase)} className="hover:underline">
                  {focusCase.title}
                </Link>
              </h2>
            </div>
          </div>
          <ArgumentPanel kind="confession" person={focusCase.accused} body={focusCase.confession} context={focus.context} filedAt={focusCase.createdAt} category={focusCase.category} />
          <ArgumentPanel kind="defense" person={focusCase.attorney} body={focus.defense?.body ?? null} stricken={focus.defense?.stricken} filedAt={focus.defense?.createdAt} flip />
          <ArgumentPanel kind="prosecution" person={focusCase.prosecutor} body={focus.prosecution?.body ?? null} stricken={focus.prosecution?.stricken} filedAt={focus.prosecution?.createdAt} />
          {focusCase.status === "DELIBERATION" ? (
            <VoteBooth
              key={focusCase.id}
              caseId={focusCase.id}
              endsAt={focusCase.deliberationEndsAt!}
              votesCast={focusCase.votesCast}
              quorum={focus.quorum}
              initialTallies={focusCase.tallies}
              initialVote={focusCase.viewer.vote}
              ineligibleReason={focusCase.viewer.role ? "You're part of this case, so you can't sit on its jury." : user?.bannedAt ? "Banned players cannot vote." : null}
              signedIn={!!user}
              loginHref={`/login?next=${encodeURIComponent(`/jury?case=${focusCase.number}`)}`}
              nextHref="/jury"
            />
          ) : (
            <div className="velvet flex flex-wrap items-center justify-between gap-4 p-6">
              <p className="text-parchment">Deliberation on this case has closed.</p>
              <div className="flex gap-2">
                <Link href={casePath(focusCase)} className="btn btn-sm">
                  See the verdict
                </Link>
                <Link href="/jury" className="btn btn-ghost btn-sm">
                  Next case
                </Link>
              </div>
            </div>
          )}
        </section>
      ) : (
        <div className="velvet mt-10 flex flex-col items-center p-10 text-center">
          <SleepingBailiff className="w-full max-w-sm" />
          <p className="mt-4 font-display text-2xl font-bold text-parchment">No cases need your judgement right now.</p>
          <p className="mt-1 max-w-md text-parchment/70">
            {user ? "You've voted on everything in deliberation. The bailiff has fallen asleep. Come back soon!" : "Nothing is in deliberation right now."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/prosecute" className="btn">
              Prosecute a case
            </Link>
            <Link href="/archives" className="btn btn-ghost">
              Read past verdicts
            </Link>
          </div>
        </div>
      )}

      {others.length ? (
        <section aria-labelledby="others-heading" className="mt-16">
          <h2 id="others-heading" className="rule-ornate mb-6 font-display text-2xl font-bold">
            <span className="text-parchment">Also awaiting a jury</span>
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {others.map((c) => (
              <CaseFileCard
                key={c.id}
                c={c}
                footer={
                  <Link href={`/jury?case=${c.number}`} className="btn btn-sm w-full">
                    Judge this case ({c.votesCast}/{gameConfig.quorum} votes)
                  </Link>
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
