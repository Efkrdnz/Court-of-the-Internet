import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Gameplay must be impossible to buy: these modules may never depend on payments or cosmetics. */
const GAMEPLAY = ["cases.ts", "verdict.ts", "maintenance.ts", "reactions.ts", "progress.ts", "stats.ts"].map((f) =>
  path.resolve(__dirname, "../../src/server/services", f),
);

describe("fair play", () => {
  it.each(GAMEPLAY)("%s does not import payments, cosmetics or membership state", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src).not.toMatch(/payments\//);
    expect(src).not.toMatch(/lib\/cosmetics/);
    expect(src).not.toMatch(/membershipTier|entitlement/i);
  });
});
