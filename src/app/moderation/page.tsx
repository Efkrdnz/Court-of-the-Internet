import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserOrRedirect } from "@/server/auth/current-user";
import { db } from "@/server/db";
import { grantableItems } from "@/server/services/moderation";
import { utcDay } from "@/server/queries/community";
import { cosmeticLabel } from "@/lib/cosmetics";

const ROLE_LABEL: Record<string, string> = { PLAYER: "Player", MODERATOR: "Moderator", ADMIN: "Admin" };
import { casePath, cleanQuery, formatCaseNumber, pageParam, parseCaseParam, pluralize } from "@/lib/text";
import { formatDateTime, MODERATION_STATE_LABEL, moderationActionLabel, relativeTime, STATUS_LABEL, VERDICT_LABEL } from "@/lib/format";
import { REPORT_REASONS } from "@/lib/validation";
import { ModFlashProvider } from "@/components/forms/ModFlash";
import { ModForm } from "@/components/forms/ModForm";
import { JudgeOwl } from "@/components/art/characters";

// Neutral title: non-staff get a 404 here, and the tab shouldn't reveal what the page is.
export const metadata: Metadata = { title: "Officers only", robots: { index: false } };

const reasonLabel = (r: string) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

const LOG_PAGE = 30;
const QUEUE_PAGE = 30;

