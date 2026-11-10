import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import clsx from "clsx";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProfile, HISTORY_PAGE, isPlausibleUsername } from "@/server/queries/players";
import { pageParam } from "@/lib/text";
import { db } from "@/server/db";
import { ACHIEVEMENTS, TIER_STYLE, getAchievement } from "@/lib/achievements";
import { getTheme } from "@/lib/cosmetics";
import { formatDate, formatMonth, percent } from "@/lib/format";
import { Avatar } from "@/components/art/avatar";
import { AchievementBadge } from "@/components/art/badges";
import { CaseFileCard } from "@/components/case/CaseFileCard";
import { Laurel } from "@/components/art/props";
import { FIT_FONT, fitStyle } from "@/lib/fit-text";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  if (username.toLowerCase() === "me") return { title: "Your profile" };
  const handle = username.toLowerCase();
  const exists = isPlausibleUsername(handle) && await db.user.findFirst({ where: { username: handle, deletedAt: null }, select: { id: true } });
  if (!exists) return { title: "Player not found", robots: { index: false } };
  return { title: `@${handle}`, description: `The public legal record of @${handle} at the Court of the Internet.` };
}

const PATTERNS: Record<string, string> = {
  damask: "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.05) 0 6px, transparent 7px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0 6px, transparent 7px)",
  pinstripe: "repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 14px)",
  dots: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1.5px)",
  stars: "radial-gradient(rgba(232,199,102,0.25) 1px, transparent 1.5px), radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1.5px)",
  none: "none",
};

