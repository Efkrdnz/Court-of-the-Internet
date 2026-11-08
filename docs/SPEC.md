# Court of the Internet: Product & Gameplay Specification

This document is the authoritative design for how the game works. The
requirements live in [`GOAL.md`](../GOAL.md); this file records the decisions
taken to satisfy them. Progress is tracked in [`PROGRESS.md`](../PROGRESS.md).

---

## 1. Stack & architecture

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 | Server Components + Server Actions keep all game logic on the server. `cacheComponents` is **off**: nearly every page is per-user and dynamic. |
| Language | TypeScript, `strict` | |
| Styling | Tailwind CSS v4 + hand-written CSS for the courtroom art direction | Tokens live in `src/app/globals.css` (`@theme`). |
| Database | PostgreSQL 16 via Prisma 6 | Relational, transactional, row-level conditional updates for atomic claims/votes. |
| Auth | First-party username/password auth: scrypt hashes, DB-backed sessions, httpOnly cookie | Works locally with zero external services. Swapping in Supabase Auth is documented in the README. |
| Validation | Zod 4 schemas shared by server actions and client forms | |
| Animation | `motion` (Framer Motion) + CSS keyframes, all gated by `prefers-reduced-motion` and a per-user setting | |
| Testing | Vitest (unit + DB integration against `court_test`), Playwright (+ axe) e2e | |
| Fonts | Self-hosted through `@fontsource` (no network at runtime) | Playfair Display (legal display), Bricolage Grotesque (playful UI), Special Elite (typewriter case files), UnifrakturCook (blackletter crest). |

### Layering

```
src/
  app/                 routes (Server Components), route handlers, server actions
    actions/           "use server" wrappers: parse input → call service → map errors
  server/              server-only domain layer (never imported by client components)
    db.ts              Prisma singleton
    auth/              password hashing, sessions, current-user helpers
    services/          case lifecycle, voting, verdicts, stats, achievements,
                       reactions, moderation, notifications, featured cases
    queries/           read models for pages (pagination, filtering, sorting)
    maintenance.ts     claim expiry + deliberation close sweep
    rate-limit.ts      DB-backed fixed-window limiter
    errors.ts          CourtError (typed, user-safe messages)
  lib/                 isomorphic: constants, zod schemas, formatting, level math,
                       content filter, case slugs
  components/
    art/               original SVG illustrations (characters, props, stamps, badges)
    ui/                buttons, inputs, tabs, dialogs, toasts
    case/              case file, argument panels, timeline, vote booth, verdict reveal
    layout/            header, footer, nav, notifications bell
```

Rule: **every state change goes through `src/server/services/*`**, which run in
Prisma transactions and re-check permissions. Client components only call server
actions. The client never computes or submits verdicts, eligibility or stats.

---

## 2. Case lifecycle (server-enforced state machine)

```
            confess                claim (atomic)             submit defense
 (none) ───────────▶ AWAITING_DEFENSE ─────────▶ DEFENSE_CLAIMED ─────────────▶ AWAITING_PROSECUTION
                          ▲   claim expired / released │
                          └────────────────────────────┘
          claim (atomic)                 submit rebuttal
 AWAITING_PROSECUTION ─────▶ PROSECUTION_CLAIMED ─────────▶ DELIBERATION (24h jury window)
          ▲  claim expired / released │                        │ window ends
          └───────────────────────────┘                        ▼
                                      quorum met? ──yes──▶ CLOSED (GUILTY | NOT_GUILTY | MISTRIAL)
                                          │ no
                                          ├─ extensions left → extend window +24h (stays DELIBERATION)
                                          └─ none left      → CLOSED (DISMISSED: "lack of quorum")
```

`moderationState` is orthogonal: `VISIBLE`, `UNDER_REVIEW`, `REMOVED`.

### Rules (all enforced in services, inside transactions)

* **Confession:** title 6–90 chars, confession 30–600 chars, context ≤ 400,
  category from the fixed list. Content filter rejects personal info (emails,
  phone numbers, street addresses, URLs) and hate/violence terms. Limits: max 5
  confessions per rolling 24h per account, near-duplicate detection against the
  author's last 30 days, honeypot field, per-IP rate limit. Case number is a
  DB sequence (`Case.number`), displayed as `No. 0042`.
