# Build Progress Checklist

Requirements: [`GOAL.md`](GOAL.md) · Design: [`docs/SPEC.md`](docs/SPEC.md)

Legend: `[x]` done and verified · `[~]` in progress · `[ ]` not started

## Phase 1: Product architecture & gameplay specification
- [x] Inspect environment (Node 22, Postgres 16 local, Playwright 1.63 + Chromium preinstalled, no Docker daemon)
- [x] Choose stack (Next 16 / React 19 / Prisma 6 / Postgres / Tailwind 4 / Zod 4 / Motion / Vitest / Playwright)
- [x] Write lifecycle state machine, quorum rules, progression, moderation, monetization design (`docs/SPEC.md`)

## Phase 2: Database design & backend foundations
- [ ] Prisma schema + initial migration
- [ ] Prisma client singleton, env config, CourtError
- [ ] DB-backed rate limiter
- [ ] Content filter + Zod schemas
- [ ] Seed script driven by the real services

## Phase 3: Authentication, authorization & case lifecycle
- [ ] scrypt password hashing, DB sessions, cookie handling
- [ ] Sign up / log in / log out actions + pages
- [ ] Case services: confess, claim, release, submit defense/rebuttal, vote, close
- [ ] Claim expiry + requeue, deliberation extension, dismissal
- [ ] Integration tests: lifecycle, role restrictions, double vote, concurrent claims

## Phase 4: Gameplay interfaces
- [ ] Confession page (form, categories, live preview, anonymity)
- [ ] Attorney queue + editor
- [ ] Prosecutor queue + editor
- [ ] Jury duty + vote booth
- [ ] Courtroom dashboard

## Phase 5: Visual identity, illustrations, animations
- [ ] Design tokens, typography, textures, ornate frames
- [ ] Character SVGs (judge, pigeon attorney, raccoon prosecutor, hamster, bailiff, cat jury, crying pizza)
- [ ] Stamps, seals, gavel, folders, category icons
- [ ] Microinteractions (gavel slam, stamp, folder open, vote transitions, confetti), reduced motion

## Phase 6: Statistics, profiles, achievements, leaderboards
- [ ] XP/level/reputation, stats updates, recompute check
- [ ] Achievement engine + badge art + unlock toasts
- [ ] Profiles with customization (avatar builder, themes)
- [ ] Leaderboards with Wilson ranking + thresholds

## Phase 7: Archives, discovery, sharing
- [ ] Archives search/filter/sort/paginate
- [ ] Case detail (timeline, arguments, results, related)
- [ ] OG images, share card, copy summary
- [ ] Reactions, featured case, community highlights, landing page stats

## Phase 8: Moderation, security, edge cases
- [ ] Rules page, reports, auto review state
- [ ] Moderation console + audit log
- [ ] Settings (account, content controls, password, delete account)
- [ ] Security headers, rate limits on all mutations, anonymity leak review

## Phase 9: Integration testing, accessibility, responsive polish
- [ ] Playwright e2e for the full lifecycle
- [ ] axe accessibility checks
- [ ] Mobile screenshots reviewed for every page

## Phase 10: Final debugging, docs, deployment prep
- [ ] `tsc`, lint, build clean
- [ ] README (setup, dev, deploy, limitations)
- [ ] Final verification against GOAL.md §12