export default async function ProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const historyPage = pageParam((await searchParams).history, 1000);
  const viewer = await getCurrentUser();
  if (username.toLowerCase() === "me") redirect(viewer ? `/u/${viewer.username}` : "/login?next=/u/me");
  const profile = await getProfile(username, viewer, historyPage);
  if (!profile) notFound();
  const { user, stats: s, level } = profile;
  const theme = getTheme(user.profileTheme);
  const v = theme.vars;
  const earned = new Map(profile.achievements.map((a) => [a.key, a.unlockedAt]));
  const featured = user.featuredBadge ? getAchievement(user.featuredBadge) : undefined;
  const lightTheme = theme.key === "parchment";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header
        className="relative overflow-hidden rounded-2xl border p-6 shadow-2xl sm:p-10"
        style={{ background: v.bg, color: v.ink, borderColor: v.accent, backgroundImage: PATTERNS[v.pattern], backgroundSize: "28px 28px" }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at 20% 0%, ${v.accent}33, transparent 60%)` }} />
        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="relative mx-auto">
            <Laurel side="left" className="absolute -left-8 top-2 h-36 w-12" />
            <Avatar config={user.avatar} className="h-36 w-36" title={user.displayName} />
            <Laurel side="right" className="absolute -right-8 top-2 h-36 w-12" />
          </div>
          <div className="@container min-w-0 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              {user.role === "ADMIN" ? <span className="pill bg-gold text-ink">Presiding judge</span> : null}
              {user.role === "MODERATOR" ? <span className="pill bg-gold/80 text-ink">Court clerk</span> : null}
              {user.isPatron ? <span className="pill" style={{ background: v.accent2, color: v.ink }}>Patron of the court</span> : null}
              {user.banned ? <span className="pill bg-crimson text-ivory">Held in contempt</span> : null}
            </div>
            <h1 className={`mt-2 pb-[0.2em] font-display font-black leading-snug [--fit-max:2.25rem] [--fit-min:0.75rem] sm:[--fit-max:3rem] ${FIT_FONT}`} style={fitStyle(user.displayName)}>
              {user.displayName}
            </h1>
            <p className="opacity-70">@{user.username} · sworn in on {formatDate(user.createdAt)}</p>
            {user.bio ? <p className="mt-3 max-w-xl text-lg italic opacity-90">“{user.bio}”</p> : null}
            <div className="mx-auto mt-4 max-w-md md:mx-0">
              <div className="flex justify-between text-sm font-bold">
                <span>
                  Level {level.level} · <span style={{ color: v.accent }}>{level.title}</span>
                </span>
                <span className="opacity-70">{s.xp} XP</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full" style={{ background: `${v.ink}22` }}>
                <div className="h-full rounded-full" style={{ width: `${level.pct}%`, background: v.accent }} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            {featured ? (
              <div className="text-center">
                <AchievementBadge icon={featured.icon} tier={featured.tier} className="bdg-hover mx-auto h-24 w-20" />
                <p className="mt-1 text-xs font-bold">{featured.name}</p>
              </div>
            ) : null}
            <div className="rounded-xl px-5 py-3 text-center" style={{ background: v.panel }}>
              <p className="font-display text-3xl font-black" style={{ color: v.accent }}>
                {s.reputation}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-widest opacity-75">Reputation</p>
            </div>
            {profile.isSelf ? (
              <Link href="/settings#appearance" className={clsx("btn btn-sm", lightTheme ? "btn-burgundy" : "btn-ghost")}>
                Customize profile
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {/* Role records */}
      <section aria-labelledby="records-heading" className="mt-10">
        <h2 id="records-heading" className="sr-only">
          Legal record
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RecordCard
            title="Defense attorney"
            tone="teal"
            main={percent(s.defenseRate)}
            mainLabel="win rate"
            rows={[
              ["Wins / losses", `${s.defenseWins} / ${s.defenseLosses}`],
              ["Mistrials", s.defenseMistrials],
              ["Current streak", s.currentDefenseStreak],
              ["Best streak", s.longestDefenseStreak],
            ]}
          />
          <RecordCard
            title="Prosecutor"
            tone="crimson"
            main={percent(s.prosecutionRate)}
            mainLabel="conviction rate"
            rows={[
              ["Wins / losses", `${s.prosecutionWins} / ${s.prosecutionLosses}`],
              ["Mistrials", s.prosecutionMistrials],
              ["Current streak", s.currentProsecutionStreak],
              ["Best streak", s.longestProsecutionStreak],
            ]}
          />
          <RecordCard
            title="Defendant"
            tone="gold"
            main={String(s.totalConfessions)}
            mainLabel={profile.isSelf ? `${s.totalConfessions === 1 ? "confession" : "confessions"} (incl. anonymous)` : s.totalConfessions === 1 ? "public confession" : "public confessions"}
            rows={[
              ["Found guilty", s.timesConvicted],
              ["Acquitted", s.timesAcquitted],
            ]}
          />
          <RecordCard
            title="Juror"
            tone="plum"
            main={String(s.juryVotes)}
            mainLabel={s.juryVotes === 1 ? "jury served" : "juries served"}
            rows={[
              ["With majority", percent(s.juryAgreement)],
              ["This week", s.votesThisWeek],
            ]}
          />
        </div>
      </section>

      {/* Achievements */}
      <section id="achievements" aria-labelledby="ach-heading" className="mt-14 scroll-mt-24">
        <h2 id="ach-heading" className="rule-ornate mb-6 font-display text-2xl font-bold">
          <span className="text-parchment">
            Achievements ({profile.achievements.length}/{ACHIEVEMENTS.length})
          </span>
        </h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {ACHIEVEMENTS.map((a) => {
            const at = earned.get(a.key);
            return (
              <li key={a.key} className={clsx("velvet flex flex-col items-center p-4 text-center", !at && "opacity-60")}>
                <AchievementBadge icon={a.icon} tier={a.tier} locked={!at} className="bdg-hover h-24 w-20" title={a.name} />
                <p className="mt-2 font-display font-bold leading-tight text-parchment">{a.name}</p>
                <p className="mt-1 text-xs text-parchment/65">{a.description}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: TIER_STYLE[a.tier].ring }}>
                  {TIER_STYLE[a.tier].label}
                  {at ? ` · ${profile.isSelf ? formatDate(at) : formatMonth(at)}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* History */}
      <section aria-labelledby="history-heading" className="mt-14">
        <h2 id="history-heading" className="rule-ornate mb-6 font-display text-2xl font-bold">
          <span className="text-parchment">Case history ({profile.historyTotal})</span>
        </h2>
        {profile.history.length === 0 ? (
          <p className="velvet p-6 text-center text-parchment/70">{historyPage > 1 && profile.historyTotal > 0 ? "No older cases." : "A spotless record. Suspicious."}</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {profile.history.map((c) => (
              <CaseFileCard
                key={c.id}
                c={c}
                footer={
                  <p className="text-xs font-bold uppercase tracking-widest text-sepia">
                    Role: {c.viewer.role === "ACCUSED" || (!c.anonymous && c.accused.username === user.username) ? "Accused" : c.attorney?.username === user.username ? "Defense" : "Prosecution"}
                  </p>
                }
              />
            ))}
          </div>
        )}
        {/* The full history pages through, so no case is out of reach. */}
        {profile.historyTotal > HISTORY_PAGE ? (
          <nav aria-label="Case history pages" className="mt-4 flex items-center gap-4 text-sm">
            {historyPage > 1 ? (
              <Link href={`/u/${user.username}${historyPage > 2 ? `?history=${historyPage - 1}` : ""}#history-heading`} className="inline-flex min-h-9 items-center font-semibold text-gold-light underline">
                ← Newer
              </Link>
            ) : null}
            <span className="text-parchment/60">
              Page {Math.min(historyPage, Math.ceil(profile.historyTotal / HISTORY_PAGE))} of {Math.ceil(profile.historyTotal / HISTORY_PAGE)}
            </span>
            {historyPage * HISTORY_PAGE < profile.historyTotal ? (
              <Link href={`/u/${user.username}?history=${historyPage + 1}#history-heading`} className="inline-flex min-h-9 items-center font-semibold text-gold-light underline">
                Older →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </div>
  );
}

function RecordCard({
  title,
  tone,
  main,
  mainLabel,
  rows,
}: {
  title: string;
  tone: "teal" | "crimson" | "gold" | "plum";
  main: string;
  mainLabel: string;
  rows: [string, string | number][];
}) {
  return (
    <div
      className={clsx(
        "velvet p-5",
        tone === "teal" && "bg-gradient-to-b from-teal/25",
        tone === "crimson" && "bg-gradient-to-b from-crimson/25",
        tone === "gold" && "bg-gradient-to-b from-gold/15",
        tone === "plum" && "bg-gradient-to-b from-plum/40",
      )}
    >
      <p className="eyebrow">{title}</p>
      <p className="mt-2 font-display text-4xl font-black text-parchment">{main}</p>
      <p className="text-xs text-parchment/60">{mainLabel}</p>
      <dl className="mt-4 space-y-1.5 text-sm">
        {rows.map(([k, val]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-parchment/65">{k}</dt>
            <dd className="font-bold text-parchment">{val}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
