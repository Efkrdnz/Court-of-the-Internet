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
- [x] Playwright e2e (62 tests): full trial across 5 browser contexts, guards, reactions, reports, rendered leaderboard rankings
- [x] axe accessibility checks on 13 pages (no serious/critical violations)
- [x] Mobile (Pixel 7): 13 pages fit the *device* width (checker fixed to compare against the device, not the layout viewport), plus touch flows for confess, claim/defend, vote, react, settings and menu with ≥36px tap targets
- [x] Bugs found & fixed by e2e: Zod 4 optional checkbox keys, React 19 form reset wiping inputs, grid overflow on mobile, streaming redirects

## Phase 10: Final debugging, docs, deployment prep
- [x] `tsc`, ESLint, `next build` clean
- [x] README (setup, scripts, testing, deployment, external services, limitations), MONETIZATION.md
- [x] Final verification against GOAL.md §12: app starts, full lifecycle e2e, role restrictions, single votes, atomic claims, stats audit, profiles/leaderboards, persisted archives, navigation, validation, art + animations, mobile, clean tsc/lint/build, automated tests, README, documented limitations

## GOAL.md §12 verification (final state)

Each item is checked against the production build by `e2e/section12.spec.ts` (plus the suites noted).
Last full run: **68/68 Playwright** and **172/172 Vitest** passing; `tsc`, ESLint and `next build` clean.

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
| Important gameplay flows have automated tests | 172 Vitest + 68 Playwright tests (43 desktop project, 25 Pixel 7 project) |
| README explains setup, development, deployment | `README.md` |
| External dependencies and limitations documented | `README.md` → Known limitations, `docs/MONETIZATION.md` |

## Verification history (honest account)

Not every phase was test-verified at the moment it was marked done. What actually happened:
- **Phases 1–3:** verified as they were built. 57 Vitest unit and integration tests were written and passing before any UI existed, including a mutation check proving the concurrent-claim test can fail.
- **Phases 4–8:** at the time, verified only by `tsc`, lint, `next build`, HTTP status checks and manually reviewed screenshots. Automated e2e coverage for them came in Phase 9. Those e2e runs then found real defects in this earlier work:
  - unchecked checkboxes failing validation (Zod 4)
  - React 19 wiping form inputs after a failed submit
  - mobile overflow, the mobile menu trapped inside the header, and small tap targets
  - status codes broken by streamed redirects
  - OG CSS that satori rejected
  - a missing aria label
  - tally bars filling too early, and toast confetti covering text
- **Final state:** every phase was re-verified separately by `scripts/verify-phases.sh` on the final commit, and an independent audit (below) was run by a separate agent that did not see these documents.

## Independent audit

A separate agent, which saw neither these documents nor the test results, audited all 17 §12 items hands-on against a fresh production build and its own database. It played two full trials (one entirely on a Pixel 7), replayed server actions with other users' cookies, raced claims and votes, crawled 90 pages and recomputed every player's stats in SQL.

**Result: 15 PASS, 2 CONCERN, 0 FAIL.** It reported eight defects (A–H). Every one is fixed and has a regression test:

| # | Defect | Fix | Regression test |
| --- | --- | --- | --- |
| A | Invalid confession attempts used up the rate limit | validate before rate-limiting (confess, argue, report, signup) | `§12 forms: invalid submissions don't use up the rate limit` (e2e now runs with real rate limits) |
| B | Phone header collapsed when the account menu opened | **Root cause:** unlayered component CSS beat Tailwind utilities, so the dropdown's `absolute` was ignored. Component classes moved to `@layer components`; `.velvet` keeps its base colour | mobile test asserts the logo box is unchanged and the menu sits below the header |
| C | Disabled claim-button text overflowed | same root cause (`whitespace-normal` was ignored), plus wrapping | `§12 claim buttons…` asserts no overflow |
| D | Small tap targets (footer, chips, links) | `min-h-9` / chip min-height 36px | tap-target check now includes chips, pagination and footer links |
| E | A rejected stale-tab vote left voting buttons | refresh on failure; server props take over | stale-tab test asserts the sealed state |
| F | Misleading messages ("Too slow" on closed cases, "8/3 votes", stale "filed" banner) | stage-specific errors, "quorum reached", banner shown only while true | integration test asserts the new messages |
| G | `/defend/<bad id>` soft 404 (200) | removed the streaming `loading.tsx` that wrapped the editor routes | `§12 navigation: unknown editor ids are real 404s` |
| H | Cramped vote-booth heading on phones | jury art hidden below `sm` | visual |

Logs also show `prisma:error` lines for unique-constraint hits that the app handles correctly. This is noise and was left as is.

## Second independent audit (fresh agent, final build of the first fix round)

A new agent, with no knowledge of the first audit or the fixes, re-audited all 17 items against a freshly seeded database: **14 PASS, 3 CONCERN, 0 FAIL.** It confirmed that the first round's fixes hold (forms keep input, repeated failures followed by a valid submit work, the stale tab seals, the phone menu works). It reported these issues, all now fixed with regression tests:

