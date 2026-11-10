/**
 * Deterministic aliases for anonymous defendants. The alias is derived from a random
 * per-case seed (never from the user id), so it cannot be correlated across cases.
 */
export const CRITTERS = [
  "Hamster",
  "Raccoon",
  "Pigeon",
  "Goose",
  "Possum",
  "Ferret",
  "Capybara",
  "Otter",
  "Badger",
  "Llama",
  "Axolotl",
  "Weasel",
  "Seagull",
  "Gremlin",
  "Platypus",
  "Walrus",
] as const;

export const ADJECTIVES = [
  "Suspicious",
  "Sweaty",
  "Shifty",
  "Innocent-Looking",
  "Crumb-Covered",
  "Unrepentant",
  "Nervous",
  "Sneaky",
  "Smug",
  "Mysterious",
  "Twitchy",
  "Hungry",
] as const;

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function anonymousAlias(seed: string): { name: string; critter: (typeof CRITTERS)[number]; tag: string } {
  const h = hash(seed);
  const critter = CRITTERS[h % CRITTERS.length];
  const adjective = ADJECTIVES[(h >>> 8) % ADJECTIVES.length];
  const tag = (h >>> 4).toString(16).toUpperCase().padStart(4, "0").slice(-4);
  return { name: `${adjective} ${critter} #${tag}`, critter, tag };
}
