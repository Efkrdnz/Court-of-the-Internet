# GOAL.md requirements traceability

A line-by-line review of every requirement in [`GOAL.md`](../GOAL.md), mapped to where it is implemented and how it is verified. Abbreviations:
- `IT` = `tests/integration/*`
- `UT` = `tests/unit/*`
- `E2E` = `e2e/*` (run against the production build)
- `S12` = `e2e/section12.spec.ts`
- `ANIM` = `docs/ANIMATION_REVIEW.md`

## 1. Core concept

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Accused confesses a ridiculous offense | `/confess`, `services/cases.ts#confess` | E2E lifecycle (desktop + Pixel 7) |
| Defense attorney defends another player's offense | `/defend`, `claimCase` + `submitArgument(DEFENSE)` | E2E lifecycle, IT lifecycle |
| Prosecutor reads accusation + defense, argues to convict | `/prosecute/[id]` shows confession + defense | E2E lifecycle asserts the defense text is visible to the prosecutor |
| Others serve as jurors, vote Guilty / Not Guilty | `/jury`, `VoteBooth`, `castVote` | E2E lifecycle (3 jurors), S12 |
| Serious institution × absurd disputes tone | Design system, copy, 42 seeded cases | Screenshots reviewed (README, ANIM) |

## 2. Gameplay & case lifecycle

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Title, category, confession, optional context | `confessionSchema`, `ConfessionForm` | UT validation, E2E |
| Anonymous public display, internal ownership kept | `Case.anonymous` + alias DTO (`toCaseCard`) | IT "anonymous confessions", IT leaderboards |
| Unique case number | `Case.number` autoincrement, `No. 0042` | IT (`number === 1`) |
| Validate submissions, prevent spam | Zod, content filter, daily cap, duplicates, honeypot, rate limits | UT filter, IT "confession rules", E2E (duplicate rejected) |
| Enters Awaiting Defense | status `AWAITING_DEFENSE` | IT lifecycle |
| Another player claims as attorney | atomic `claimCase` | IT 12-way race |
| Exactly one defense, ~750 chars | `@@unique([caseId, role])`, `LIMITS.argument.max = 750` | IT "Exactly one defense" |
| Accused cannot defend themselves | `eligibilityError` + conditional update | IT role restrictions, E2E disabled button |
| → Awaiting Prosecution | `submitArgument` | IT |
| Different player claims prosecution, sees confession + defense | `EditorPage` | E2E |
| Exactly one rebuttal | unique constraint | IT |
| No existing participant can prosecute | `accusedId`/`attorneyId` guards | IT, E2E "You defended this case" |
| → Jury Deliberation | status `DELIBERATION`, 24h window | IT checks the 24h window |
| Eligible players read the complete case and vote once | `VoteBooth` | E2E |
| Participants can't vote on their own case | `castVote` guard | IT, E2E ineligibility messages |
| One vote per account | `@@unique([caseId, userId])` + transaction | IT concurrent double vote, S12 stale-tab |
| Tallies hidden until voted or closed | `toCaseCard` (`tallies: null`) | E2E asserts the tally is absent before voting |
| Voting open 24 hours | `COURT_DELIBERATION_HOURS=24` | IT "rejects votes after the window" |
| At least 10 votes for a verdict | `COURT_QUORUM=10` | UT `decideVerdict`, IT |
| Low participation behaviour | one 24h extension, then DISMISSED | IT extension + dismissal + late quorum |
| Server-side verdict calculation | `closeDeliberation` counts `Vote` rows | IT |
| Guilty → prosecution win; Not Guilty → defense win; tie → mistrial | `decideVerdict`, `applyVerdictEffects` | UT, IT |
| Entertaining verdict animation | `VerdictReveal` | ANIM, S12 animation tests |
| XP, reputation, achievements awarded | `progress.ts`, `verdict.ts` | IT exact XP and reputation, achievements |
| Permanent public archive | `/archives` | S12 archives vs DB |
| Unique shareable URL | `/cases/{n}-{slug}` + 308 canonical redirect | E2E, production route check |
| Transactions, concurrency protection, authorization | conditional updates, advisory locks, `requireActiveUser` | IT races, closer race, mutation-checked claim test |
| Claim expiry and requeue | lazy reclaim + sweep + grace | IT expiry tests |