| # | Issue | Fix | Regression test |
| --- | --- | --- | --- |
| 1 | IP rate limits trusted a client-supplied `X-Forwarded-For`; 8 bad passwords from spoofed IPs locked the owner out | client IP = proxy-appended entry (`TRUST_PROXY_HOPS`); strict per-account limit is per (account, IP) with a looser per-account ceiling; README documents the no-proxy limitation | `§12 security: wrong passwords from one IP don't lock the owner out elsewhere` |
| 2 | Juror "with majority" % counted undecided cases and mistrials | denominator is votes on GUILTY / NOT_GUILTY cases (profile, jury page, leaderboard) | `§12 stats: jury agreement uses decided cases only` + integration test |
| 3 | Overflow at 360px and 320px | root cause: responsive grids with no base column (`grid-cols-1` base added to every responsive grid; a token-level scan finds none left); 1-column category tiles below 360px; wordmark hidden below 340px; toast clipped horizontally | `narrow phones (360px / 320px): every page fits` (13 pages each) |
| 4 | Server-side errors off-screen on phones | after a rejection, focus and scroll go to the invalid field (or the alert) | `mobile: a server-side rejection is brought into view` |
| 5 | Jurors told "You won/lost this case" | jurors see "sided with the majority" / "outvoted" | `§12 jurors see majority/minority…` |
| 6 | Conviction rate counted mistrials and dismissals | guilty / (guilty + not guilty) | archives test asserts the new formula |
| 7 | `NEXT_PUBLIC_SITE_URL` was inlined at build time | runtime `SITE_URL` (old var kept as a fallback) | `§12 share links use the runtime site URL` |
| 8 | `prisma:error` log noise; "verdict summary" label during deliberation; unlabeled conviction count | Prisma logs warnings only (the action layer logs unexpected errors); "Copy case summary" while open; labeled board detail | visual / log check |

## Third independent audit (fresh agent, build of the second fix round)

**15 PASS, 2 CONCERN, 0 FAIL.** It confirmed the earlier fixes:
- statistics match a whole-database recomputation (twice)
- juror percentages match SQL on decided cases
- no anonymous-identity leaks anywhere, including the sitemap, OG images and queues
- 320–412px layouts fit with good tap targets
- failed submits don't use up rate limits

New edge cases, all fixed:

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 | A title that is one huge word widened phone pages to 949px | `overflow-wrap: anywhere` on body; 36+ character "words" rejected as spam (titles included); OG text wraps | `narrow phones: long unbroken words never widen the page`; unit tests |
| 2 | Share card said "JURY OUT" before deliberation | `shareCardStatus()`: NEEDS COUNSEL / ON TRIAL / JURY OUT / verdict | unit test; cards for cases #40 and #28 reviewed |
| 3 | Share-card stamp overlapped text | narrower text column, scaled stamp | visual review |
| 4 | README overstated the per-account login limit without a proxy | README states exactly what holds with and without a proxy | n/a (doc) |
| 5 | Attorney/prosecutor told "can't react to your own case" | "a case you took part in" | n/a |
| 6 | Cosmetic: duplicate password error, 404/moderation titles, tally bars at 320px, conviction-rate wording, long toast queue | fixed (field-level errors only; neutral titles; compact bars; "(guilty vs. not guilty)"; toasts 5s/4s) | archives test updated |

## Fourth independent audit (fresh agent, build of commit f504326)

A fresh agent audited the final build of the third fix round against a newly seeded database. It played two full trials, including one closed automatically and one extended then dismissed. It raced 20 claimers, 12 concurrent votes and 9 concurrent reaction toggles, and recomputed every player's statistics in SQL (zero mismatches). It also checked anonymous-identity leaks, account deletion, the report → review → dismiss flow and 15 pages at three phone widths.

