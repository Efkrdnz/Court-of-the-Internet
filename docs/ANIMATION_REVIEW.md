# Animation & visual review

A manual, frame-by-frame review of the main animations, captured from the **production build** (`next start`) with motion enabled (`prefers-reduced-motion: no-preference`). Frames are in [`docs/review/`](review/). Automated checks for the same behaviour live in `e2e/section12.spec.ts` ("animations work without breaking interactions", "visual assets render correctly").

## Verdict reveal (case page, first view in a session)

| Frame | What happens | Verified |
| --- | --- | --- |
| [`verdict-0150ms.png`](review/verdict-0150ms.png) | "The court will now come to order…" placeholder. The owl judge has the gavel raised, the verdict text is dimmed, and the tally bars are empty. | ✔ |
| [`verdict-0700ms.png`](review/verdict-0700ms.png) | The gavel slams onto the sound block, and impact lines appear. The bars are still empty. | ✔ |
| [`verdict-1250ms.png`](review/verdict-1250ms.png) / [`verdict-1500ms.png`](review/verdict-1500ms.png) | The GUILTY stamp has landed (spring scale-in from 2.6×), the verdict text fades to full opacity, and the tally bars fill in sequence. | ✔ |
| [`verdict-2600ms.png`](review/verdict-2600ms.png) | Settled final state. The owl's idle gavel-tap keeps running, and **Replay the verdict** replays the sequence. | ✔ |

**Issue found and fixed in this review:** the tally bars were mounted before the reveal started, so they were already full during the gavel slam instead of filling as the stamp landed. They are now remounted per reveal run and delayed by 1.15s (`TallyBars` `delay` prop, `key={runId}` in `VerdictReveal`).

Interactivity during and after the animation: the e2e test clicks **Replay**, then **Copy link** while the replay is running, and both respond. No element intercepts pointer events.

## Character hover reactions

| Frame | What happens |
| --- | --- |
| [`judge-idle.png`](review/judge-idle.png) → [`judge-hover.png`](review/judge-hover.png) | Hovering the owl judge swings the gavel arm into a slam, and the eyes widen. Every character has its own reaction (pigeon puffs its chest, raccoon jabs, hamster's cheeks puff, bulldog flexes, cats turn their heads, pizza sobs harder). See `src/components/art/characters.css`. |

## Jury vote booth

| Frame | What happens |
| --- | --- |
| [`vote-1-choose.png`](review/vote-1-choose.png) | The two verdict cards and a judging cat jury. Tallies are hidden. |
| [`vote-2-confirm-opening.png`](review/vote-2-confirm-opening.png) | GUILTY is selected: the card scales up with a gold ring, the other dims, the cats switch to a shocked expression, and the confirmation panel starts expanding. |
| [`vote-3-confirm-open.png`](review/vote-3-confirm-open.png) | The confirmation panel is open ("Votes are final…"). **Reconsider** and **Seal my vote** are usable immediately; e2e clicks both during and after the transition. |

## Reduced motion

- **Player setting:** turning on "Reduce motion" in Settings sets `html[data-motion="reduce"]`. Every CSS animation is scoped to `html:not([data-motion="reduce"])` inside `@media (prefers-reduced-motion: no-preference)`, and Motion runs with `reducedMotion="always"`. Confetti isn't rendered, and the verdict shows its final state with no replay. Verified by e2e, which asserts zero running character animations.
- **OS setting:** the OS preference is honoured the same way. Hydration-safe: the server and the first client render agree (`useReduceMotion`).
