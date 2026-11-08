# Build Progress Checklist

Requirements: [`GOAL.md`](GOAL.md) · Design: [`docs/SPEC.md`](docs/SPEC.md) · Traceability: [`docs/REQUIREMENTS_TRACE.md`](docs/REQUIREMENTS_TRACE.md)

Legend: `[x]` done and verified · `[~]` in progress · `[ ]` not started

## Phase 1: Product architecture & gameplay specification
- [x] Inspect environment (Node 22, Postgres 16 local, Playwright 1.63 + Chromium preinstalled, no Docker daemon)
- [x] Choose stack (Next 16 / React 19 / Prisma 6 / Postgres / Tailwind 4 / Zod 4 / Motion / Vitest / Playwright)
- [x] Lifecycle state machine, quorum rules, progression, moderation, monetization design (`docs/SPEC.md`)

## Phase 2: Database design & backend foundations
- [x] Prisma schema (16 models) + init migration
- [x] Prisma singleton, env config, `CourtError`, injectable game clock
- [x] DB-backed atomic rate limiter (tested under concurrency)
- [x] Content filter (PII, links, handles, slurs with leetspeak, threats, serious crime, spam) + Zod schemas
- [x] Seed script that plays 42 cases through the real services under a simulated clock

## Phase 3: Authentication, authorization & case lifecycle
- [x] scrypt password hashing, HMAC-hashed DB sessions, httpOnly cookie, sliding expiry
- [x] Sign up / log in / log out / demo login; password change rotates other sessions
- [x] Services: confess, atomic claim, release, file defense/rebuttal, vote, idempotent close
- [x] Claim expiry + requeue (lazy + sweep, grace period), extension, dismissal, mistrial
- [x] Integration tests: lifecycle, role restrictions, double votes (incl. concurrent), 12-way claim race, stats audit

## Phase 4: Gameplay interfaces
- [x] Confession page (category tiles, live preview, counters, anonymity, honeypot)
- [x] Attorney queue + editor (filters, sorting, random assignment, countdown, draft autosave, release)
- [x] Prosecutor queue + editor (defense excerpts, full defense in editor)
- [x] Jury duty (pinned case, vote booth with confirm step, tally reveal, next case)
- [x] Courtroom dashboard (pending actions, docket counts, active cases, daily quests, recommendations)

## Phase 5: Visual identity, illustrations, animations
- [x] Design tokens, 4 self-hosted typefaces, parchment/velvet/plaque/folder surfaces, film grain
- [x] Original SVG characters: owl judge (3 moods), pigeon attorney, raccoon prosecutor, hamster, bulldog bailiff, cat jury (4 moods), crying pizza
- [x] Stamps, wax seals, gavel, evidence folder, crest, 12 category icons, 30 UI icons, ornaments
- [x] 20 achievement badges (4 tiers + locked), avatar builder (8 species × 8 hats × 6 accessories × 6 backdrops), 5 empty-state scenes
- [x] Microinteractions (gavel slam, stamp slam, verdict reveal, vote transitions, confetti, hover reactions); reduced-motion respected (OS + per-user setting, hydration-safe). All 15 animations reviewed frame by frame in `docs/ANIMATION_REVIEW.md`

## Phase 6: Statistics, profiles, achievements, leaderboards
- [x] XP/levels/titles, reputation (verdict-only, floored), streaks; recompute audit matches counters
- [x] Achievement engine (20 achievements) + unlock toasts with badge art
- [x] Profiles with themes (6, level/achievement/premium locked), featured badge, role records, history
- [x] Leaderboards with Wilson ranking + participation thresholds (6 boards + entertaining cases)

## Phase 7: Archives, discovery, sharing
- [x] Archives: search, category/verdict filters, recent/popular/controversial/funniest, verdict statistics, pagination
- [x] Case detail: caption, timeline, all three arguments, participants, tallies, verdict reveal, related cases
- [x] Open Graph images / downloadable share card, copy link, copy verdict summary, native share, Reddit/X
- [x] Reactions (Hilarious/Outrageous/Legendary/Relatable), featured case of the day, community highlights, landing stats

## Phase 8: Moderation, security, edge cases
- [x] Rules page; reports (case/defense/prosecution), auto review at 3 distinct reporters
- [x] Moderation console: queue, seal/restore, strike arguments, ban/unban, adjourn, feature, roles, grant cosmetics, stats audit, audit log
- [x] Settings: profile/avatar/theme, reduced motion, muted categories, featuring opt-out, password, account deletion
- [x] Security headers + CSP, rate limits on every mutation, anonymity (no ids in DTOs), safe redirects, cron secret
- [x] Monetization architecture (`PaymentProvider`, entitlements, fairness test)

## Phase 9: Integration testing, accessibility, responsive polish
- [x] Playwright e2e (51 tests): full trial across 5 browser contexts, guards, reactions, reports, rendered leaderboard rankings
- [x] axe accessibility checks on 13 pages (no serious/critical violations)
- [x] Mobile (Pixel 7): 13 pages fit the *device* width (checker fixed to compare against the device, not the layout viewport), plus touch flows for confess, claim/defend, vote, react, settings and menu with ≥36px tap targets
- [x] Bugs found & fixed by e2e: Zod 4 optional checkbox keys, React 19 form reset wiping inputs, grid overflow on mobile, streaming redirects