**Result: 15 PASS, 2 CONCERN (13 mobile, 17 docs), 0 FAIL.** All findings are fixed:

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 | Confess submit label spilled out of its button at 360/320px | the full-width button wraps, with a shorter label below 400px | `§12 mobile: buttons and case titles fit narrow phones…` (no `.btn` spills at 320/360) |
| 2 | A competing player could claim a case during the holder's 2-minute grace period, so the holder's filing was rejected | the claim stays the holder's until expiry + grace: in the claim service, the queues, the dashboard and the case pages | integration: grace blocks rivals, hides the case from the queue, and still lets the holder file |
| 3 | Concurrent reaction toggles hit Prisma P2025 ("court stenographer fainted") | `deleteMany` with a count check; a lost race reports the real state | integration: 3 bursts of 9 parallel toggles, no rejections, counters equal rows (fails on the old code with P2025) |
| 4 | README claimed the owner can't be locked out; the 100-per-15-minute per-account ceiling can lock out the owner when attempts come from many IPs | README states the trade-off exactly | n/a (doc) |
| 5 | Header bell kept its unread badge after the inbox was opened (the shared layout isn't re-rendered on client navigation) | client `NotificationBell` clears once `/notifications` is seen; it resets when the server count changes | `§12 notifications: the header badge clears…` |
| 6 | Titles broke mid-word on 320px case pages; "Miscellaneou/s" on the desktop confess page | smaller case title below 400px; 2-column category grid next to the preview | `§12 mobile: … case titles fit narrow phones` (widest word ≤ heading width at 320/360); screenshots at 320/700/1024/1280 |
| 7 | "Adjourn now" / "Dismiss reports" showed no confirmation (the form removed itself) | moderation flash banner (`ModFlashProvider`) | lifecycle e2e asserts "Deliberation closed: GUILTY (2–1)." |
| 8 | View counter counted every reload and curl; "Hover a locked item" on phones; "@ghost" title for missing users | one view per viewer (account or IP) per 6h; tapping a locked item shows how to unlock it; "Player not found" title | integration test for view de-duplication |

Not changed: after a third report puts a case under review, the reporter sees the "under review" page instead of the dialog's thank-you. That page is the confirmation. The cron endpoint stays disabled until `CRON_SECRET` is set (documented; deliberations also close lazily on page visits).

## Fifth independent audit (fresh agent, build of commit 55fa20d)

**Result: 13 PASS, 1 FAIL (item 2), 3 CONCERN (8, 13, 17).** The FAIL was a real lifecycle hole. It also confirmed that the fourth round's fixes hold: the grace period resisted steals at 60s, 119s and 200s; 17 concurrent reaction toggles caused no drift; every moderation action showed feedback; statistics matched its own SQL for all 31 users.

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 (FAIL) | Sealing a claimed case cleared the claimer but kept the `*_CLAIMED` status, so after a restore nobody could ever claim it | New `releaseClaims()` (claims.ts) is used by seal, ban and account deletion: it reopens the case, marks the claim RELEASED and notifies the holder. Restore repairs legacy rows, and `claimCase` treats a holder-less claim as open | integration `sealing a claimed case releases the claim…` (fails on the old code) |
| 2 | Anonymous confessions could be linked to their author through the exact unlock time of "Opening Statement" on the public profile | other viewers get month-level achievement dates, coarsened in the query so the page payload never has the exact time; the remaining real-time XP correlation is documented in README | profile behaviour; README "Anonymity is per case, not perfect" |
| 3 | `/jury?case=<unknown>` said "6 cases await" and "you've voted on everything" at once | an unknown, sealed or under-review pin redirects to the next case | `§12 navigation: an unknown jury pin moves on…` |
| 4 | "Assign me a random case" poked out of its card at 320px | `.btn` wraps between words and is capped at its container width (applies to every button) | `§12 mobile: buttons…` now covers 5 pages and clipping by cards (verified to catch the old CSS) |
| 5 | Report dialog stayed filled after success, silently switched its target, and could file a second report; unselected radios looked selected | success view replaces the form (no submit button); a fresh form for each opening; targets frozen per opening; `.doc` paper surfaces use `color-scheme: light` | `§12 forms: a filed report shows a confirmation…` |
| 6 | Deleting an account didn't release held claims | `deleteAccount` calls `releaseClaims` | integration `deleting an account releases its claims…` |
| 7 | Moderators could ban other moderators | only admins can ban officers of the court | same integration test |
| 8 | "1 juries"; "7 unread" next to a cleared bell; featured case said "this week's"; truncated leaderboard rows at 320px; 34px avatar chips; Prisma error for `/u/%00` | plural fix; "7 new since your last visit"; honest featured-case copy; rows wrap on phones; `min-h-9` chips; usernames validated before querying | visual / status checks (`/u/%00` → 404 with an empty error log) |

Not changed: seeded cases dismissed under the seed's quorum of 10 show e.g. "DISMISSED 3–1" when the server runs with `COURT_QUORUM=3`. That is historical data, not a bug. The view counter does de-duplicate per viewer; the displayed number trails by one view because the page reads it before recording the visit.

## Sixth independent audit (fresh agent, build of commit 32abf40)

**Result: 15 PASS (one with a footnote), 2 CONCERN (10 forms, 17 docs), 0 FAIL.** It also confirmed the fifth round's fixes:
- seal/restore works at the awaiting and claimed stages, and the claimer is notified
- ban and account deletion release claims
- moderators can't ban admins
- the claim grace period holds under 6-way races
- statistics match its SQL for 6 players

Its findings, all fixed:

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 | A sealed deliberation still reached a verdict (by deadline or "Adjourn now") and paid out XP and reputation | the deliberation clock **pauses** while a case is sealed or under review (new `deliberationPausedAt` column, migration `20261109040000_pause_deliberation`) and resumes with the remaining time on restore or dismissal. `closeDeliberation`, the sweep and adjourn all require a visible case. The console hides Adjourn and shows the paused state | integration `pauses a trial while it is under review or sealed…` |
| 2 | A case under review got a verdict while voting was paused (3 throwaway accounts could freeze any jury) | same pause; a prosecution filed while under review starts paused | same test |
| 3 | Content-filter rejections used up the confession and argument rate limits | `screenConfession` / `screenArgument` run in the actions before the limiter | e2e `§12 forms: invalid submissions…` now adds 4 filter rejections before a valid filing |
| 4 | Random starter avatars could be the locked goose, and those players couldn't save their profile | starter avatars use only free items; an item (or theme) already worn can always be kept | unit (2000 seeds, no locked item) + integration (keep goose, can't switch to crown) |
| 5 | The signup display name skipped the content filter | signup screens username and display name (and checks "taken") before using the signup budget | validation path shared with Settings |
| 6 | "Opening Statement" and XP on the public profile revealed anonymous confessions | anonymous cases are off the record: no XP, achievements or conviction counts for the confessor (they still get the private verdict notice). The form and README say so | integration `keeps anonymous confessions out of public defendant stats` (updated) |
| 7 | The jury queue sorted by guilty votes, so its order leaked the hidden split | sorted by total votes, then deadline | integration `orders the jury queue by total votes…` (fails on the old order) |
| 8 | The third reporter's thank-you vanished when the case went under review | the under-review page confirms a viewer's own report | visual |
| 9 | Re-claiming your own expired case sent "another player picked it up" | no self-notification | covered by the claim tests |
| 10 | `deleted_*` usernames could be registered (collision with deletion tombstones) | reserved | unit |
| 11 | Unknown case tab title "Sealed case"; under-review title wrong | "Page not found" / "Case under review" | status check |
| 12 | Banned users' dashboard invited them to vote; mid-word hyphenation at desktop; ambiguous "2 of 3 votes needed"; small links | no play suggestions when banned; hyphenation removed; "2 votes so far · 3 needed for a verdict"; 36px targets | visual |

