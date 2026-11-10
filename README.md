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
| `bash scripts/verify-phases.sh` | Re-run each of the 10 development phases' suites separately and print PASS/FAIL per phase |
| `npm run audit:stats` | Check every player's stored stats against a full recomputation from history |
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
- leaderboards: Wilson ordering (40–8 beats 3–0 beats 10–10), participation thresholds, exclusion of banned and deleted players, anonymous convictions kept off the public board, and every board built from real played games

```bash
npm run build
```

```bash
npm run test:e2e
```

**End-to-end tests** (on a production build, with real rate limits on) play a full trial through the real UI with five browser contexts (sign-up → confession → defense → prosecution → three jurors → admin adjourns → public verdict, archive search, OG image, profile stats, notifications). They also cover:
- role restrictions, the reaction and report flows
- the rendered leaderboards (thresholds, Wilson order, agreement with profiles)
- **axe accessibility** on 13 pages
- **mobile usability** on a Pixel 7: the whole multi-player trial also runs on the phone profile; 13 pages fit the device width; confessing, claiming and filing a defense, voting, reacting, settings and the menu all work by touch, with ≥36px tap targets
- a **pixel-level art check**: every illustration is rasterised in the browser and must show visible, multi-coloured pixels, covering all characters, 12 category icons, 20 badges and 4 stamps
- `e2e/section12.spec.ts`, which checks every GOAL.md §12 requirement against the production server

Animations are additionally reviewed frame by frame in [`docs/ANIMATION_REVIEW.md`](docs/ANIMATION_REVIEW.md), and every GOAL.md requirement is traced to its implementation and evidence in [`docs/REQUIREMENTS_TRACE.md`](docs/REQUIREMENTS_TRACE.md).

---

## Deployment

The app is a standard Node.js Next.js server and needs one PostgreSQL database.

1. Provision Postgres (Neon, Supabase, RDS, Railway, Fly…).
2. Set environment variables (see `.env.example`):
   - `DATABASE_URL`: production database
   - `SESSION_SECRET`: **required**, ≥ 32 random characters. The production server refuses to start without one, or with the `.env.example` placeholder
   - `SITE_URL`: e.g. `https://court.example.com` (share links, OG URLs, sitemap). Read at runtime, so no rebuild is needed to change it. `NEXT_PUBLIC_SITE_URL` still works as a build-time fallback.
   - `TRUST_PROXY_HOPS`: the number of reverse proxies in front of the app (default `1`). Rate limits use the client IP that your own proxy appended to `X-Forwarded-For` (counted from the right), so spoofed left-most entries are ignored.
   - `CRON_SECRET`: enables the maintenance endpoint
   - Leave `ENABLE_DEMO_LOGIN` unset (it defaults to **off** in production) and never run the seed against production. The seed refuses non-local databases unless `ALLOW_PRODUCTION_SEED=1` is set, because the demo admin's password is public
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

This is a humorous, fictional courtroom. Submissions are screened for personal information (emails, phones, addresses), links, @handles, slurs (with leetspeak normalisation), threats and serious-crime content. Players can report cases or individual arguments, and every report reaches the moderation queue. Reports from three distinct established reporters (accounts at least 24h old, with no dismissed report on that case) hide a case pending review. This means a handful of throwaway accounts can't freeze a trial. While a deliberating case is under review or sealed, its clock stops: no verdict and no payouts. It resumes with the remaining time when a moderator dismisses the reports or restores the case. Moderators can seal cases, strike arguments, ban players (which releases their claims and ends their sessions), adjourn trials and pin featured cases. Every action is audit-logged. See [`/rules`](src/app/rules/page.tsx).

## Known limitations

- **Client IPs need a proxy.** IP-based limits use the right-most `X-Forwarded-For` entries (`TRUST_PROXY_HOPS`).
  - **Behind a reverse proxy** (nginx, Vercel, Fly…) clients can't spoof them. Only *failed* logins count: 8 per account per client IP (cleared by a successful login), 20 per IP, so one attacker can't lock the owner out from a different IP and colleagues behind one office IP don't lock each other out by signing in. Failed attempts do add up across accounts, though: 20 wrong passwords from one IP (whoever typed them) pause logins from that IP for everyone behind it for 15 minutes. There is also a per-account ceiling of 100 failed attempts per 15 minutes across all IPs. Each attempt is counted before its password is checked (and given back if it succeeds), so a burst of simultaneous guesses gets no more checks than the limits allow. It stops distributed brute force, but someone spraying wrong passwords from many IPs can lock the real owner out, even with the correct password, until the 15-minute window resets. That is a deliberate trade-off: letting correct passwords through would defeat the ceiling.
  - **With `next start` exposed directly**, a request that carries no `X-Forwarded-For` is attributed to its connection address, but a client that sends its own header controls the value. Rotating the header bypasses the per-IP limits on signup, login and confession, and inflates logged-out view counts.
    - The only fixed protections left are the per-player limits and the per-account login ceiling, plus scrypt's cost per guess.
    - Someone spraying 100 wrong passwords from rotated IPs can still lock an account's owner out for 15 minutes (see above).
    - **Always deploy behind a proxy.** This is a deployment requirement, not something the app can fix: Next doesn't give server actions the socket address.
  - If a request has no address at all (no header and none set by the server), per-IP limits are skipped rather than lumping such clients into one shared bucket. Signups then fall under a site-wide 60/hour ceiling and logged-out views aren't counted.