* **Anonymous mode:** `Case.anonymous = true` keeps `accusedId` internally, but
  every read model swaps the accused for a deterministic alias ("Anonymous
  Hamster #4F2A"). The case is not shown on the author's public profile and does
  not count toward their *public* defendant statistics (convictions, acquittals,
  Serial Defendant, etc.). The author still sees it in their own dashboard.
* **Claiming:** an atomic conditional `UPDATE … WHERE status = AWAITING_X OR
  (status = X_CLAIMED AND claimExpiresAt < now)` with a user-eligibility check.
  Exactly one concurrent claimer wins; the others get "Someone else grabbed this
  case." A claim lasts **30 minutes** (`COURT_CLAIM_MINUTES`). Each player may
  hold at most one active claim per role. Players can release a claim. Expired
  claims are requeued lazily (any claim attempt treats them as open) and by the
  maintenance sweep, which records the expiry in `CaseClaim` history and
  notifies the player.
* **Eligibility:** the accused cannot defend or prosecute their own case; the
  attorney cannot prosecute; none of the three can vote. Banned users can do
  nothing but read.
* **Defense / rebuttal:** 40–750 characters, exactly one per case (unique
  constraint on `(caseId, role)`), and only by the current, unexpired claimer.
  A two-minute grace period applies to submits that started before the claim ran
  out.
* **Deliberation:** opens when the rebuttal is submitted; lasts
  `COURT_DELIBERATION_HOURS` (24). One vote per account per case (unique
  constraint + transaction). Aggregate tallies are returned only to players who
  have voted, case participants after closing, or anyone once the case is
  closed. Before that the API returns `null` tallies.
* **Quorum & low participation:** `COURT_QUORUM` = 10 votes. When the window
  ends below quorum, the case is extended by 24h, up to `COURT_MAX_EXTENSIONS`
  = 1 time. If it is still below quorum it closes as **DISMISSED**
  ("dismissed for lack of quorum"): no wins or losses are recorded, and
  participants get consolation XP.
* **Verdict:** computed on the server from the `Vote` rows (not from
  counters) in the closing transaction: guilty > not guilty → **GUILTY**
  (prosecution wins); not guilty > guilty → **NOT_GUILTY** (defense wins);
  equal → **MISTRIAL**. Closing is idempotent: it is guarded by
  `WHERE status = DELIBERATION AND deliberationEndsAt <= now`, so concurrent
  sweeps cannot double-award.
* **Archive:** closed, visible cases are public at `/cases/{number}-{slug}`
  with Open Graph images and need no account to view.

### Maintenance

`runMaintenance()` expires stale claims and closes finished deliberations. It
runs throttled (at most every 20s per process) on page loads that list cases,
and on demand via `POST /api/cron/maintenance` (Bearer `CRON_SECRET`) for
production schedulers. Admins can also "adjourn now" a case from the moderation
console, which sets its deadline to now and runs the normal close path (quorum
rules still apply).

---

## 3. Progression

### XP (awarded in the same transaction as the triggering event)

| Event | XP |
| --- | --- |
| Confess | +15 |
| Submit defense / rebuttal | +25 |
| Cast jury vote | +5 (+5 more at close if you voted with the majority) |
| Win as attorney or prosecutor | +60 |
| Lose as attorney or prosecutor | +15 |
| Mistrial (attorney/prosecutor) | +30 |
| Accused acquitted / convicted | +40 / +25 ("notoriety") |
| Dismissed (lack of quorum) | +10 to each participant |

Level `n` requires `50·n·(n−1)` total XP (L2 = 100, L3 = 300, L4 = 600, ...).
Each level band has a title, from *Court Intern* to *Supreme Overlord of
Snacks*.

### Reputation

Reputation is the public "legal standing" score: win +12, loss −4 (floored at
0), mistrial +3, juror in the majority +1. It is only changed by verdicts, so it
cannot be bought or farmed with reactions.

### Stats (`UserStats`, updated transactionally at verdict time)

`casesConfessed`, `timesConvicted`, `timesAcquitted`, `defenseWins/Losses/Mistrials`,
`prosecutionWins/Losses/Mistrials`, `currentDefenseStreak`, `longestDefenseStreak`,
`currentProsecutionStreak`, `longestProsecutionStreak`, `juryVotes`,
`juryMajorityVotes`, `xp`, `reputation`. Mistrials and dismissals neither extend
nor break a streak. A pure recomputation function (`recomputeStatsFromHistory`)
exists and the test suite asserts it matches the incremental counters.

### Leaderboards

Ranking uses the **Wilson score lower bound** (95%) of the win rate, with a
**minimum of 3 decided cases** in that role. That stops a 1–0 rookie from
outranking a 40–8 veteran. Boards: best defense attorneys, best prosecutors,
most convicted defendants (public cases only), longest win streaks, most active
jurors, and most entertaining cases (weighted reactions).

### Achievements (definitions in `src/lib/achievements.ts`, each has original SVG art)

Opening Statement (first confession), Serial Defendant (5 public confessions),
Certified Menace (convicted 3×), Clean Record (acquitted), Public Enemy Number
One (convicted with ≥90% guilty at quorum), Saul Goodman's Apprentice (first
defense win), Professional Liar (5 defense wins), Unstoppable Attorney (5-win
defense streak), The People's Champion (defense win with ≥80% not guilty),
First Conviction (first prosecution win), Objection Overruled (prosecution win
with ≥75% guilty), Silver-Tongued Raccoon (3-win prosecution streak), Justice
Has Been Served (10 jury votes), Cat Herder (50 jury votes), The Swing Vote
(voted on a case decided by exactly one vote, on the winning side), Hung Out to
Dry (part of a mistrial), Triple Threat (accused + attorney + prosecutor +
juror at least once each), Speed Lawyer (submitted an argument within 3 minutes
of claiming), Legendary Litigator (a case you took part in received 10
Legendary reactions). Unlocks create a notification that the client shows as an
animated toast.