## Seventh independent audit (fresh agent, build of commit eccb4ee)

**Result: 15 PASS, 1 FAIL (13 mobile), 1 CONCERN (17 docs).**

It confirmed the sixth round end to end:
- **Paused trials:** review and seal pause the clock, dismissal restores the exact remaining time, and nothing pays out while a case is hidden.
- **Anonymity:** an anonymous confession and its verdict leave the profile untouched.
- **Rate limits:** a valid filing after 11 rejections used one slot.
- **Concurrency:** 48-way reaction races and 12-way claim races held.
- **Statistics:** 0 mismatches in its SQL recomputation.

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 (FAIL) | `/court` "Your active cases" collapsed to a 14px column at 320px ("N/o./0/0/3") | **Root cause:** `overflow-wrap: anywhere` on `body` lets flex columns shrink to one character. Now `break-word`, which still breaks over-long words but never ordinary ones. The row's text has a flex basis, so the status pill wraps below | new `findMidWordBreaks()` detector (every ≤20-character word must fit its column) runs on 13 pages at 360 and 320px plus the vote confirmation; a one-off scan of 19 pages × 4 accounts × 2 widths is clean |
| 2 | Case-card titles broke mid-word at 320px | the decorative verdict stamp is hidden below 400px (the footer pill states the verdict); smaller icon and title | same detector |
| 3 | "Reconsid/er" in the vote confirmation at 320px | `.btn` uses `overflow-wrap: normal` | same detector, after picking a side |
| 4 | Clients with no forwarding header shared one rate-limit bucket ("local"), so about 20 logins locked everyone out | unknown IP → per-IP limits skipped (per-account limits stay); signups fall under a site-wide 60/h ceiling; logged-out views aren't counted. README documents it | — |
| 5 | OG image for a nonexistent case returned 200 | 404 | status check |
| 6 | Moderation side effects undocumented; a banned juror's vote still counted | a ban removes the player's votes from open trials (closed verdicts stand). README "Moderation doesn't rewrite history" covers sealed closed cases and struck arguments | integration `a ban removes the player's votes from open trials…` |
| 7 | Demo login could be on in production via a copied `.env.example`; the seed guard relied on `NODE_ENV` | `.env.example` no longer enables demo login (the default is off in production); the seed refuses any non-local database unless `ALLOW_PRODUCTION_SEED=1` | manual: the seed refuses `db.example.com` |
| 8 | "Legendary counts triple" was wrong | states the real weights | — |
| 9 | Audit-log and toast links under 36px | `min-h-9` | — |

Not changed: sealed case pages return 200 with `noindex`. The page explains the seal to people who follow an old link, and the author sees the reason.

## Eighth independent audit (fresh agent, build of commit 5d61ed0)

**Result: 15 PASS (one with an animation note), 2 CONCERN (16, 17 docs accuracy), 0 FAIL.**

