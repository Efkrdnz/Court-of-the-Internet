import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { bumpViewCount, getCaseDetail, getCaseIdByNumber, relatedCases } from "@/server/queries/cases";
import { refreshCase } from "@/server/services/maintenance";
import { appConfig } from "@/server/config";
import { casePath, formatCaseNumber, parseCaseParam } from "@/lib/text";
import { getCategory } from "@/lib/categories";
import { VERDICT_LABEL } from "@/lib/format";
import { db } from "@/server/db";
import { ArgumentPanel, CaseTimeline } from "@/components/case/ArgumentPanel";
import { StatusPill } from "@/components/case/StatusPill";
import { ClaimButton } from "@/components/case/ClaimButton";
import { VoteBooth } from "@/components/case/VoteBooth";
import { VerdictReveal } from "@/components/case/VerdictReveal";
import { ReactionBar } from "@/components/case/ReactionBar";
import { ShareBar } from "@/components/case/ShareBar";
import { ReportDialog } from "@/components/case/ReportDialog";
import { CaseFileCard } from "@/components/case/CaseFileCard";
import { FormAlert } from "@/components/ui/FormAlert";
import { Countdown } from "@/components/ui/Countdown";
import { CategoryIcon, OrnateCorner } from "@/components/art/props";
import { SealedCase, SleepingBailiff } from "@/components/art/scenes";
import { BailiffBulldog } from "@/components/art/characters";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const number = parseCaseParam(slug);
  if (!number) return { title: "Case not found" };
  const c = await db.case.findUnique({
    where: { number },
    select: { title: true, confession: true, verdict: true, status: true, moderationState: true, guiltyVotes: true, notGuiltyVotes: true, number: true, slug: true },
  });
  if (!c || c.moderationState !== "VISIBLE") return { title: "Sealed case", robots: { index: false } };
  const verdict = c.status === "CLOSED" && c.verdict ? `Verdict: ${VERDICT_LABEL[c.verdict]} (${c.guiltyVotes}–${c.notGuiltyVotes}). ` : "";
  const description = `${verdict}“${c.confession.slice(0, 150)}${c.confession.length > 150 ? "…" : ""}”`;
  return {
    title: `Case No. ${formatCaseNumber(c.number)}: ${c.title}`,
    description,
    alternates: { canonical: casePath(c) },
    openGraph: { title: `Case No. ${formatCaseNumber(c.number)}: ${c.title}`, description, type: "article", url: casePath(c) },
    twitter: { card: "summary_large_image", title: c.title, description },
  };
}

const FILED_MESSAGES: Record<string, string> = {
  "1": "Your confession has been entered into the record. An attorney will be appointed by the next available stranger.",
  defense: "Defense filed! The case now awaits a prosecutor.",
  prosecution: "Rebuttal filed! The jury has been seated and deliberation has begun.",
};

