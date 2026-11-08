# ⚖ Court of the Internet

> The internet's most prestigious court for its least important crimes.

A multiplayer courtroom game. Players **confess** ridiculous, harmless crimes; strangers **defend** them; other strangers **prosecute** them; a **jury** of players votes *Guilty* or *Not Guilty*. Verdicts award XP, reputation and achievements, and every case lands in a permanent, shareable public archive.

It is a full-stack Next.js app with a real PostgreSQL database, server-enforced game rules, original SVG art (an owl judge in an enormous powdered wig, a pigeon attorney, a raccoon prosecutor, a jury of judgmental cats…), and automated unit, integration and end-to-end tests.

- Requirements: [`GOAL.md`](GOAL.md)
- Game design & architecture decisions: [`docs/SPEC.md`](docs/SPEC.md)
- Build checklist: [`PROGRESS.md`](PROGRESS.md)
- Monetization design: [`docs/MONETIZATION.md`](docs/MONETIZATION.md)

---

## Quick start (local, no external services)

Requirements: **Node 20+** (tested on 22) and **PostgreSQL 14+** (tested on 16).

```bash
cp .env.example .env
```

Start Postgres. Either use Docker (creates `court_dev`, `court_test` and `court_e2e`):

```bash
npm run db:up
```

…or point `DATABASE_URL` / `TEST_DATABASE_URL` / `E2E_DATABASE_URL` in `.env` at any Postgres you already run (create the three databases first).

Install, migrate and seed:

```bash
npm install
```

```bash
npm run setup
```

Run the app:

```bash
npm run dev
```

Open <http://localhost:3000>. On **/login** you'll find one-click **demo accounts** (password for all: `objection-sustained`):

| Account | Role |
| --- | --- |
| `judge_wigsworth` | Admin (moderation console, adjourn trials early) |
| `clerk_pemberton` | Moderator |
| `counselor_coo`, `da_rascal`, `hammy_the_accused`, `juror_whiskers`, `fresh_intern` | Players |

Use different browsers (or a private window) to play several roles at once. The seed plays 42 cases through the real game services: 25 closed with verdicts, 6 in jury deliberation, 4 awaiting prosecution and 7 awaiting defense. All stats, XP, achievements and notifications in the seed are therefore genuine.

> Tip for solo testing: the jury needs **10 votes** by default. Set `COURT_QUORUM=3` in `.env` while playing alone, or sign in as `judge_wigsworth` and use **Adjourn now** in `/moderation` (quorum rules still apply).

---

## How a trial works

1. **Confession.** A player files a title, category, confession and optional context. They can choose anonymous mode, which shows a random alias publicly while keeping internal ownership. Each case gets a unique number (`Case No. 0042`).
2. **Defense.** Another player claims the case (an atomic claim lasting 30 minutes) and files exactly one defense of up to 750 characters. The accused can never defend themselves.
3. **Prosecution.** A third player claims it and files one rebuttal. They see the confession and the defense first.
4. **Jury.** Any non-participant votes once. Tallies stay hidden until you vote or the case closes. Deliberation lasts 24h and needs 10 votes.
5. **Verdict.** Computed on the server from the votes table:
   - Guilty majority: the prosecution wins.
   - Not Guilty majority: the defense wins.
   - Exact tie: mistrial.
   - Too few votes: deliberation is extended once by 24h; if quorum still isn't reached, the case is **dismissed**, with no wins or losses.

   After the verdict, XP, reputation, streaks and achievements are awarded, notifications go out, and the case enters the archive with a share card.

Abandoned claims expire and return to the queue (with a 2-minute grace period for in-flight submissions). Full rules: [`docs/SPEC.md`](docs/SPEC.md).

---

## Tech stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router, Turbopack, Server Components + Server Actions), React 19, TypeScript `strict` |
| Data | PostgreSQL + Prisma 6 (migrations in `prisma/migrations`) |
| Auth | First-party username/password: scrypt hashes, HMAC-hashed DB sessions, httpOnly cookies |
| Validation | Zod 4 schemas shared by forms and server actions |
| UI | Tailwind CSS 4 + a custom courtroom design system, Motion for animation, self-hosted fonts (`@fontsource`) |
| Art | 100% original hand-written SVG React components in `src/components/art` |
| Tests | Vitest (unit + Postgres integration), Playwright (+ axe-core) end-to-end |

```
src/
  app/            routes, server actions (app/actions), OG images, cron endpoint
  server/         server-only domain layer: services (game rules), queries (read models), auth, rate limiting
  lib/            isomorphic helpers: validation, content filter, progression math, categories, cosmetics
  components/     art/ (SVG), case/ (game UI), forms/, layout/, ui/
prisma/           schema, migrations, seed + seed content
tests/            vitest unit + integration
e2e/              playwright end-to-end, accessibility and mobile checks
```