It confirmed the seventh round:
- **Phone widths:** no overflow or undersized buttons on 20 pages at 3 widths.
- **Statistics:** its SQL matched stored stats for all 66 users after bans and deletions.
- **Bans:** banned players' open votes are removed.
- **Rate limits:** rejected submissions keep the form and don't use up limits.
- **Demo login:** off by default in production.

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1, 2 | Exposed directly (no proxy), rotating `X-Forwarded-For` bypasses per-IP limits; the per-account login ceiling can then lock an owner out | **External deployment requirement**: Next doesn't give server actions the socket address, so only a trusted proxy can make IPs reliable. README states the exact behaviour and consequences | — |
| 3 | Three brand-new accounts could freeze any trial again and again with reports (including reports on arguments that don't exist yet) | reports on unfiled arguments are rejected. Only established reporters count towards auto-review: accounts at least 24h old whose reports on that case haven't been dismissed. Every report still reaches the queue | integration `throwaway or already-dismissed reporters can't freeze a trial` |
| 4 | README's "no forwarding header" section was wrong (Next does attribute header-less requests to the connection) | rewritten | — |
| 5 | README said 62 e2e tests; production accepted the public `.env.example` `SESSION_SECRET` | count fixed; production refuses `dev-only-*` secrets | — |
| 6 | A deleted account's username could be re-registered by someone else, hijacking old `/u/<name>` links | deletion keeps the username on the scrubbed row (deleted players always display as "Former Citizen") | integration: re-signup with the old name → CONFLICT; login refused |
| 7 | 0W–4L attorney ranked #3; truncated details on desktop; arbitrary distinct ranks for ties; "1 cases need attention" | "best" boards need ≥ 1 win; details wrap; competition ranking (1, 1, 3) with a name tie-break; plural fix | leaderboards integration test updated |
| 8 | Re-sealing a sealed case re-notified the author; "Awaiting defense" counted claimed cases; 34px moderation inputs | ALREADY_DONE; counts only claimable cases; `min-h-9` | integration (double seal refused) |

Not changed:
- **Banned players can still log in to browse.** This is intentional; every action is refused and a banner explains why.
- **Pages are heavy because SVGs are inline.** The leaderboards page is about 120 KB gzipped. Acceptable for now, and noted for a future optimisation (sprite or `<use>` reuse).

## Ninth independent audit (fresh agent, build of commit cf171bf)

**Result: 15 PASS, 2 CONCERN (6 statistics, 17 docs), 0 FAIL.** It confirmed the eighth round:
- competition ranking on tied leaderboards
- re-reports by dismissed reporters don't re-hide a case
- the review pause correctly restores the remaining time
- anonymity holds in HTML, the page payload, OG images and queues
- 8 players' statistics match its SQL

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 | **A vote committed mid-close was accepted but missing from the stored tally** (case 31 stored 5–7 while its rows were 7–9; the verdict could flip) | `closeDeliberation` takes the case row lock (`SELECT … FOR UPDATE`) before counting. Votes take the same lock, so in-flight votes finish first and are counted, and later ones find the case closed | integration `counts a vote that is still committing when the close starts`: a deterministic in-flight vote held by `pg_sleep`. It **fails on the old code** (2–1 GUILTY) and passes now (2–2 MISTRIAL) |
| 2 | Sockpuppet accounts can vote immediately | documented as a limitation needing an external identity-verification provider. Mitigations: per-IP signup limit behind a proxy, report age gate, bans remove open votes | — |
| 3 | Ban, unban and re-vote earned jury XP twice for one case | jury XP is paid once per player per case | ban integration test extended |
| 4 | /rules and README described the old report threshold | both describe the established-reporter rule | — |
| 5 | The audit log didn't name banned users | shows "→ @username" | visual |
| 6 | The canonical-slug redirect dropped the query string (`?filed=1`) | the query string is preserved | status check |
| 7 | Deleting an account kept its open votes without saying so; Settings said the username was "scrubbed" | documented (votes stand; the username is retired); accurate Settings copy | — |
| 8 | A player could take a staff member's display name | staff display names are reserved (case-insensitive) | integration `players can't pose as an officer of the court` |
| 11 | "Attorney of the month" could feature a banned player | banned players excluded | — |

Not changed:
- Inline text links inside sentences ("community rules", "Sign in") fall under WCAG 2.5.8's inline exception, and case-card titles are covered by a full-card link overlay.
- Sealed case pages stay 200 with `noindex`.

## Tenth independent audit (fresh agent, build of commit 1df19df)

**Result: 15 PASS, 2 CONCERN (6 statistics, 17 docs), 0 FAIL.**

It confirmed the ninth round's close lock: votes racing "Adjourn now" or a natural deadline always left the tally equal to the Vote rows. It also confirmed:
- concurrent reaction toggles keep counters exact
- the review pause pushes deadlines correctly
- deleted usernames can't be reused
- anonymity holds
- security headers are set (CSP, X-Frame-Options DENY)

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 | **Open redirect after login**: `/login?next=/%5Cexample.com` and `next=/%09/example.com` sent the browser to example.com | a single `safeNext()` (src/lib/safe-next.ts) used by the login page, the signup page and the auth actions: no backslashes or control characters, and the path must resolve to our own origin | unit (8 hostile inputs) + e2e `§12 security: the post-login redirect never leaves the site` |
| 2 | **A ban racing a trial's close** removed votes the close had already counted: the verdict was announced 4–4 but 2–1 was stored, and majority bonuses no longer matched | `setBan` locks each case row (the same lock `closeDeliberation` takes, in a fixed order) and only removes votes from trials still deliberating | integration `a ban racing a trial's close never splits the verdict from its tally`: deterministic, **fails on the old code** |
| 3 | Jury stuffing with brand-new accounts | already documented (needs an external identity-verification provider) | — |
| 4 | The staff-name check was dodged by "Judge Wigsworth." or a zero-width space | names are compared on letters and digits only, case- and accent-folded | integration (4 variants rejected; "Judge Mental" still allowed) |
| 5 | OG "NEEDS COUNSEL" stamp overlapped the subtitle | one word per line, sized by the longest word | rendered NEEDS COUNSEL / JURY OUT / NOT GUILTY cards reviewed |
| 6 | Toasts covered the vote confirmation and the mobile menu on phones | phones show toasts under the header, below the menu's z-index | visual |
| 7 | Restore of a nonexistent case logged P2025; double-submitted argument said "the case changed"; repeat "attorney has taken your case" notices; `/archives?page=999` showed a count over an empty list | NOT_FOUND; "Your defense is already on file"; one notice per stage; out-of-range pages redirect to the last page | — |

## Eleventh independent audit (fresh agent, build of commit ba6bfb4)

**Result: 14 PASS, 3 CONCERN (10 forms, 14 one 500, 17 docs), 0 FAIL.** It confirmed the tenth round:
- every race it scripted (ban, seal and votes against the close) left tallies equal to the Vote and Reaction rows
- its SQL recompute matched all 29 players
- the seal → deadline → restore pause worked
- per-case anonymity held

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 | **Open redirect via dot segments**: `/login?next=/..//evil.example` normalised to `//evil.example` and was used for signed-in visitors | `safeNext()` re-checks the *normalised* path (must start with a single `/`, with no backslash) | unit: 3 dot-segment variants added to the hostile-input list |
| 2 | `/jury?case=2147483648` returned 500 (INT overflow) | case pins, the moderation lookup and numeric archive search use the 9-digit `parseCaseParam` rule; archive page numbers are capped | integration (`99999999999999` search returns nothing, no error) |
| 3 | Look-alike impersonation ("Judge Wіgsworth" with a Cyrillic і) | display names can't mix Latin with Cyrillic or Greek letters; the staff-name comparison folds confusables (Cyrillic and Greek look-alikes, 1/l/i, 0/o) | unit + integration (Cyrillic е and "Rea1name" rejected) |
| 4 | "I want to kill my neighbour…" passed the threat filter | intent + harm + human-target patterns | unit: 3 threats rejected, 4 everyday hyperboles ("kill time", "mom will kill me"…) still allowed |
| 5 | A vote in flight while a case was sealed or put under review still counted | the vote's locked conditional update also requires `moderationState = VISIBLE` | — |
| 6 | `%` / `_` in archive search matched everything | LIKE wildcards escaped | integration `archive search treats % and _ literally…` |
| 7 | Achievements can be minted by toggling reactions | documented: achievements are permanent and carry no gameplay power | — |
| 8 | Under-review OG card said "sealed"; striking left `openReports` stale; home vote total included sealed cases; banned players kept jury XP for removed votes | "under review" card; report count recomputed after a strike; totals use the same scope; removed votes' XP is reversed (still paid only once per case) | integration (strike → openReports 2 → 1); ban tests still pass the full stats audit |
| 9 | After an empty confession, focus skipped the category error | radio groups mark themselves `data-invalid`, and focus goes to the first invalid control in document order | — |

## Twelfth independent audit (fresh agent, build of commit 6a8c5af)

**Result: 14 PASS, 3 CONCERN (10, 14, 17), 0 FAIL.**

It confirmed the eleventh round:
- every open-redirect variant falls back to `/court`
- expiry-boundary claim races (119.95–120.05s) have exactly one outcome
- statistics matched its SQL for 28 players
- ban vs close tallies match the rows
- sealing pauses the trial, and restoring resumes it correctly

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| D1 | **Content-filter evasion with invisible or look-alike characters**: soft hyphen (U+00AD) in an email or phone number, full-width digits, a slur split by a soft hyphen or using a Cyrillic letter | storage strips all invisible characters (new `INVISIBLE` set). The filter screens a *skeleton*: NFKC (full-width → ASCII), invisibles dropped, Cyrillic/Greek look-alikes folded to Latin, case kept so address detection still works. Shared with the staff-name check (`src/lib/confusables.ts`) | unit: 5 evasions rejected; Russian text still accepted; storage strips U+00AD/U+200B |
| D2 | `/defend?page=1e20` → 500 | `pageParam()` clamps every page number | status check |
| D3 | A NUL byte in `?q=` or `?user=` reached Postgres (error page / 500) | `cleanQuery()` strips control and invisible characters from search and lookup parameters | status check |
| D4 | Simultaneous reports stored a stale reporter count | `fileReport` takes the case row lock, so reports on one case are serialised | integration `simultaneous reports keep an exact reporter count` (5 at once → 5); **fails on the old code** |
| D5 | Rejected duplicate confessions used up the rate limit | duplicate and daily-cap checks run (read-only) before the limiter; the transaction re-checks under its lock | e2e: 4 duplicates, then a new confession, are accepted |
| D6 | Demo login accepted any seeded account with the demo password | only the 7 listed demo accounts | — |
| D7 | Seal or dismiss on an unknown case → generic crash message | NOT_FOUND | — |
| D8 | Restoring sent no notice; sealing a deliberating case didn't tell counsel | restore notifies the accused; sealing mid-trial notifies attorney and prosecutor | — |
| D9 | Rate-limit and view-dedupe rows were only pruned by the cron endpoint | page-load maintenance also prunes, at most hourly | — |
| D10 | Players can copy another player's display name | documented (display names aren't unique; `@username` shown on leaderboards ≥ 400px) | — |

