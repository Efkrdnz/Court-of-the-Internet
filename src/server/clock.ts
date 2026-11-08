import "server-only";

/**
 * Single source of "now" for game logic. Tests and the seed script override it to
 * simulate time passing; production code must never mutate it.
 */
export const clock = {
  now: (): Date => new Date(),
};

export function setClock(fn: () => Date) {
  clock.now = fn;
}

export function resetClock() {
  clock.now = () => new Date();
}