All state changes go through `src/server/services/*`. They run in transactions, re-check permissions, and use conditional row updates, so no two claims or double votes can slip through under concurrency. Clients never compute verdicts, eligibility or stats.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / ESLint |
| `npm test` | Vitest unit + integration tests (uses `TEST_DATABASE_URL`, migrates it automatically) |
| `npm run test:e2e` | Playwright e2e against a production build on `E2E_DATABASE_URL` (run `npm run build` first) |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Seed an empty database (`-- --reset` wipes the dev DB first) |
| `npx tsx scripts/build-og-art.tsx` | Re-render the character SVGs used by Open Graph images (`assets/og-art`) |

---

## Testing

```bash
npm test
```

**Unit tests** cover the content filter, progression math (levels, Wilson ranking), verdict rules, validation and cosmetics unlocks.

**Integration tests** use a real Postgres database and cover:
- the complete lifecycle
- role restrictions
- one vote per account, including concurrent double votes
- **12 simultaneous claimers → exactly 1 winner**
- the one-claim-per-role limit under races
- claim expiry, requeue and the grace period
- quorum extension and dismissal, mistrial, not guilty
- racing closers that never double-award
- anonymity in stats
- duplicate and spam detection, daily limits
- reactions, reports and auto-review, moderation powers, bans
- cosmetics entitlements, sessions and password rotation
- an atomic rate limiter
- a randomised "season", after which every player's counters must **exactly match a full recomputation from history**

```bash
npm run build
```

```bash
npm run test:e2e
```

**End-to-end tests** play a full trial through the real UI with five browser contexts (sign-up → confession → defense → prosecution → three jurors → admin adjourns → public verdict, archive search, OG image, profile stats, notifications). They also check role restrictions, the reaction and report flows, **axe accessibility** on 13 pages, and **mobile layouts** on a Pixel 7 viewport (no horizontal scroll, working navigation).

---

## Deployment

The app is a standard Node.js Next.js server and needs one PostgreSQL database.

1. Provision Postgres (Neon, Supabase, RDS, Railway, Fly…).
2. Set environment variables (see `.env.example`):
   - `DATABASE_URL`: production database
   - `SESSION_SECRET`: **required**, ≥ 32 random characters
   - `NEXT_PUBLIC_SITE_URL`: e.g. `https://court.example.com` (used for share links and OG URLs)
   - `CRON_SECRET`: enables the maintenance endpoint
   - `ENABLE_DEMO_LOGIN=false`: unless you want the demo buttons
   - Optional tuning: `COURT_QUORUM`, `COURT_DELIBERATION_HOURS`, `COURT_MAX_EXTENSIONS`, `COURT_CLAIM_MINUTES`
3. Build and migrate:

   ```bash
   npm ci
   ```

   ```bash
   npm run db:deploy
   ```

   ```bash
   npm run build
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Schedule maintenance every few minutes so deliberations close and abandoned claims requeue even when nobody is browsing (pages also run it lazily):

   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://court.example.com/api/cron/maintenance
   ```

   On Vercel, add a Cron Job hitting `GET /api/cron/maintenance` with the same header. A `GET` is accepted for that reason.

Don't seed production. The seed refuses to run there unless `ALLOW_PRODUCTION_SEED=1`. Create your admin by registering normally, then promote the account:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE username = 'you';
```

### Swapping in external services later
- **Supabase Auth / OAuth:** authentication is isolated in `src/server/auth/*`. Replace `resolveSession` with a lookup of the Supabase session (or NextAuth) that maps to a `User` row. Every game service only needs a user id, and the rest of the app is unaffected.
- **Payments (Stripe, etc.):** see [`docs/MONETIZATION.md`](docs/MONETIZATION.md). Implement `PaymentProvider` and write `Entitlement` rows from a webhook.
- **Rate limiting at the edge:** `src/server/rate-limit.ts` is Postgres-backed so it works across instances with no extra infrastructure. Swap it for Redis/Upstash at high scale.

---

## Safety

This is a humorous, fictional courtroom. Submissions are screened for personal information (emails, phones, addresses), links, @handles, slurs (with leetspeak normalisation), threats and serious-crime content. Players can report cases or individual arguments, and three distinct reports hide a case pending review. Moderators can seal cases, strike arguments, ban players (which releases their claims and ends their sessions), adjourn trials and pin featured cases. Every action is audit-logged. See [`/rules`](src/app/rules/page.tsx).

## Known limitations

- **Private courtrooms** for friend groups and **paid memberships** are designed (see `docs/MONETIZATION.md`) but not built. The Patron perks section is explicitly labelled "not on sale yet"; admins can grant cosmetics for testing.
- **No email:** there's no password reset by email. Admins can't reset passwords from the console yet; players can change their own in Settings.
- **Search:** archive search uses case-insensitive `ILIKE`. For very large archives, add a Postgres full-text or trigram index.
- **Not real-time:** there are no websockets. Pages refresh after your own actions, countdowns refresh when they expire, and other players' activity appears on the next navigation.
- **Content filter:** the automated filter is a first line of defense, not a moderation guarantee. Human review via reports is still required.

## Credits & licences

All illustrations, icons and badges are original SVG work created for this project. Fonts are from Google Fonts via `@fontsource` (SIL Open Font License): Playfair Display, Bricolage Grotesque, Special Elite, UnifrakturCook.