- **Bans and anonymity.** A ban puts the banned player's *public* open cases on hold. Their anonymous cases stay claimable, because holding them would reveal who confessed.
- **Very long words break mid-word.** Words of up to 35 characters are allowed (longer ones are refused as keyboard-mash). A large heading can't fit that many letters on one line (on phones, and in big display headings even on desktop), so the word wraps instead of overflowing.
- **Display names aren't unique; usernames are.** Two players can share a display name, except that officers' names are reserved. Profiles and links use the unique `@username`, which leaderboards also show on screens 400px and wider.
- **The content filter is a first line of defence, not a guarantee.** It is a set of word and phrase patterns (`src/lib/content-filter.ts`), not a language model, so it gets things wrong in both directions. A shared corpus in `tests/unit/filter-corpus.ts` pins down what it must accept (139 everyday confessions, including Chinese, Japanese and Thai text, scores, prices, dates and hyperbole) and what it must reject (134 evasions); every audit round has added to it.
  - **Hate:** slurs (see below for spellings it sees through), plus plain hateful statements about a protected group ("… people are vermin / disgusting / subhuman", stock conspiracy lines). Subtler bigotry is left to reports.
  - **What it sees through:** invisible characters; look-alike letters (Cyrillic, Greek, full-width, small capitals, flag letters); leetspeak; plurals; asterisk-masked slurs ("f*ggot"); letters spaced out with symbols or emoji; phone numbers written with O for 0, keycap emoji or odd separators; dots written as "·", "," or "dot"; abbreviated street names; spelled-out addresses.
  - **Threats** it recognises: a stated intent to harm a person (named, or "my roommate", "him", "you"), including "punch", "beat (up)", "beat the crap out of" and "break his nose", wishing death on someone ("I hope my boss dies", "I want my boss dead", "my landlord deserves to die"), and the common phrasings of "I'll find you and make you pay", "I know where you live", "put him in the hospital" and the like.
  - **Serious crime** it recognises from a fixed list: harming a person (including a blow to the face, or a push down the stairs) or cruelty to an animal, poisoning, drugging or dosing someone or their food and drink, arson, vandalising or smashing cars and slashing tyres, hacking or getting into someone's accounts ("logged into my ex's Snapchat", "guessed her password"), vehicle theft (including a car named by its make), robbery and mugging, burglary, shoplifting big-ticket items, embezzlement and stealing from the till, stealing, cloning or using someone else's cards and identity theft (borrowing a parent's card is left to moderators), hit-and-run (however the person was hit), drink- or drug-driving, taking or dealing hard drugs and dealing or growing weed, and sexual crimes including sharing someone's nude or intimate images, filming people in the shower or undressing (or a hidden camera in their room), groping and touching without consent.
  - **Personal info** also includes UK postcodes written in capitals ("SW1A 1AA").
  - **Handles** it recognises: `@names`, Discord `name#1234` tags, Reddit `u/name`, and handle-like names next to a platform ("on insta", "tiktok: …").
  - **Known misses:** threats or crimes phrased in ways the patterns don't anticipate (and crimes outside the list, such as tax fraud, stalking, pickpocketing or indecent exposure); bare 7-digit local phone numbers ("867-5309, area code 555") and numbers broken up by words ("555 and then 123…"); a platform name followed by a plain-word handle ("his tiktok is pettykingofficial", which reads like "his tiktok is hilarious"); slurs it has never seen spelled that way. Reports and moderators cover these.
  - **Known false positives:** it errs toward letting hyperbole through ("I could murder a pizza", "I killed my brother at Fortnite", "I shot my boss a text"), but some ordinary sentences still trip it. Examples: the British "fag" for a cigarette; "I retarded the timing on the engine"; a confession that genuinely describes arson as a joke ("I set my brother's alarm clock on fire"). The player sees which rule fired and can rephrase.
