import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserOrRedirect } from "@/server/auth/current-user";
import { db } from "@/server/db";
import { grantableItems } from "@/server/services/moderation";
import { casePath, cleanQuery, formatCaseNumber, parseCaseParam } from "@/lib/text";
import { formatDateTime, relativeTime, STATUS_LABEL, VERDICT_LABEL } from "@/lib/format";
import { REPORT_REASONS } from "@/lib/validation";
import { ModFlashProvider } from "@/components/forms/ModFlash";
import { ModForm } from "@/components/forms/ModForm";
import { JudgeOwl } from "@/components/art/characters";

// Neutral title: non-staff get a 404 here, and the tab shouldn't reveal what the page is.
export const metadata: Metadata = { title: "Officers only", robots: { index: false } };

const reasonLabel = (r: string) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

export default async function ModerationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUserOrRedirect("/moderation");
  if (user.role !== "ADMIN" && user.role !== "MODERATOR") notFound();
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;
  const caseNumber = sp.case ? parseCaseParam(String(sp.case)) : null;
  const lookupUser = cleanQuery(sp.user, 40).toLowerCase() || undefined;

  const [queue, log, focusCase, focusUser, totals] = await Promise.all([
    db.case.findMany({
      where: { OR: [{ openReports: { gt: 0 } }, { moderationState: "UNDER_REVIEW" }] },
      orderBy: [{ moderationState: "desc" }, { openReports: "desc" }, { updatedAt: "desc" }],
      take: 30,
      select: {
        id: true,
        number: true,
        slug: true,
        title: true,
        confession: true,
        moderationState: true,
        openReports: true,
        status: true,
        anonymous: true,
        accused: { select: { username: true } },
        reports: { where: { status: "OPEN" }, select: { reason: true, target: true, details: true, createdAt: true, reporter: { select: { username: true } } } },
      },
    }),
    db.moderationAction.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, action: true, note: true, createdAt: true, moderator: { select: { username: true } }, case: { select: { number: true, slug: true } }, targetUserId: true },
    }),
    caseNumber && Number.isSafeInteger(caseNumber)
      ? db.case.findUnique({
          where: { number: caseNumber },
          select: {
            id: true,
            number: true,
            slug: true,
            title: true,
            confession: true,
            status: true,
            verdict: true,
            moderationState: true,
            removalReason: true,
            anonymous: true,
            guiltyVotes: true,
            notGuiltyVotes: true,
            deliberationPausedAt: true,
            accused: { select: { username: true } },
            arguments: { select: { role: true, body: true, stricken: true } },
          },
        })
      : null,
    lookupUser
      ? db.user.findUnique({
          where: { username: lookupUser },
          select: { id: true, username: true, displayName: true, role: true, bannedAt: true, banReason: true, createdAt: true, entitlements: { select: { itemKey: true } }, stats: true },
        })
      : null,
    db.report.count({ where: { status: "OPEN" } }),
  ]);
  // Name the player behind ban/unban entries (stored as an id).
  const targetIds = [...new Set(log.map((l) => l.targetUserId).filter((id): id is string => !!id))];
  const targetNames = new Map(
    (await db.user.findMany({ where: { id: { in: targetIds } }, select: { id: true, username: true } })).map((u) => [u.id, u.username]),
  );

  return (
    <ModFlashProvider>
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="eyebrow">Officers of the court only</p>
          <h1 className="font-display text-4xl font-black text-parchment sm:text-5xl">Moderation console</h1>
          <p className="mt-2 text-parchment/70">
            {totals} open reports · {queue.length} {queue.length === 1 ? "case needs" : "cases need"} attention · signed in as {isAdmin ? "Presiding Judge (admin)" : "Court Clerk (moderator)"}
          </p>
        </div>
        <JudgeOwl mood="stern" className="chr-sticker hidden w-36 md:block" />
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <form action="/moderation" className="velvet on-dark flex gap-2 p-4">
          <label className="sr-only" htmlFor="mod-case">
            Case number
          </label>
          <input id="mod-case" name="case" inputMode="numeric" defaultValue={sp.case ?? ""} placeholder="Look up case number…" className="input" />
          <button className="btn btn-sm">Open</button>
        </form>
        <form action="/moderation" className="velvet on-dark flex gap-2 p-4">
          <label className="sr-only" htmlFor="mod-user">
            Username
          </label>
          <input id="mod-user" name="user" defaultValue={sp.user ?? ""} placeholder="Look up username…" className="input" />
          <button className="btn btn-sm">Open</button>
        </form>
      </div>

      {sp.case && !focusCase ? <p className="mt-4 text-[#ff9d9d]">No case with that number.</p> : null}
      {focusCase ? (
        <section aria-labelledby="focus-case" className="velvet mt-6 space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">
                Case No. {formatCaseNumber(focusCase.number)} · {STATUS_LABEL[focusCase.status]}
                {focusCase.verdict ? ` · ${VERDICT_LABEL[focusCase.verdict]}` : ""} · {focusCase.moderationState}
              </p>
              <h2 id="focus-case" className="font-display text-2xl font-bold text-parchment">
                <Link href={casePath(focusCase)} className="hover:underline">
                  {focusCase.title}
                </Link>
              </h2>
              <p className="text-sm text-parchment/60">
                {/* Staff can also sit on juries, so the split stays hidden until the verdict, as for everyone. */}
                {focusCase.status === "CLOSED"
                  ? `Votes: ${focusCase.guiltyVotes} guilty · ${focusCase.notGuiltyVotes} not guilty`
                  : `Votes: ${focusCase.guiltyVotes + focusCase.notGuiltyVotes} cast (split hidden until the verdict)`}{" "}
                · Accused: @{focusCase.accused.username}
                {focusCase.anonymous ? " (anonymous publicly)" : ""}
              </p>
              {focusCase.deliberationPausedAt ? (
                <p className="mt-1 text-sm font-semibold text-gold-light">
                  Deliberation clock paused since {formatDateTime(focusCase.deliberationPausedAt)}. It resumes with the remaining time when the case is restored or its reports are dismissed.
                </p>
              ) : null}
            </div>
          </div>
          <p className="rounded-lg bg-night/40 p-3 font-type text-sm text-parchment/85">{focusCase.confession}</p>
          {focusCase.arguments.map((a) => (
            <div key={a.role} className="rounded-lg bg-night/40 p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gold-light">
                {a.role} {a.stricken ? "(stricken)" : ""}
              </p>
              <p className="font-type text-sm text-parchment/85">{a.body}</p>
              <div className="mt-2">
                <ModForm
                  op={`${a.stricken ? "unstrike" : "strike"}-${a.role === "DEFENSE" ? "defense" : "prosecution"}`}
                  label={a.stricken ? "Reinstate argument" : "Strike from the record"}
                  caseId={focusCase.id}
                  tone={a.stricken ? "ghost" : "crimson"}
                />
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-3 border-t border-gold/20 pt-4">
            {focusCase.moderationState === "REMOVED" ? (
              <ModForm op="restore" label="Restore case" caseId={focusCase.id} tone="teal" />
            ) : (
              <ModForm op="remove" label="Remove (seal) case" caseId={focusCase.id} tone="crimson" withReason reasonPlaceholder="Reason shown to the author" confirmText="Seal this case? It disappears from all public pages." />
            )}
            {focusCase.moderationState === "UNDER_REVIEW" ? <ModForm op="dismiss" label="Dismiss reports & make visible" caseId={focusCase.id} tone="teal" /> : null}
            {focusCase.status === "DELIBERATION" && focusCase.moderationState === "VISIBLE" ? (
              <ModForm op="adjourn" label={`Adjourn now (${focusCase.guiltyVotes + focusCase.notGuiltyVotes} votes; quorum rules apply)`} caseId={focusCase.id} confirmText="End deliberation now?" />
            ) : null}
            {focusCase.status === "CLOSED" && focusCase.moderationState === "VISIBLE" ? <ModForm op="feature" label="Pin as featured case of the day" caseId={focusCase.id} /> : null}
          </div>
        </section>
      ) : null}

      {lookupUser && !focusUser ? <p className="mt-4 text-[#ff9d9d]">No user with that username.</p> : null}
      {focusUser ? (
        <section aria-labelledby="focus-user" className="velvet mt-6 space-y-4 p-6">
          <h2 id="focus-user" className="font-display text-2xl font-bold text-parchment">
            <Link href={`/u/${focusUser.username}`} className="hover:underline">
              {focusUser.displayName}
            </Link>{" "}
            <span className="text-base text-parchment/60">
              @{focusUser.username} · {focusUser.role} · joined {relativeTime(focusUser.createdAt)}
            </span>
          </h2>
          {focusUser.bannedAt ? <p className="text-[#ff9d9d]">Banned {relativeTime(focusUser.bannedAt)}: {focusUser.banReason}</p> : null}
          <p className="text-sm text-parchment/70">
            XP {focusUser.stats?.xp ?? 0} · reputation {focusUser.stats?.reputation ?? 0} · confessions {focusUser.stats?.totalConfessions ?? 0} · votes {focusUser.stats?.juryVotes ?? 0}
          </p>
          <div className="flex flex-col gap-3">
            {focusUser.id !== user.id ? (
              focusUser.bannedAt ? (
                <ModForm op="unban" label="Lift ban" userId={focusUser.id} tone="teal" />
              ) : (
                <ModForm op="ban" label="Ban (contempt of court)" userId={focusUser.id} tone="crimson" withReason reasonPlaceholder="Reason" confirmText="Ban this user? Their sessions end and claims are released." />
              )
            ) : null}
            <ModForm op="audit" label="Audit stats against history" userId={focusUser.id} />
            {isAdmin && focusUser.role !== "ADMIN" ? (
              focusUser.role === "MODERATOR" ? (
                <ModForm op="make-player" label="Remove moderator role" userId={focusUser.id} />
              ) : (
                <ModForm op="make-mod" label="Appoint as moderator" userId={focusUser.id} />
              )
            ) : null}
            {isAdmin ? <ModForm op="grant" label="Grant cosmetic" userId={focusUser.id} options={{ name: "itemKey", values: grantableItems() }} /> : null}
            {focusUser.entitlements.length ? (
              <p className="text-xs text-parchment/60">Entitlements: {focusUser.entitlements.map((e) => e.itemKey).join(", ")}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="queue-heading" className="mt-10">
        <h2 id="queue-heading" className="mb-4 font-display text-2xl font-bold text-parchment">
          Report queue
        </h2>
        {queue.length === 0 ? (
          <p className="velvet p-6 text-parchment/70">No open reports. The internet is behaving (for now).</p>
        ) : (
          <ul className="space-y-4">
            {queue.map((c) => (
              <li key={c.id} className="velvet p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow">
                      No. {formatCaseNumber(c.number)} · {c.moderationState} · {c.openReports} reporter(s)
                    </p>
                    <p className="font-display text-lg font-bold text-parchment">{c.title}</p>
                    <p className="text-sm text-parchment/60">by @{c.accused.username}</p>
                  </div>
                  <Link href={`/moderation?case=${c.number}`} className="btn btn-sm">
                    Review
                  </Link>
                </div>
                <p className="mt-2 line-clamp-2 font-type text-sm text-parchment/80">{c.confession}</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {c.reports.map((r, i) => (
                    <li key={i} className="text-parchment/75">
                      <strong className="text-[#ffb3b3]">{reasonLabel(r.reason)}</strong> on {r.target.toLowerCase()} by @{r.reporter.username} · {relativeTime(r.createdAt)}
                      {r.details ? <span className="italic">: “{r.details}”</span> : null}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-3">
                  <ModForm op="dismiss" label="Dismiss reports" caseId={c.id} tone="teal" />
                  <ModForm op="remove" label="Remove" caseId={c.id} tone="crimson" withReason reasonPlaceholder="Reason" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="log-heading" className="mt-10">
        <h2 id="log-heading" className="mb-4 font-display text-2xl font-bold text-parchment">
          Audit log
        </h2>
        {log.length === 0 ? (
          <p className="text-parchment/60">No moderation actions yet.</p>
        ) : (
          <ul className="divide-y divide-gold/15 rounded-xl border border-gold/20 bg-night/30 text-sm">
            {log.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 px-4 py-1 text-parchment/80">
                <span className="font-bold text-gold-light">{l.action}</span>
                <span>by @{l.moderator.username}</span>
                {l.targetUserId ? <span>→ @{targetNames.get(l.targetUserId) ?? "unknown"}</span> : null}
                {l.case ? <Link href={casePath(l.case)} className="inline-flex min-h-9 items-center underline">case {formatCaseNumber(l.case.number)}</Link> : null}
                {l.note ? <span className="italic">“{l.note}”</span> : null}
                <span className="ml-auto text-parchment/50">{relativeTime(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
    </ModFlashProvider>
  );
}