D11 (spoofable IPs without a proxy) and D12 (sealed pages return 200) are unchanged; both are documented above.

## Thirteenth independent audit (fresh agent, build of commit d7dd456)

**Result: 13 PASS, 4 CONCERN (10, 13 minor, 16/17 docs), 0 FAIL.**

It confirmed the twelfth round:
- fuzzed URLs return 404/308/307 with no 500s
- all `next` redirect tricks stay on-site
- 18-way claim races are safe
- its SQL recompute matched all 36 users
- an anonymous confessor's profile was byte-identical before and after filing
- 56 concurrent reaction toggles left exact counts

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 | Personal-info, link and handle filter evasions: `555/867/5309`, `555_867_5309`, Arabic-Indic digits, `.de`/`.ru` domains, `h t t p s : / /`, `,@handle`, lower-case "42 wallaby way" | phone numbers match any script's digits and `/` `_` separators; any two-letter country TLD and more generic TLDs; URLs checked with spaces removed; a handle only needs no word glued to its left; a lower-case street pattern that skips everyday filler words | unit: 9 evasions rejected and 6 everyday sentences ("3 slices on the way", "e.g.", "7.30", "3-2") still accepted; all seed content still passes |
| 2 | Error alerts were unreadable on parchment (pale text on paper, 1.34:1) | alerts carry `data-alert` and switch to ink colours inside any `.doc` surface | visual |
| 3 | The "allow featuring" opt-out was ignored by moderator pins and by today's existing pin | pinning refuses opted-out confessors, and today's pin is replaced once its confessor opts out | integration `respects the featuring opt-out…` |
| 4 | `/jury?case=<a case awaiting counsel>` said "deliberation has closed" | only deliberating or closed cases can be pinned on the jury page | — |
| 6 | "Former Citizen" and "Judge Wigsworth Jr" were allowed as display names | the retired-account name is reserved; names containing an officer's name (8+ letters) are refused | integration (variants rejected) |
| 7 | A tampered avatar value showed a raw Zod message | friendly enum messages | — |
| 8 | Tally percentages could add up to 101% | the two shares always sum to 100 | — |