---

## 4. Social

* Case URLs `/cases/{number}-{slug}`, `generateMetadata` + `opengraph-image`
  rendering a verdict card (also downloadable as a share card).
* "Copy verdict summary" (plain-text transcript summary + URL).
* Reactions: **Hilarious, Outrageous, Legendary, Relatable**. Each one is a
  toggle per user. Counters are denormalised on `Case`, inside the same
  transaction.
* Featured Case of the Day: the highest-scoring case closed in the last 7 days,
  persisted per date in `FeaturedCase` (admins can override).
* Community highlights: closest call, biggest blowout, most legendary, attorney
  of the week.
* Public profiles at `/u/{username}`. Browsing archives, cases, profiles and
  leaderboards never requires an account.

---

## 5. Safety & moderation

* Community rules at `/rules`, linked from the confession form (accepting them
  is required).
* Automated content filter on submission (see §2). It rejects with a specific,
  friendly explanation.
* Reports (`Report`): reason enum (personal info, real person accused, harassment,
  hate, violence, sexual content, illegal, spam, other) + details. Three open
  reports from distinct users auto-move a case to `UNDER_REVIEW`. It is then
  hidden from queues and archives (participants still see it) until reviewed.
* Admin console `/moderation`: report queue, remove/restore case, strike an
  argument from the record, dismiss reports, ban/unban users, grant cosmetics,
  adjourn deliberation, pick the featured case. Every action writes a
  `ModerationAction` audit row.
* Removed cases are hidden from everywhere public. The URL shows a "sealed by
  order of the court" notice.

---

## 6. Monetization architecture (no live payments)

* `cosmetics` catalog in `src/lib/cosmetics.ts`: profile themes, badge frames,
  courtroom backdrops, avatar items. Each item has an `unlock` rule:
  `free | level:N | achievement:KEY | premium`.
* `Entitlement` table (`userId`, `itemKey`, `source: EARNED | GRANTED | PURCHASED`).
* `User.membershipTier` (`FREE | PATRON`) + `membershipExpiresAt`.
* `src/server/payments/provider.ts`: a `PaymentProvider` interface with a
  `DisabledPaymentProvider`. The UI labels premium items "Patron perk, not yet
  on sale" and shows no fake buy buttons. Admins can grant items for testing.
* Fairness: payment-related code never touches votes, claims, verdicts or
  stats. A test asserts that the verdict service does not read membership or
  entitlements.
* Private courtrooms for friend groups are designed in `docs/MONETIZATION.md`
  but not built (see limitations).

---

## 7. Configuration

| Env var | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://court:court@localhost:5432/court` | Postgres connection |
| `SESSION_SECRET` | dev fallback | HMAC pepper for session tokens (required in production) |
| `CRON_SECRET` | unset | Enables `/api/cron/maintenance` |
| `COURT_QUORUM` | 10 | Votes needed for a standard verdict |
| `COURT_DELIBERATION_HOURS` | 24 | Jury window |
| `COURT_MAX_EXTENSIONS` | 1 | Low-participation extensions |
| `COURT_CLAIM_MINUTES` | 30 | Claim lifetime |
| `ENABLE_DEMO_LOGIN` | true outside production | Shows one-click demo accounts on `/login` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Absolute URLs for OG/share |