## 3. Game modes

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Confess: dramatic form, playful categories, live preview, anonymity, track progress | `ConfessionForm`, dashboard | E2E desktop + mobile |
| Attorney: browse or *receive* cases, claim, write, streak, rankings | `QueuePage`, "Assign me a random case", attorney leaderboard | E2E mobile claim-and-file, leaderboards specs |
| Prosecutor: browse, read defenses, rebut, record, rankings | queue with defense excerpts, prosecutor board | E2E, leaderboards specs |
| Jury Duty for all eligible players | `/jury` | E2E, S12 |
| Visually distinct entry points | teal / crimson / gold / plum modes with different characters | Screenshots (contact sheet) |

## 4. Visual identity

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Burgundy, charcoal, black, parchment, ivory, gold; legal + playful type | `globals.css` tokens; Playfair, Bricolage, Special Elite, UnifrakturCook | S12 asserts all 4 fonts loaded |
| Ornate borders, case files, wax seals, stamps, documents | `doc`, `folder`, `OrnateCorner`, `WaxSeal`, `VerdictStamp`, `EvidenceFolder` | S12 pixel check of all art |
| Judge in a powdered wig, pigeon attorney, raccoon prosecutor, hamster defendant, bulldog bailiff with sandwich, jury of cats, crying pizza, stamps, doodles, seals, achievement icons | `components/art/*` (original SVG) | S12 pixel check: each rendered with visible multi-colour pixels, all 12 category icons, all 20 badges, all 4 stamps |
| Not emoji-based; never claim generated assets | all hand-written SVG; README credits | Code review |
| Microinteractions (gavel, stamp, folder, hover, jury transitions, confetti, funny empty/loading states) | see ANIM inventory (15 animations) | ANIM frames + measurements; S12 |
| Reduced-motion support | OS + per-user setting | S12 reduce-motion test |

## 5. Pages

| Page and required elements | Verification |
| --- | --- |
| Landing: hero, funny headline, animated scene, four CTAs, featured cases, stats, how it works | Screenshots; S12 navigation |
| Dashboard: cases by stage, my cases, pending actions, daily activity, recommendations | `/court`; E2E mobile; screenshots |
| Confession page: form, categories, counter, validation, preview | E2E validation (empty submit), live preview asserted |
| Queues: listings, filters, sorting, claiming, editor | E2E; mobile claim-and-file |
| Jury Duty: full case, distinct treatment per statement, voting, verdict reveal | E2E, S12 |
| Archives: search, categories, sort (recent/popular/controversial/funniest), verdict stats, share links | S12 archives vs DB; sort chips in UI |
| Case detail: timeline, three arguments, participants, results, animation, related cases | E2E; screenshots |
| Profiles: username, avatar, XP/level, role stats, win rates/streaks, achievements, history, customization | S12 profile vs DB; settings test |
| Leaderboards: attorneys, prosecutors, most convicted, streaks, active jurors, entertaining cases | IT + E2E leaderboards |
| Settings & moderation: account, reporting, content controls, admin console | E2E settings, report, moderation adjourn, staff-only 404 |
| All pages work on desktop and mobile | E2E desktop + Pixel 7 (18 mobile tests + full trial on mobile); contact sheet |

## 6. Progression

