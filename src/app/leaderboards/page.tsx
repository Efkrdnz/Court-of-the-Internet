import type { Metadata } from "next";
import { pluralize } from "@/lib/text";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import clsx from "clsx";
import { getLeaderboards } from "@/server/queries/players";
import { percent } from "@/lib/format";
import { getAchievement } from "@/lib/achievements";
import type { AvatarConfig } from "@/lib/avatar";
import { Avatar } from "@/components/art/avatar";
import { AchievementBadge } from "@/components/art/badges";
import { BailiffBulldog } from "@/components/art/characters";
import { CaseFileCard } from "@/components/case/CaseFileCard";

export const metadata: Metadata = { title: "Leaderboards", description: "The most feared attorneys, prosecutors, defendants and jurors of the Court of the Internet." };

type Person = { username: string; displayName: string; avatar: AvatarConfig; featuredBadge: string | null };

function Board<T extends Person>({
  title,
  subtitle,
  rows,
  stat,
  tieKey,
  moreTied = 0,
  detail,
  empty,
  tone,
}: {
  title: string;
  subtitle: string;
  rows: T[];
  stat: (r: T) => React.ReactNode;
  /** Rows with an equal tie key share a rank (1, 1, 3…) instead of getting arbitrary distinct ones. */
  tieKey?: (r: T) => string | number;
  /** Players tied with the last row shown but cut off by the top 10. */
  moreTied?: number;
  detail: (r: T) => React.ReactNode;
  empty: string;
  tone: "teal" | "crimson" | "gold" | "plum";
}) {
  const headingId = `lb-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section
      aria-labelledby={headingId}
      className={clsx(
        "velvet flex flex-col p-5",
        tone === "teal" && "bg-gradient-to-b from-teal/25",
        tone === "crimson" && "bg-gradient-to-b from-crimson/25",
        tone === "gold" && "bg-gradient-to-b from-gold/15",
        tone === "plum" && "bg-gradient-to-b from-plum/40",
      )}
    >
      <h2 id={headingId} className="font-display text-2xl font-black text-parchment">
        {title}
      </h2>
      <p className="mb-4 text-xs text-parchment/60">{subtitle}</p>
      {rows.length === 0 ? (
        <p className="my-auto py-6 text-center text-sm italic text-parchment/60">{empty}</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, i) => {
            const badge = r.featuredBadge ? getAchievement(r.featuredBadge) : undefined;
            // Competition ranking on ties: the rank of the first row with the same key.
            const rank = tieKey ? rows.findIndex((x) => tieKey(x) === tieKey(r)) + 1 : i + 1;
            return (
              <li key={r.username}>
                <Link href={`/u/${r.username}`} className={clsx("flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-night/40", i === 0 && "bg-gold/10 ring-1 ring-gold/40")}>
                  <span className={clsx("w-7 shrink-0 text-center font-display text-lg font-black", i === 0 ? "text-gold-light" : i < 3 ? "text-parchment" : "text-parchment/50")}>
                    {rank}
                  </span>
                  <Avatar config={r.avatar} className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="min-w-0 font-bold leading-tight text-parchment">
                        {r.displayName} <span className="hidden text-xs font-normal text-parchment/45 min-[400px]:inline">@{r.username}</span>
                      </span>
                      {badge ? <AchievementBadge icon={badge.icon} tier={badge.tier} className="h-5 w-4 shrink-0" title={badge.name} /> : null}
                    </span>
                    <span className="block text-xs text-parchment/55">{detail(r)}</span>
                  </span>
                  <span className="shrink-0 text-right font-display text-lg font-black text-gold-light">{stat(r)}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      {moreTied > 0 ? <p className="mt-2 px-2 text-xs text-parchment/60">…and {pluralize(moreTied, "more player")} tied at that rank.</p> : null}
    </section>
  );
}

export default async function LeaderboardsPage() {
  const [lb, viewer] = await Promise.all([getLeaderboards(), getCurrentUser()]);
  // The case board respects the viewer's muted categories, like every other case list.
  const entertaining = viewer?.mutedCategories.length ? lb.entertaining.filter((c) => !viewer.mutedCategories.includes(c.category)) : lb.entertaining;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto]">
        <div className="animate-in">
          <p className="eyebrow">Hall of fame (and shame)</p>
          <h1 className="mt-2 font-display text-4xl font-black text-parchment sm:text-6xl">
            The <span className="gilded-text italic">leaderboards</span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-parchment/75">
            Win-rate boards are ranked by a confidence-adjusted score (the Wilson lower bound), so a lucky 1–0 rookie can&apos;t outrank a seasoned 30–8 litigator.
            You need at least {lb.thresholds.decided} decided cases in a role to qualify.
          </p>
        </div>
        <BailiffBulldog className="chr-hover chr-sticker mx-auto w-48" />
      </header>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Board
          title="Best defense attorneys"
          subtitle={`Min. ${lb.thresholds.decided} decided cases · ranked by confidence-adjusted win rate`}
          rows={lb.attorneys}
          stat={(r) => percent(r.rate)}
          detail={(r) => `${r.wins}W–${r.losses}L · streak ${r.streak}`}
          empty="No attorney has argued enough cases yet. The bar is open."
          tone="teal"
        />
        <Board
          title="Best prosecutors"
          subtitle={`Min. ${lb.thresholds.decided} decided cases · ranked by confidence-adjusted conviction rate`}
          rows={lb.prosecutors}
          stat={(r) => percent(r.rate)}
          detail={(r) => `${r.wins}W–${r.losses}L · streak ${r.streak}`}
          empty="No prosecutor qualifies yet. Justice awaits."
          tone="crimson"
        />
        <Board
          title="Most convicted defendants"
          subtitle="Public confessions only · the court's most wanted"
          rows={lb.convicts}
          stat={(r) => r.convictions}
          tieKey={(r) => r.convictions}
          moreTied={lb.convictsMoreTied}
          detail={(r) => `${r.convictions}× guilty · ${r.acquittals}× acquitted · ${r.confessed} public ${r.confessed === 1 ? "confession" : "confessions"}`}
          empty="Nobody has been convicted yet. Suspicious."
          tone="gold"
        />
        <Board
          title="Longest win streaks"
          subtitle="Best ever consecutive wins in either role"
          rows={lb.streaks}
          stat={(r) => r.streak}
          tieKey={(r) => r.streak}
          moreTied={lb.streaksMoreTied}
          detail={(r) => `${r.side} streak`}
          empty="No streaks yet. Be the first."
          tone="plum"
        />
        <Board
          title="Most active jurors"
          subtitle={`Min. ${lb.thresholds.juryVotes} votes · the backbone of justice`}
          rows={lb.jurors}
          stat={(r) => r.votes}
          tieKey={(r) => r.votes}
          moreTied={lb.jurorsMoreTied}
          detail={(r) => `${percent(r.agreement)} with the majority (decided cases)`}
          empty="The jury box is empty. Report for duty!"
          tone="gold"
        />
        <Board
          title="Most reputable"
          subtitle="Reputation is earned only through verdicts"
          rows={lb.reputation}
          stat={(r) => r.reputation}
          tieKey={(r) => r.reputation}
          moreTied={lb.reputationMoreTied}
          detail={(r) => `Level ${r.level} · ${r.xp} XP`}
          empty="Nobody has a reputation yet. Lucky them."
          tone="teal"
        />
      </div>

      <section aria-labelledby="ent-heading" className="mt-16">
        <h2 id="ent-heading" className="rule-ornate mb-2 font-display text-2xl font-bold">
          <span className="text-parchment">Most entertaining cases</span>
        </h2>
        <p className="mb-6 text-center text-sm text-parchment/60">Ranked by weighted gallery reactions: Legendary ×3, Hilarious and Outrageous ×2, Relatable ×1.</p>
        {entertaining.length === 0 ? (
          <p className="velvet p-6 text-center text-parchment/70">No reactions yet. Tough crowd.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {entertaining.map((c, i) => (
              <CaseFileCard key={c.id} c={c} footer={<p className="text-xs font-bold uppercase tracking-widest text-sepia">#{i + 1} · {c.reactionScore} reaction points</p>} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