Not changed:
- **Defect 5, stale countdown after a rejected filing.** This only happens when the claim's expiry is edited directly in the database. In normal use the countdown has already reached zero. Refreshing on failure would discard the player's draft.
- **Defect 9 (sealed pages return 200) and defect 10 (spoofable IPs without a proxy).** Both are documented.

## Fourteenth independent audit (fresh agent, build of commit f88ba99)

**Result: 15 PASS, 2 CONCERN (10 filter, 16 one README claim), 0 FAIL, no high-severity defects.**

It confirmed the thirteenth round end to end:
- every race and role bypass it tried failed
- its SQL recount matched every counter, tally and reaction after bans, deletions and races
- reduced motion stops all animation
- all `next` variants are blocked
- 123 links had no dead ones

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 | robots.txt froze `SITE_URL` at build time (pointing at localhost) | `dynamic = "force-dynamic"`, like the sitemap | e2e: robots.txt names the runtime sitemap URL |
| 3 | Spelled-out evasions: `bob [at] example [dot] com`, spaced-out letters ("r e t a r d"), a phone number in words, "on insta as john_smith_1990" | patterns for each (slices of single-letter runs are checked as words) | unit: 6 evasions rejected, 5 everyday sentences still accepted; seed content clean |
| 4 | Muted categories still showed on the home page's recent verdicts and in related-case filler | both respect the viewer's muted list | — |
| 5 | "Case No. 0050 could be yours" used the visible-case count | the real next number (`max + 1`) | — |
| 6 | Banned and deleted players still earned XP; a banned player's open cases were claimable | `awardXp` pays no one banned or deleted (records still update); those cases are on hold | integration `banned players earn nothing new…` (stats audit still passes) |
| 7 | Counsel weren't told when a sealed trial resumed; "verdict in 24h" was sent for a trial starting under review | restore notifies counsel; the under-review filing says the clock starts after review | — |
| 8 | `make-mod` for an unknown user → generic crash | NOT_FOUND | — |
| 9 | Dismissed (below-quorum) cases ranked as "controversial" | controversy 0 for dismissals (plus migration `20261109090000_dismissed_controversy` for existing rows) | — |
| 10 | Toast backlog piled up on phones | at most the 3 newest pop up; older ones stay in the inbox | — |
| 11 | axe: active reaction chip contrast 3.84:1; label-content-name mismatch in the header | lighter reaction colours (≥ 4.5:1 with ink); the account button's label starts with its visible text; decorative tagline `aria-hidden` | e2e a11y suite |
| 12 | Reacting on an under-review case said "not found" | "Reactions are paused while the clerks review this case." | — |

Unchanged and documented: issue 2 (lockout and spoofable IPs without a proxy) and sealed pages returning 200.

## Fifteenth independent audit (fresh agent, build of commit 6969112)