- **Not a secret ballot.** Tallies are hidden until you vote (no anchoring), but anyone who has voted sees the live split. Public counters ("juries served", "with the majority") can therefore hint at how a specific player voted. Votes aren't sensitive in this game; a secret ballot would need hiding those counters until the verdict.
- **Pages are fairly heavy.** All character art is inline SVG (no image requests, crisp at any size, works offline), so HTML is large: about 1.4 MB uncompressed for the leaderboards and 120–130 KB gzipped. On slow mobile connections a sprite sheet (`<use href>`) or static SVG files would cut that substantially.
- **Achievements are permanent.** A badge earned at a threshold (e.g. Legendary Litigator at 10 Legendary reactions) is kept even if reactions are later withdrawn. A coordinated group could therefore toggle reactions on and off to mint one. Badges carry no gameplay power, so this is accepted.
- **No identity verification, so sockpuppets are possible.** There is no email or phone verification (no external messaging service is configured), so one person can register several accounts.
  - The per-IP signup limit (6 per hour behind a proxy) and the 24h age requirement for auto-hiding reports slow this down.
  - New accounts *can* vote immediately, because onboarding asks new players to sit on juries. A determined group of sockpuppets could therefore swing a small trial; moderators can ban them, which removes their votes from open trials.
  - Proper protection needs a verification provider (email, phone or OAuth). That is an external dependency.
- **Moderation doesn't rewrite history.**
  - Sealing a *closed* case hides it from every public page and the archive totals, but the players' records (wins, convictions, XP) from that trial stand.
  - Striking an argument hides it from non-staff without pausing or annulling the trial; jurors who already voted keep their votes. Seal the case instead if the whole trial should stop.
  - Banning a player removes their votes from trials still in deliberation (those votes no longer count) and all their reactions, and dismisses their open reports; verdicts already reached and achievements already earned stand. A case their report helped hide stays under review until a moderator decides. Jury XP is paid once per case, so unbanning and re-voting earns nothing extra. While banned, a player keeps their record (wins, verdicts, and the reputation those carry, so a trial they were already in can still raise it) but earns no XP, and cases they confessed that still need counsel are on hold (not claimable).
  - Deleting your own account keeps your votes and reactions (they were cast legitimately), withdraws your open reports, and retires your username so nobody can impersonate you through old links.
- **Anonymity costs rewards.** Anonymous cases never expose the confessor's name, id or profile link: not in pages, page payloads, OG images, the sitemap or leaderboards.
  - Anonymous cases are also off the record. The confessor gets no XP, achievements, conviction or acquittal counts from them, at filing or at verdict. Otherwise a change on their public profile would reveal them.
  - They still get the private verdict notification and see the case in their courtroom.
  - Achievement dates on other players' profiles show only the month.
  - What remains is ordinary activity: a player's attorney, prosecutor or juror XP can still change around the time they file anonymously, so a determined observer could guess from timing alone.
- **Private courtrooms** for friend groups and **paid memberships** are designed (see `docs/MONETIZATION.md`) but not built. The Patron perks section is explicitly labelled "not on sale yet"; admins can grant cosmetics for testing.
- **No email:** there's no password reset by email. Admins can't reset passwords from the console yet; players can change their own in Settings.
- **Search:** archive search uses case-insensitive `ILIKE`. For very large archives, add a Postgres full-text or trigram index.
- **Featured case opt-out wins over a pin.** If a moderator pins a case and its confessor then turns off "allow featuring", today's pin is replaced by the automatic pick; turning it back on doesn't restore the pin (a moderator can pin it again).
- **Officers recuse themselves.** A moderator or admin can't seal, restore, dismiss, strike, adjourn or pin a case they're a party to (accused, attorney or prosecutor); another officer has to. Their own reports on such a case reach the queue but don't count toward hiding it.
- **Framework status codes.** A server-action body over Next's 1 MB limit gets a 500 from the framework rather than 413. A cross-origin server-action POST is refused by Next.js's own CSRF check, which answers 500 ("Invalid Server Actions request"); nothing runs. Likewise a hand-crafted action call with a non-JSON body is rejected by the framework before any app code runs, and logged there as a SyntaxError. A sealed case's URL answers 200 with a content-free "sealed" notice (noindex), so its participants can see what happened.
- **Not real-time:** there are no websockets. Pages refresh after your own actions, countdowns refresh when they expire, and other players' activity appears on the next navigation.

## Credits & licences

All illustrations, icons and badges are original SVG work created for this project. Fonts are from Google Fonts via `@fontsource` (SIL Open Font License): Playfair Display, Bricolage Grotesque, Special Elite, UnifrakturCook.
