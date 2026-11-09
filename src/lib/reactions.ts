export const REACTIONS = [
  { type: "HILARIOUS", label: "Hilarious", verb: "laughed", weight: 2, color: "#e0a82e" },
  { type: "OUTRAGEOUS", label: "Outrageous", verb: "gasped", weight: 2, color: "#e0664f" },
  { type: "LEGENDARY", label: "Legendary", verb: "saluted", weight: 3, color: "#b77ee0" },
  { type: "RELATABLE", label: "Relatable", verb: "nodded", weight: 1, color: "#3aa596" },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]["type"];

export const REACTION_COUNTER_FIELD = {
  HILARIOUS: "hilariousCount",
  OUTRAGEOUS: "outrageousCount",
  LEGENDARY: "legendaryCount",
  RELATABLE: "relatableCount",
} as const satisfies Record<ReactionKey, string>;

export function reactionWeight(type: ReactionKey): number {
  return REACTIONS.find((r) => r.type === type)?.weight ?? 1;
}
