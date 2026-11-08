# Animation & visual review

A manual, frame-by-frame review of **every animation in the app**, captured from the **production build** (`next start`) with motion enabled. Frames are in [`docs/review/`](review/). The automated checks for the same behaviour are in `e2e/section12.spec.ts`: "animations work without breaking interactions" and "visual assets render correctly".

## Inventory

| # | Animation | Where | Tech | Reviewed | Frames | Result |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Verdict reveal: judge raises the gavel → slam with impact lines → stamp springs in → text fades in → tally bars fill | Case page, closed case (first view per session; **Replay** button) | Motion + CSS | ✔ frames + e2e | `verdict-0150ms` … `verdict-2600ms` | ✔ after fix A |
| 2 | Winner's confetti (paper documents + gold/crimson pieces) | Verdict reveal when the viewer won | Motion | ✔ frame | `winner-confetti-1450ms` | ✔ does not cover controls (`pointer-events: none`) |
| 3 | Achievement / level-up toast: spring pop-in, badge pop + shine sweep, confetti | Any page, after an unlock | Motion + CSS (`bdg-unlock`) | ✔ frames | `toast-0080ms`, `toast-0530ms`, `toast-1830ms` | ✔ after fix B |
| 4 | Vote booth: selected card scales with a gold ring, the other dims, the cat jury changes mood, the confirm panel expands, and the tally bars fill after voting | Jury duty, case page | Motion | ✔ frames + e2e | `vote-1-choose`, `vote-2-confirm-opening`, `vote-3-confirm-open` | ✔ buttons usable mid-transition |
| 5 | Reaction "bump" (scale/rotate) on toggle | Case page | Motion | ✔ e2e | (n/a, 300ms) | ✔ re-clickable immediately |
| 6 | Character idle loops: blinking, breathing/bob, owl gavel tap, raccoon pointing jab, tail sway, hamster sweat + shake, pizza tears, cats' tail swish | Everywhere characters appear | CSS keyframes | ✔ e2e asserts running; frames | `judge-idle` | ✔ |
| 7 | Character hover reactions (owl gavel slam + wide eyes, pigeon chest puff, raccoon harder jab, hamster cheek puff, bulldog flex, cats turn heads, pizza sobs) | `.chr-hover` containers | CSS | ✔ frames | `judge-idle` → `judge-hover` | ✔ |
| 8 | Hero stamp slam (scale 2.5× → 1× with bounce) | Landing hero | CSS `prp-stamp-slam` (0.6s) | ✔ computed-style check + frames | `hero-stamp-0060ms`, `hero-stamp-1660ms` | ✔ plays during page load |
| 9 | Evidence folder opens on hover (cover folds, papers lift) | Archives header | CSS `.prp-hover` | ✔ frames | `folder-closed` → `folder-open-hover` | ✔ |
| 10 | Badge hover wiggle | Profiles, achievements | CSS `bdg-hover` | ✔ frames | `badge-idle` → `badge-hover` | ✔ |
| 11 | Empty-state scenes: tumbleweed roll + dust, sleeping bailiff Z's + steam | Empty queues, archive searches, jury | CSS `scn-*` | ✔ frames | `tumbleweed-a` → `tumbleweed-b` | ✔ |
| 12 | Loading gavel tap + rotating funny loading lines | Route `loading.tsx` (archives, leaderboards, queues…) | CSS `scn-loading-gavel` + interval | ✔ code review (short-lived) | n/a | ✔ |
| 13 | Scales sway, wax-seal shine sweep | Archives stats, seals | CSS | ✔ visible in page screenshots | n/a | ✔ |
| 14 | Page rise-in (`animate-in*`), spotlight flicker | Hero headings, landing spotlight | CSS | ✔ visual | n/a | ✔ subtle, non-blocking |
| 15 | Card lift, button press, category-tile tilt on hover | Global | CSS transitions | ✔ visual | n/a | ✔ |

## Issues found during this review (fixed)

- **A. Tally bars filled too early.** In the verdict reveal the bars were already full before the gavel came down. They are now remounted per reveal run and fill as the stamp lands (`TallyBars` `delay` prop, `key={runId}`). Before: `verdict-0150ms` (old capture) showed full bars. After: bars are empty at 150ms and 700ms and filled from about 1.3s.
- **B. Toast confetti covered the text.** Confetti was drawn over the toast card ("Cat Herder" partly hidden). It now falls behind and around the card (`z-0` confetti, `z-10` card, no clipping). See `toast-0530ms`.

## Reduced motion

- **Player setting:** turning on "Reduce motion" in Settings sets `html[data-motion="reduce"]`. Every CSS animation is scoped to `html:not([data-motion="reduce"])` inside `@media (prefers-reduced-motion: no-preference)`, and Motion runs with `reducedMotion="always"`. Confetti isn't rendered, and the verdict shows its final state with no replay. e2e asserts zero running character animations with the setting on.
- **OS setting:** the OS preference is honoured identically. Rendering is hydration-safe (`useReduceMotion`): the server and the first client render agree.