export default async function ModerationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUserOrRedirect("/moderation");
  if (user.role !== "ADMIN" && user.role !== "MODERATOR") notFound();
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;
  const caseNumber = sp.case ? parseCaseParam(String(sp.case)) : null;
  const lookupUser = cleanQuery(sp.user, 40).toLowerCase() || undefined;
  const logPage = pageParam(sp.log, 500);
  const queuePage = pageParam(sp.queue, 500);
  const pageHref = (pages: { log?: number; queue?: number }, anchor: string) => {
    const q = new URLSearchParams();
    if (sp.case) q.set("case", String(sp.case));
    if (sp.user) q.set("user", String(sp.user));
    const log = pages.log ?? logPage;
    const queue = pages.queue ?? queuePage;
    if (queue > 1) q.set("queue", String(queue));
    if (log > 1) q.set("log", String(log));
    const qs = q.toString();
    return `/moderation${qs ? `?${qs}` : ""}#${anchor}`;
  };
  const logHref = (page: number) => pageHref({ log: page }, "log-heading");

  const [queue, log, focusCase, focusUser, totals, queueCount, featuredToday] = await Promise.all([
    db.case.findMany({
      where: { OR: [{ openReports: { gt: 0 } }, { moderationState: "UNDER_REVIEW" }] },
      orderBy: [{ moderationState: "desc" }, { openReports: "desc" }, { updatedAt: "desc" }],
      skip: (queuePage - 1) * QUEUE_PAGE,
      take: QUEUE_PAGE,
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
        reports: { where: { status: "OPEN" }, select: { id: true, reason: true, target: true, details: true, createdAt: true, reporter: { select: { username: true } } } },
      },
    }),
    db.moderationAction.findMany({
      orderBy: { createdAt: "desc" },
      // One extra row tells us whether there's an older page.
      skip: (logPage - 1) * LOG_PAGE,
      take: LOG_PAGE + 1,
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
            deliberationEndsAt: true,
            extensionsUsed: true,
            reports: { where: { status: "OPEN" }, select: { id: true } },
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
    db.case.count({ where: { OR: [{ openReports: { gt: 0 } }, { moderationState: "UNDER_REVIEW" }] } }),
    db.featuredCase.findUnique({ where: { day: utcDay() }, select: { caseId: true } }),
  ]);
  // The seal this console shows, so a stale "Restore" can't lift a newer seal.
  const sealSeen =
    focusCase?.moderationState === "REMOVED"
      ? ((await db.moderationAction.findFirst({ where: { caseId: focusCase.id, action: "REMOVE_CASE" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true } }))?.id ?? "")
      : "";
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
            {pluralize(totals, "open report")} · {queueCount.toLocaleString("en-US")} {queueCount === 1 ? "case needs" : "cases need"} attention · signed in as {isAdmin ? "Presiding Judge (admin)" : "Court Clerk (moderator)"}
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
            <div className="min-w-0 flex-[1_1_14rem] break-words">
              <p className="eyebrow">
                Case No. {formatCaseNumber(focusCase.number)} · {STATUS_LABEL[focusCase.status]}
                {focusCase.verdict ? ` · ${VERDICT_LABEL[focusCase.verdict]}` : ""} · {MODERATION_STATE_LABEL[focusCase.moderationState]}
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
                {a.role === "DEFENSE" ? "Defense" : "Prosecution"} {a.stricken ? "(stricken)" : ""}
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
              <ModForm op="restore" label="Restore case" caseId={focusCase.id} tone="teal" hidden={{ sealSeen }} />
            ) : (
              <ModForm op="remove" label="Remove (seal) case" caseId={focusCase.id} tone="crimson" withReason reasonPlaceholder="Reason shown to the author" confirmText="Seal this case? It disappears from all public pages." />
            )}
            {focusCase.moderationState === "UNDER_REVIEW" ? <ModForm op="dismiss" label="Dismiss reports & make visible" caseId={focusCase.id} tone="teal" hidden={{ reportsSeen: focusCase.reports.map((r) => r.id).join(",") }} /> : null}
            {focusCase.status === "DELIBERATION" && focusCase.moderationState === "VISIBLE" ? (
              <ModForm op="adjourn" label={`Adjourn now (${pluralize(focusCase.guiltyVotes + focusCase.notGuiltyVotes, "vote")}; quorum rules apply)`} caseId={focusCase.id} hidden={{ endsAt: focusCase.deliberationEndsAt?.toISOString() ?? "", extensionsUsed: String(focusCase.extensionsUsed) }} confirmText="End deliberation now?" />
            ) : null}
            {focusCase.status === "CLOSED" && focusCase.moderationState === "VISIBLE" ? <ModForm op="feature" label="Pin as featured case of the day" caseId={focusCase.id} hidden={{ featuredSeen: featuredToday?.caseId ?? "" }} /> : null}
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
              @{focusUser.username} · {ROLE_LABEL[focusUser.role] ?? focusUser.role} · joined {relativeTime(focusUser.createdAt)}
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
            {isAdmin ? <ModForm op="grant" label="Grant cosmetic" userId={focusUser.id} options={{ name: "itemKey", label: "Cosmetic to grant", values: grantableItems().map((value) => ({ value, label: cosmeticLabel(value) })) }} /> : null}
            {focusUser.entitlements.length ? (
              <p className="text-xs text-parchment/60">Entitlements: {focusUser.entitlements.map((e) => cosmeticLabel(e.itemKey)).join(", ")}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="queue-heading" className="mt-10">
        <h2 id="queue-heading" className="mb-4 font-display text-2xl font-bold text-parchment">
          Report queue
        </h2>
        {queue.length === 0 ? (
          <p className="velvet p-6 text-parchment/70">{queuePage > 1 ? "No more cases on this page." : "No open reports. The internet is behaving (for now)."}</p>
        ) : (
          <ul className="space-y-4">
            {queue.map((c) => (
              <li key={c.id} className="velvet p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow">
                      No. {formatCaseNumber(c.number)} · {MODERATION_STATE_LABEL[c.moderationState]} · {pluralize(c.openReports, "reporter")}
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
                  <ModForm op="dismiss" label="Dismiss reports" caseId={c.id} tone="teal" hidden={{ reportsSeen: c.reports.map((r) => r.id).join(",") }} />
                  <ModForm op="remove" label="Remove" caseId={c.id} tone="crimson" withReason reasonPlaceholder="Reason" confirmText="Seal this case? It disappears from all public pages." />
                </div>
              </li>
            ))}
          </ul>
        )}
        <nav aria-label="Report queue pages" className="mt-3 flex gap-4 text-sm">
          {queuePage > 1 ? (
            <Link href={pageHref({ queue: queue.length > 0 ? queuePage - 1 : 1 }, "queue-heading")} className="inline-flex min-h-9 items-center font-semibold text-gold-light underline">
              ← Previous
            </Link>
          ) : null}
          {queueCount > queuePage * QUEUE_PAGE ? (
            <Link href={pageHref({ queue: queuePage + 1 }, "queue-heading")} className="inline-flex min-h-9 items-center font-semibold text-gold-light underline">
              Next →
            </Link>
          ) : null}
        </nav>
      </section>

      <section aria-labelledby="log-heading" className="mt-10">
        <h2 id="log-heading" className="mb-4 font-display text-2xl font-bold text-parchment">
          Audit log
        </h2>
        {log.length === 0 ? (
          <p className="text-parchment/60">{logPage > 1 ? "No older entries." : "No moderation actions yet."}</p>
        ) : (
          <ul className="divide-y divide-gold/15 rounded-xl border border-gold/20 bg-night/30 text-sm">
            {log.slice(0, LOG_PAGE).map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 px-4 py-1 text-parchment/80">
                <span className="font-bold text-gold-light">{moderationActionLabel(l.action)}</span>
                <span>by @{l.moderator.username}</span>
                {l.targetUserId ? <span>→ @{targetNames.get(l.targetUserId) ?? "unknown"}</span> : null}
                {l.case ? <Link href={casePath(l.case)} className="inline-flex min-h-9 items-center underline">case {formatCaseNumber(l.case.number)}</Link> : null}
                {l.note ? <span className="min-w-0 break-words italic [overflow-wrap:anywhere]">“{l.note}”</span> : null}
                <span className="ml-auto text-parchment/50">{relativeTime(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <nav aria-label="Audit log pages" className="mt-3 flex gap-4 text-sm">
          {logPage > 1 ? (
            <Link href={logHref(log.length > 0 ? logPage - 1 : 1)} className="inline-flex min-h-9 items-center font-semibold text-gold-light underline">
              ← Newer
            </Link>
          ) : null}
          {log.length > LOG_PAGE ? (
            <Link href={logHref(logPage + 1)} className="inline-flex min-h-9 items-center font-semibold text-gold-light underline">
              Older →
            </Link>
          ) : null}
        </nav>
      </section>
    </div>
    </ModFlashProvider>
  );
}