**Result: 13 PASS, 1 FAIL (5 claims), 3 CONCERN (10, 15, 17).**

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 (FAIL) | **A seal or ban racing the holder's filing** sent a case with a filed defense back to the docket (`AWAITING_DEFENSE` with an argument on file): unplayable after restore, or immediately after a ban. Reproduced 2 of 9 and 2 of 5 times | `releaseClaims` updates conditionally on the state it read (status + holder). A filing that commits first makes the release match nothing, so the filed case is left alone. Used by seal, ban and account deletion | integration `a seal racing the holder's filing never sends a filed case back to the docket`: the filing is held mid-commit with `pg_sleep`. **Fails on the old code** |
| 2 | Banning a player hid their *anonymous* open cases too, revealing which were theirs | anonymous cases stay claimable; only public ones are held (documented) | ban integration test: the anonymous case is still queued and claimable |
| 3 | Violent and serious-crime confessions passed ("I poisoned the office coffee machine with bleach…", "I sold cocaine to kids", "I stabbed/shot/killed my …"); a spaced-out email passed | past-tense harm against a person or pet, poisoning food or drink with a dangerous substance, drug dealing; single-character runs squashed and checked as emails | unit: 6 rejected, 5 everyday phrases ("killed it at karaoke", "shot a video", "stabbed the pizza box") still accepted; seed clean |
| 4 | "Judge Wigsvvorth" ("vv" for "w") passed the officer-name check | "vv" → "w" and "rn" → "m" are folded too | integration |
| 5 | The featured case ignored muted categories | hidden when its category is muted | — |
| 7 | A missing or placeholder `SESSION_SECRET` only failed per request | `src/instrumentation.ts` refuses to start the production server | manual: start without the secret → "Refusing to start" |

Not changed: sealed pages return 200 (with `noindex`), and inline text links follow the WCAG inline exception.

Verification note: the first full run on `36770c2` had one mobile e2e failure. The `long unbroken words` test timed out waiting for navigation while the machine was heavily loaded (that run took 3.4 min against the usual 1.8). It passed in three back-to-back reruns of the same Phase 9 command. The test now waits for the page to settle before re-submitting and fails fast with a clear message.

## Sixteenth independent audit (fresh agent, build of commit 6d49ae2)

**Result: 16 PASS, 1 CONCERN (10 forms), 0 FAIL.** Every gameplay, race, statistics and anonymity check passed. Specifically:
- 20 concurrent votes produced a single vote.
- Claim races (12-way, expiry boundary, ban vs claim ×8) held.
- A seal pause restored exactly the time paused.
- Ban → below quorum → extension → dismissal worked.
- Every case's tally equals its Vote rows.
- All README statements it checked are accurate.

Its low-severity findings, all fixed:

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 | The title minimum could be met with stacked combining marks ("é" + 15 accents counted as 16 characters) | `charCount` counts grapheme clusters; normalisation keeps at most 2 combining marks per character (no zalgo) | unit: zalgo "é" counts as 1; a 3-letter zalgo title is rejected; "café" = 4 |
| 2 | Case pages offered "Take this case" on a case held because its (public) accused is banned | the stage callout shows "Case on hold" instead | — |
| 3 | Filter precision: "2019-2020 season", "12345678 points" and "1 2 3 4 5 6 7 8 steps" were rejected; "k1ll", "x dot com" passed | phones need 9+ digits; leetspeak-decoded copy checked for threats; spelled-out domains caught; remaining gaps documented in README | unit: 3 accepted, 2 rejected |
| 7 | A moderator's invalid cosmetic grant said "Unknown item" before "admins only" | permission checked first | — |

Unchanged:
- Next.js answers a forged cross-origin server action with a 500 after aborting it; nothing is stored. This is framework behaviour.
- Sealed pages return 200 with `noindex`.
- `X-Forwarded-For` can be spoofed without a proxy (documented).

## Seventeenth independent audit (fresh agent, build of commit cc7a66b)

**Result: 14 PASS, 3 CONCERN (5*, 10, 17), 0 FAIL.**

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 | **A ban racing the player's own in-flight votes and claims**: the votes kept counting and the claims stayed held (3 of 6 runs) | `assertActiveUser` takes `FOR SHARE` on the user row. A ban (or account deletion, now reordered to write the user row first) waits for in-flight actions to commit before sweeping votes and claims, and later actions see the ban | integration `a ban racing the player's own in-flight votes and claims always wins` (6 rounds): **fails on the old code 3/3**, passes 3/3 |
| 2 | The canonical-slug 308 revealed a sealed case's title to anyone guessing its number | only visible cases are canonicalised | e2e: no slug redirect for a sealed case |
| 3 | Serious crime passed the filter (car theft, bank robbery, arson, domestic violence, drunk driving, selling weed to teenagers), as did a spelled-out house number | patterns for each, with everyday phrases still allowed | unit: 8 rejected, 5 accepted ("hit my brother with a pillow", "stole my sister's car keys"…) |
| 4 | Impersonation with Armenian ս or Cherokee Ꮯ, or one extra letter ("Wiggsworth") | Latin can't be mixed with *any* other script; names within one edit of an officer's (8+ letters) are refused | unit + integration |
| 5 | A bad `SESSION_SECRET` left the server up and serving 500s, not "refusing to start" as the README says | the startup hook logs and exits with code 1 | manual: `SESSION_SECRET=short next start` → exit 1 |
| 6 | Invalid profile and password saves used up those rate limits | validation first | — |
| 7 | Malformed percent-encoding (`/cases/%E0%A4%A`) gave a bare-text 500 | `src/proxy.ts` answers 400 | e2e |
| 8 | The moderation console showed the live guilty/not-guilty split (staff can also be jurors) | total only until the verdict | — |
| 9 | Deleted accounts still received notifications | `notify` skips them | — |

## Eighteenth independent audit (fresh agent, build of commit d4fb93f)

**Result: 14 PASS, 3 CONCERN (10, 12, 17), 0 FAIL.**

It confirmed the seventeenth round:
- bans remove votes even under a race, with consistent tallies
- the server exits on a bad secret
- 17-way claim races are safe
- its SQL recount matched all 47 users
- axe found no violations on 14 more pages
- hidden tallies and anonymous identities don't leak

| # | Issue | Fix | Test |
| --- | --- | --- | --- |
| 1 | **A seal could be silently undone by a concurrent "Dismiss reports"**: the case was left visible with a removal reason, and both moderators were told they succeeded | every moderation action on a case first takes its row lock (`lockCase`), so they run one at a time. Dismissing reports only makes an *under-review* case visible, and it says so when the case stays sealed | integration `a seal racing 'dismiss reports' always ends sealed` (12 races): **fails on the old code 3/3** |
| 2 | "gonna kill my roommate" passed: the regex demanded a "t" after "gonna". Also "k i l l", `evil[.]com`, `evil.c0m`, `555-123-45six7`, "forty two Wallaby Way", "ig: coolguy" | fixed the pattern. Threats, links and phone numbers are also checked on decoded variants (bracketed dots, leetspeak, number words → digits, spaced letters joined); "way" added for spelled addresses; `platform:` handles caught | unit: 9 rejected, 3 hyperboles ("mom is gonna kill me") still accepted; seed clean |
| 3 | The achievement toast covered the open account menu on phones | toasts sit below the header and its menus | — |
| 4 | "Dismiss reports" on a sealed case said "visible again"; adjourn racing a seal said "Nothing to close" | accurate messages | — |
| 5 | A NUL byte in `claimAction`/`releaseAction`'s case id reached Postgres | case ids are validated | — |
| 6 | Emoji ZWJ sequences (👩‍👩‍👧) were split apart | joiners are kept between emoji and stripped elsewhere | unit |
| 7 | "The case has been returned to the docket" before maintenance had requeued it | wording says it goes back on the docket, and that the draft is kept | — |
| 9 | Reaction buttons looked tappable to participants and banned players | visible reason text under the disabled buttons | — |

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