## Phase 10: Final debugging, docs, deployment prep
- [x] `tsc`, ESLint, `next build` clean
- [x] README (setup, scripts, testing, deployment, external services, limitations), MONETIZATION.md
- [x] Final verification against GOAL.md §12: app starts, full lifecycle e2e, role restrictions, single votes, atomic claims, stats audit, profiles/leaderboards, persisted archives, navigation, validation, art + animations, mobile, clean tsc/lint/build, automated tests, README, documented limitations

## GOAL.md §12 verification (final state)

Each item is checked against the production build by `e2e/section12.spec.ts` (plus the suites noted).
Last full run: **51/51 Playwright** and **67/67 Vitest** passing; `tsc`, ESLint and `next build` clean.

| §12 requirement | Evidence |
| --- | --- |
| Application starts successfully | `next start` serves every route with correct codes (200 / 307 auth redirects / 308 canonical / 404); `§12 the application starts successfully` |
| Full confession → defense → prosecution → jury → verdict → archive lifecycle | `e2e/lifecycle.spec.ts` (5 browser contexts, real UI) + `tests/integration/lifecycle.test.ts` |
| Role restrictions enforced | UI: disabled claim buttons and "can't vote" notices in `lifecycle.spec.ts`; server: `role restrictions` integration tests |
| Users cannot vote multiple times | `§12 users cannot vote multiple times` (stale second tab rejected, exactly one DB row) + concurrent double-vote integration test |
| Claims cannot be stolen through concurrent requests | 12-way claim race + per-user race integration tests; mutation-checked |
| Statistics calculated correctly | `npm run audit:stats` (every player vs. full recomputation) runs inside `§12 statistics…` after all e2e games; profile numbers equal DB; randomised-season integration test |
| Profiles and leaderboards work | `e2e/leaderboards.spec.ts`, `tests/integration/leaderboards.test.ts`, profile checks in `section12` / `lifecycle` |
| Archives display real persisted data | `§12 archives display real persisted data` (counts, conviction rate, newest card and search compared to the DB) |
| Navigation is functional | `§12 navigation is functional` (every header link, user menu, footer, logo, case cards) + mobile nav test |
| Forms have appropriate validation | Empty-submit errors and duplicate/PII/limit rules in `lifecycle.spec.ts` and integration tests |
| Visual assets render correctly | `§12 visual assets render correctly (rasterised pixels, all art)`: every illustration drawn to a canvas must have visible, multi-coloured pixels (all characters, 12 category icons, 20 badges, 4 stamps, seals, crest, scenes); plus `§12 visual assets render correctly` (every labelled SVG has drawing content and is laid out, 4 self-hosted fonts loaded, OG PNGs valid, no console errors) |
| Animations work without breaking interactions | `§12 animations…` e2e, plus a frame-by-frame review of all 15 animations in `docs/ANIMATION_REVIEW.md` (2 issues found and fixed) |
| Mobile layouts usable | Full multi-player trial on the Pixel 7 project; `e2e/mobile.spec.ts`: 13 pages fit the device width; touch flows (confess, claim + defend, vote, react, settings, menu); tap targets ≥36px. Manual phone screenshots reviewed (found and fixed overflow on `/court` and `/confess`, a truncated wordmark, and small prompt chips) |
| No obvious runtime/build/TS errors | `tsc --noEmit`, ESLint, `next build`; e2e asserts zero page/console errors on key flows |
| Important gameplay flows have automated tests | 67 Vitest + 43 Playwright tests |
| README explains setup, development, deployment | `README.md` |
| External dependencies and limitations documented | `README.md` → Known limitations, `docs/MONETIZATION.md` |

## Per-phase evidence

`bash scripts/verify-phases.sh` runs each phase's suites **separately** and prints PASS/FAIL per phase. Latest run (after the mobile-menu fix): **PASS ×10**.

| Phase | Verified by |
| --- | --- |
| 1 Architecture & spec | `docs/SPEC.md`. Every rule in it is exercised by the suites below |
| 2 Database & backend foundations | `prisma migrate deploy` on fresh test/e2e DBs each run; rate-limiter + content-filter tests; the seed plays 42 cases through the services |
| 3 Auth, authorization, lifecycle | `tests/integration/lifecycle.test.ts`, `social-moderation.test.ts` (sessions, bans, roles); `e2e/lifecycle.spec.ts` |
| 4 Gameplay interfaces | `e2e/lifecycle.spec.ts`, `e2e/mobile.spec.ts` touch flows, `section12` vote/navigation tests |
| 5 Visual identity & animation | `section12` visual-assets + animation tests; `docs/ANIMATION_REVIEW.md` |
| 6 Stats, profiles, achievements, leaderboards | stats-audit tests + `npm run audit:stats`; `tests/integration/leaderboards.test.ts`; `e2e/leaderboards.spec.ts`; achievement assertions in lifecycle tests |
| 7 Archives, discovery, sharing | `section12` archives test; OG image checks; reaction + share flows in e2e |
| 8 Moderation & security | moderation integration tests; report flow, staff-only 404 and redirects in e2e; CSP header asserted; fairness test |
| 9 Testing, accessibility, responsive | `e2e/a11y.spec.ts` (axe, 13 pages), `e2e/mobile.spec.ts`; an 18-page Pixel 7 contact sheet reviewed by eye (found and fixed the mobile menu being trapped in the header) |
| 10 Debugging, docs, deployment | `tsc`, ESLint, `next build`, production `next start` route check; README reviewed against GOAL.md |