| Requirement | Verification |
| --- | --- |
| Tracks: cases, verdicts, defense/prosecution W/L, rates, streaks, jury participation, popularity, XP/level, achievements | IT season audit; `npm run audit:stats`; S12 profile = DB |
| Participation thresholds on boards | IT + E2E leaderboards |
| Entertaining achievements (Certified Menace, Objection Overruled, …, Justice Has Been Served) | `lib/achievements.ts` (20); IT asserts grants |
| Original achievement art + distinctive unlock notifications | 20 badges (S12 pixel check); toast (ANIM) |
| No paid advantages | `tests/unit/fairness.test.ts` |

## 7. Social

| Requirement | Verification |
| --- | --- |
| Shareable links, OG previews, copyable summaries, result cards | E2E OG PNG check; "Copy verdict summary"; downloadable card |
| Public profiles; funny titles and categories | E2E |
| Reactions (Hilarious, Outrageous, Legendary + Relatable) | IT counters; E2E toggle + persistence |
| Featured case of the day, community highlights | `getFeaturedCase`, `getHighlights`; landing/archives screenshots |
| Browse without registration | E2E (signed-out visitor reads the verdict + archive) |

## 8. Monetization architecture

| Requirement | Verification |
| --- | --- |
| Extensible premium themes, badges, appearances, customization, private courtrooms, advanced stats, memberships | `lib/cosmetics.ts`, `Entitlement`, `membershipTier`, `PaymentProvider`; `docs/MONETIZATION.md` (private courtrooms and advanced stats designed, not built) |
| Fair: no bought votes or verdicts | fairness test |
| No live payment processor | `DisabledPaymentProvider`; no buy buttons |

## 9. Technical architecture

| Requirement | Verification |
| --- | --- |
| Next.js App Router, strict TS, Tailwind, Prisma/Postgres, Zod, Motion, Vitest, Playwright | `package.json`; `tsc` clean |
| Supabase "where appropriate" | First-party auth chosen to avoid external services; swap path documented in README |
| Local dev without external services | Docker Compose or local Postgres + seed; README quick start |
| Real persistent DB, relational models, migrations, seed | `prisma/` |
| Secure auth, ownership and permissions, atomic ops, server-enforced transitions | IT suites |
| Validation and sanitization, rate limiting, error handling | UT/IT; `toFailure`; CSP + headers asserted in S12 |
| Efficient queries + pagination | indexed queries, `PAGE_SIZE` pagination |
| Accessible UI | axe on 13 pages (E2E a11y) |
| Responsive | E2E mobile |
| Never trust the client | all checks in services; IT exercises services directly |

## 10. Safety & moderation

| Requirement | Verification |
| --- | --- |
| Clear community rules | `/rules`; accepting them is required on signup and confession |
| Disallowed content screened (doxxing, real-person accusations, threats, hate, sexual, illegal, real-world harm) | UT content filter + reports with these reasons |
| Reporting, removal, moderation states, anti-spam | IT moderation; E2E report + moderation console |
| No private info shown in anonymous mode | DTOs carry no user ids; IT anonymity tests |

## 11. Process

| Requirement | Evidence |
| --- | --- |
| Plan first; 10 phases; checklist; review + test per phase | `docs/SPEC.md`, `PROGRESS.md`; `scripts/verify-phases.sh` (PASS ×10) |
| Coherent smaller version + documented limitation when needed | README "Known limitations" |

## 12. Final quality requirements

See the evidence table in [`PROGRESS.md`](../PROGRESS.md#goalmd-12-verification-final-state). Every item maps to an S12 test or a named suite.

## Review notes (from this line-by-line pass)

- **Supabase:** deliberately not used. A no-setup local experience was the higher-priority requirement, and the swap path is documented. This is a stated decision, not a gap.
- **Private courtrooms and advanced statistics:** designed but not built, as GOAL.md §8 asks only for *extensible support*. Documented in `docs/MONETIZATION.md` and the README.
- **README:** checked against the code (scripts, counts, demo accounts, test descriptions). One inaccuracy was found earlier (`clerk_pemberton` missing from demo login) and fixed. Test counts are updated by this pass.
