import { z } from "zod";

export const SPECIES = ["pigeon", "raccoon", "hamster", "cat", "owl", "frog", "bulldog", "goose"] as const;
export const HEADWEAR = ["none", "barrister-wig", "judge-wig", "bowler", "beret", "crown", "party-hat", "detective"] as const;
export const ACCESSORIES = ["none", "monocle", "sunglasses", "bowtie", "mustache", "reading-glasses"] as const;
export const BACKDROPS = ["burgundy", "gold", "ivory", "teal", "plum", "charcoal"] as const;

export type Species = (typeof SPECIES)[number];
export type Headwear = (typeof HEADWEAR)[number];
export type Accessory = (typeof ACCESSORIES)[number];
export type Backdrop = (typeof BACKDROPS)[number];

export const avatarSchema = z.object({
  species: z.enum(SPECIES),
  headwear: z.enum(HEADWEAR),
  accessory: z.enum(ACCESSORIES),
  backdrop: z.enum(BACKDROPS),
});

export type AvatarConfig = z.infer<typeof avatarSchema>;

export const DEFAULT_AVATAR: AvatarConfig = {
  species: "pigeon",
  headwear: "barrister-wig",
  accessory: "none",
  backdrop: "burgundy",
};

export function parseAvatar(value: unknown): AvatarConfig {
  const parsed = avatarSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_AVATAR;
}

/** Starter avatars use only items every player owns (no locked goose or premium plum). */
export const STARTER_SPECIES = SPECIES.filter((s) => s !== "goose");
export const STARTER_BACKDROPS = BACKDROPS.filter((b) => b !== "plum");

export function randomAvatar(seed: number = Math.random() * 1e9): AvatarConfig {
  const pick = <T,>(arr: readonly T[], salt: number) => arr[Math.floor(Math.abs(Math.sin(seed + salt) * 10000)) % arr.length];
  return {
    species: pick(STARTER_SPECIES, 1),
    headwear: pick(["none", "barrister-wig", "bowler", "beret"] as const, 2),
    accessory: pick(["none", "monocle", "bowtie", "reading-glasses"] as const, 3),
    backdrop: pick(STARTER_BACKDROPS, 4),
  };
}

export const BACKDROP_COLORS: Record<Backdrop, { bg: string; ring: string }> = {
  burgundy: { bg: "#6b1426", ring: "#c9a227" },
  gold: { bg: "#c9a227", ring: "#6b1426" },
  ivory: { bg: "#f3ead6", ring: "#8a6d1c" },
  teal: { bg: "#1f5f58", ring: "#e8c766" },
  plum: { bg: "#4b2a5e", ring: "#e8c766" },
  charcoal: { bg: "#2a2326", ring: "#c9a227" },
};