export default async function CasePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const number = parseCaseParam(slug);
  if (!number) notFound();
  const ref = await getCaseIdByNumber(number);
  if (!ref) notFound();
  if (slug !== `${ref.number}-${ref.slug}`) permanentRedirect(casePath(ref));

  await refreshCase(ref.id);
  const user = await getCurrentUser();
  const detail = await getCaseDetail(number, user ? { id: user.id, role: user.role } : null);
  if (!detail) notFound();

  if (detail.kind === "removed") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <SealedCase className="mx-auto w-full max-w-sm" />
        <h1 className="mt-6 font-display text-4xl font-black text-parchment">Case No. {formatCaseNumber(detail.number)} has been sealed</h1>
        <p className="mt-3 text-parchment/75">By order of the court, this case was removed for breaking the community rules.</p>
        <Link href="/archives" className="btn mt-8">
          Browse the public archives
        </Link>
      </div>
    );
  }
  if (detail.kind === "review") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <SleepingBailiff className="mx-auto w-full max-w-sm" />
        <h1 className="mt-6 font-display text-4xl font-black text-parchment">This case is under review</h1>
        <p className="mt-3 text-parchment/75">The clerks are looking into a report. Check back later.</p>
      </div>
    );
  }

  const c = detail.case;
  void bumpViewCount(c.id);
  const cat = getCategory(c.category);
  const viewerRole = c.viewer.role;
  const url = `${appConfig.siteUrl}${casePath(c)}`;
  const loginHref = `/login?next=${encodeURIComponent(casePath(c))}`;
  const related = c.status === "CLOSED" ? await relatedCases(c.id, c.category, user) : [];

  const outcome: "won" | "lost" | "majority" | "minority" | null =
    c.status !== "CLOSED" || !c.verdict || c.verdict === "MISTRIAL" || c.verdict === "DISMISSED"
      ? null
      : viewerRole === "DEFENSE" || viewerRole === "ACCUSED"
        ? c.verdict === "NOT_GUILTY"
          ? "won"
          : "lost"
        : viewerRole === "PROSECUTION"
          ? c.verdict === "GUILTY"
            ? "won"
            : "lost"
          : c.viewer.vote
            ? c.viewer.vote === c.verdict
              ? "majority"
              : "minority"
            : null;

  const summary =
    c.status === "CLOSED" && c.verdict
      ? `COURT OF THE INTERNET · Case No. ${formatCaseNumber(c.number)}: “${c.title}”. Verdict: ${VERDICT_LABEL[c.verdict].toUpperCase()}${
          c.tallies ? ` (${c.tallies.guilty} guilty, ${c.tallies.notGuilty} not guilty)` : ""
        }. Read the transcript: ${url}`
      : `COURT OF THE INTERNET · Case No. ${formatCaseNumber(c.number)}: “${c.title}”. The jury needs you: ${url}`;

  const ineligibleVoteReason = !user
    ? null
    : user.bannedAt
      ? "Banned players cannot serve on juries."
      : viewerRole === "ACCUSED"
        ? "You're the accused. Sit tight and look innocent."
        : viewerRole === "DEFENSE"
          ? "You're the defense attorney, so you can't vote. Bite your nails like a professional."
          : viewerRole === "PROSECUTION"
            ? "You're the prosecutor, so you can't vote. Glare at the jury meaningfully instead."
            : null;
  const reactionReason = !user ? "signin" : viewerRole ? "You can't react to your own case." : undefined;
  // The "just filed" banner only shows while it is still accurate (not on a later, closed case).
  const FILED_STAGE: Record<string, string[]> = {
    "1": ["AWAITING_DEFENSE", "DEFENSE_CLAIMED"],
    defense: ["AWAITING_PROSECUTION", "PROSECUTION_CLAIMED"],
    prosecution: ["DELIBERATION"],
  };
  const filedMessage = typeof sp.filed === "string" && FILED_STAGE[sp.filed]?.includes(c.status) ? FILED_MESSAGES[sp.filed] : undefined;

  return (
    <article className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6">
      {filedMessage ? <FormAlert kind="success" className="mb-6 animate-in">{filedMessage}</FormAlert> : null}
      {detail.underReview ? <FormAlert kind="info" className="mb-6">This case is under review by the clerks and hidden from public listings.</FormAlert> : null}

      {/* Caption */}
      <header className="doc doc-ruled relative overflow-hidden px-5 py-8 text-center sm:px-10 sm:py-10">
        <OrnateCorner position="tl" className="absolute left-2 top-2 w-14 text-gold-dark sm:w-20" />
        <OrnateCorner position="tr" className="absolute right-2 top-2 w-14 text-gold-dark sm:w-20" />
        <OrnateCorner position="bl" className="absolute bottom-2 left-2 w-14 text-gold-dark sm:w-20" />
        <OrnateCorner position="br" className="absolute bottom-2 right-2 w-14 text-gold-dark sm:w-20" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="plaque text-sm">Case No. {formatCaseNumber(c.number)}</span>
          <StatusPill status={c.status} verdict={c.verdict} light />
        </div>
        <p className="mt-4 font-display text-sm font-bold uppercase tracking-[0.35em] text-burgundy">In the Court of the Internet</p>
        <p className="mt-1 font-display text-lg italic text-sepia">The People v. {c.accused.displayName.replace(/^You \(as (.*)\)$/, "$1")}</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-balance font-display text-3xl font-black leading-tight text-ink sm:text-5xl">{c.title}</h1>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-sepia">
          <CategoryIcon category={c.category} className="h-7 w-7" />
          <span className="font-bold">{cat.label}</span>
          <span className="font-type">{cat.statute}</span>
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-8">
          <ArgumentPanel kind="confession" person={c.accused} body={c.confession} context={detail.context} filedAt={c.createdAt} category={c.category} />
          <ArgumentPanel
            kind="defense"
            person={c.attorney}
            body={detail.defense?.body ?? null}
            stricken={detail.defense?.stricken}
            filedAt={detail.defense?.createdAt}
            pending={c.status === "DEFENSE_CLAIMED" ? "An attorney is drafting the defense right now…" : "Awaiting a brave attorney."}
            flip
          />
          {c.status !== "AWAITING_DEFENSE" && c.status !== "DEFENSE_CLAIMED" ? (
            <ArgumentPanel
              kind="prosecution"
              person={c.prosecutor}
              body={detail.prosecution?.body ?? null}
              stricken={detail.prosecution?.stricken}
              filedAt={detail.prosecution?.createdAt}
              pending={c.status === "PROSECUTION_CLAIMED" ? "The prosecution is sharpening its rebuttal…" : "Awaiting a prosecutor."}
            />
          ) : null}

          {/* Stage-specific action area */}
          {c.status === "AWAITING_DEFENSE" || c.status === "AWAITING_PROSECUTION" || ((c.status === "DEFENSE_CLAIMED" || c.status === "PROSECUTION_CLAIMED") && !c.claimedBySomeone) ? (
            <StageCallout
              role={c.status.includes("DEFENSE") ? "DEFENSE" : "PROSECUTION"}
              caseId={c.id}
              viewerRole={viewerRole}
              signedIn={!!user}
              loginHref={loginHref}
            />
          ) : null}
          {(c.status === "DEFENSE_CLAIMED" || c.status === "PROSECUTION_CLAIMED") && c.claimedBySomeone ? (
            <div className="velvet flex flex-wrap items-center gap-5 p-6">
              <BailiffBulldog className="chr-hover chr-sticker w-28 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-bold text-parchment">
                  {c.viewer.holdsClaim ? "You're on this case!" : `The ${c.status === "DEFENSE_CLAIMED" ? "defense" : "prosecution"} is drafting.`}
                </p>
                <p className="text-parchment/70">
                  {c.viewer.holdsClaim ? (
                    <>
                      Your claim expires in <Countdown to={c.claimExpiresAt!} className="font-bold text-gold-light" />.
                    </>
                  ) : (
                    "The bailiff is guarding the case file. If they run out of time, it returns to the docket."
                  )}
                </p>
              </div>
              {c.viewer.holdsClaim ? (
                <Link className="btn" href={`/${c.status === "DEFENSE_CLAIMED" ? "defend" : "prosecute"}/${c.id}`}>
                  Open the editor
                </Link>
              ) : null}
            </div>
          ) : null}
          {c.status === "DELIBERATION" ? (
            <VoteBooth
              caseId={c.id}
              endsAt={c.deliberationEndsAt!}
              votesCast={c.votesCast}
              quorum={detail.quorum}
              initialTallies={c.tallies}
              initialVote={c.viewer.vote}
              ineligibleReason={ineligibleVoteReason}
              signedIn={!!user}
              loginHref={loginHref}
            />
          ) : null}
          {c.status === "CLOSED" && c.verdict ? (
            <VerdictReveal caseNumber={c.number} verdict={c.verdict} guilty={c.tallies?.guilty ?? 0} notGuilty={c.tallies?.notGuilty ?? 0} outcome={outcome} />
          ) : null}

          {c.status === "DELIBERATION" || c.status === "CLOSED" ? (
            <section aria-labelledby="react-heading" className="space-y-6">
              <div>
                <h2 id="react-heading" className="mb-3 font-display text-xl font-bold text-parchment">
                  How did the gallery react?
                </h2>
                <ReactionBar caseId={c.id} counts={c.reactions} active={detail.viewerReactions} canReact={!!user && !viewerRole && !user.bannedAt} reason={reactionReason} loginHref={loginHref} />
              </div>
              <div>
                <h2 className="mb-3 font-display text-xl font-bold text-parchment">{c.status === "CLOSED" ? "Spread the verdict" : "Summon more jurors"}</h2>
                <ShareBar url={url} summary={summary} title={c.title} cardHref={`${casePath(c)}/opengraph-image`} closed={c.status === "CLOSED"} />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="velvet p-5">
            <h2 className="eyebrow mb-4">Court record</h2>
            <CaseTimeline events={detail.timeline} />
          </div>
          <div className="velvet space-y-3 p-5 text-sm text-parchment/80">
            <h2 className="eyebrow">Docket details</h2>
            <p>
              <span className="text-parchment/50">Views:</span> {detail.viewCount}
            </p>
            {c.status === "DELIBERATION" ? (
              <p>
                <span className="text-parchment/50">Jurors so far:</span> {c.votesCast >= detail.quorum ? `${c.votesCast} (quorum reached)` : `${c.votesCast} / ${detail.quorum}`}
                {c.extensionsUsed ? " (extended)" : ""}
              </p>
            ) : null}
            {c.status === "CLOSED" && c.tallies ? (
              <p>
                <span className="text-parchment/50">Final tally:</span> {c.tallies.guilty} guilty · {c.tallies.notGuilty} not guilty
              </p>
            ) : null}
            {user && !user.bannedAt ? (
              <div className="border-t border-gold/20 pt-3">
                <ReportDialog
                  caseId={c.id}
                  targets={["CASE", ...(detail.defense ? (["DEFENSE"] as const) : []), ...(detail.prosecution ? (["PROSECUTION"] as const) : [])]}
                  alreadyReported={detail.viewerReports}
                />
              </div>
            ) : null}
            {detail.staff ? (
              <Link href={`/moderation?case=${c.number}`} className="btn btn-ghost btn-sm w-full">
                Open in moderation console
              </Link>
            ) : null}
          </div>
        </aside>
      </div>

      {related.length ? (
        <section aria-labelledby="related-heading" className="mt-16">
          <h2 id="related-heading" className="rule-ornate mb-6 font-display text-2xl font-bold">
            <span className="text-parchment">Related precedent</span>
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {related.map((r) => (
              <CaseFileCard key={r.id} c={r} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function StageCallout({
  role,
  caseId,
  viewerRole,
  signedIn,
  loginHref,
}: {
  role: "DEFENSE" | "PROSECUTION";
  caseId: string;
  viewerRole: string | null;
  signedIn: boolean;
  loginHref: string;
}) {
  const isDefense = role === "DEFENSE";
  const reason =
    viewerRole === "ACCUSED"
      ? isDefense
        ? "You can't defend your own case."
        : "You can't prosecute your own case."
      : viewerRole === "DEFENSE" && !isDefense
        ? "You defended this case."
        : undefined;
  return (
    <div className="velvet flex flex-wrap items-center gap-5 p-6">
      <div className="min-w-0 flex-1">
        <p className="eyebrow">{isDefense ? "Wanted: defense attorney" : "Wanted: prosecutor"}</p>
        <p className="mt-1 font-display text-xl font-bold text-parchment">
          {viewerRole === "ACCUSED"
            ? isDefense
              ? "Your case is waiting for an attorney."
              : "Your defense is in. Now a prosecutor must step forward."
            : isDefense
              ? "This defendant needs a lawyer. Will you take the case?"
              : "The defense has spoken. Who will argue for a conviction?"}
        </p>
      </div>
      <div className="w-full sm:w-64">
        {signedIn ? (
          <ClaimButton caseId={caseId} role={role} disabledReason={reason} />
        ) : (
          <Link href={loginHref} className={`btn w-full ${isDefense ? "btn-teal" : "btn-crimson"}`}>
            Sign in to take this case
          </Link>
        )}
      </div>
    </div>
  );
}
