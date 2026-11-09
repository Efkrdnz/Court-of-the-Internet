import { describe, expect, it } from "vitest";
import { screenFields, screenText, similarity } from "@/lib/content-filter";
import { shareCardStatus } from "@/lib/share-card";
import { levelForXp, levelProgress, wilsonLowerBound, xpForLevel } from "@/lib/progression";
import { casePath, normalizeText, parseCaseParam, slugify } from "@/lib/text";
import { anonymousAlias } from "@/lib/alias";
import { confessionSchema, signupSchema } from "@/lib/validation";
import { decideVerdict, controversyScore } from "@/server/services/verdict";
import { isUnlocked } from "@/lib/cosmetics";

describe("content filter", () => {
  it.each([
    ["email me at hammy@example.com", "personal-info"],
    ["call 555 123 4567 for fries", "personal-info"],
    ["they live at 42 Wallaby Way, Sydney", "personal-info"],
    ["check https://example.com for proof", "link"],
    ["see www.evidence.net", "link"],
    ["it was @realperson who did it", "handle"],
    ["you should kill yourself", "violence"],
    ["i'm going to hurt him", "violence"],
    ["AAAAAAAAAAAAAAAAAAAAAAAA", "spam"],
    ["I ATE ALL OF THE PIZZA AND I REGRET NOTHING AT ALL", "spam"],
    ["I microwaved Supercalifragilisticexpialidociouslyhorrendousfish at work", "spam"],
  ])("flags %j as %s", (text, issue) => {
    expect(screenText(text)).toMatchObject({ ok: false, issue });
  });

  it("flags slurs even with leetspeak", () => {
    expect(screenText("you absolute f4gg0t").ok).toBe(false);
    expect(screenText("you absolute faaaggot").ok).toBe(false);
  });

  it.each([
    "I ate my roommate's pizza and blamed his girlfriend.",
    "I secretly unplugged my friend's controller so I could win.",
    "I told my entire Discord server I was asleep while playing another game.",
    "I spoiled the ending of an anime because my friend called it mid.",
    "I stole one French fry from everyone at the table.",
    "The raccoon in my yard is my accomplice. I killed it at Mario Kart.",
    "I rewatched The Suicide Squad without my partner.",
    "My heroine in the book club was a scoundrel.",
    "I scored 1,000,000 points and lied about it.",
    "This was a long con with a furry accomplice in Niger.",
  ])("allows harmless confession %j", (text) => {
    expect(screenText(text)).toEqual({ ok: true });
  });

  it("measures similarity for duplicate detection", () => {
    const a = "I ate my roommate's pizza and blamed his girlfriend for it";
    expect(similarity(a, a)).toBe(1);
    expect(similarity(a, "I unplugged the controller to win at smash bros tonight")).toBeLessThan(0.2);
  });
});

describe("long-word titles", () => {
  it("rejects a title that is one giant unbroken word", () => {
    expect(screenFields({ title: "Supercalifragilisticexpialidociouslyunbreakablemicrowave" }).ok).toBe(false);
    expect(screenFields({ title: "I stole the office microwave" }).ok).toBe(true);
  });
});

describe("progression math", () => {
  it("maps XP to levels", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(299)).toBe(2);
    expect(levelForXp(300)).toBe(3);
    for (let xp = 0; xp < 20000; xp += 37) {
      const l = levelForXp(xp);
      expect(xpForLevel(l)).toBeLessThanOrEqual(xp);
      expect(xpForLevel(l + 1)).toBeGreaterThan(xp);
    }
    expect(levelProgress(150)).toMatchObject({ level: 2, current: 50, needed: 200, pct: 25 });
  });

  it("ranks win rates with the Wilson lower bound", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
    // A 1-0 rookie should rank below a 40-8 veteran.
    expect(wilsonLowerBound(1, 1)).toBeLessThan(wilsonLowerBound(40, 48));
    expect(wilsonLowerBound(10, 10)).toBeLessThan(1);
  });
});

describe("verdict rules", () => {
  it("decides verdicts with quorum", () => {
    expect(decideVerdict(6, 4, 10)).toBe("GUILTY");
    expect(decideVerdict(4, 6, 10)).toBe("NOT_GUILTY");
    expect(decideVerdict(5, 5, 10)).toBe("MISTRIAL");
    expect(decideVerdict(5, 4, 10)).toBe("BELOW_QUORUM");
    expect(controversyScore(5, 5)).toBe(1);
    expect(controversyScore(10, 0)).toBe(0);
  });
});

describe("text helpers", () => {
  it("normalises abusive whitespace and invisible characters", () => {
    expect(normalizeText("  hello​   world \n\n\n\n bye  ")).toBe("hello world\n\nbye");
    expect(normalizeText("one\ntwo", { multiline: false })).toBe("one two");
  });
  it("builds and parses case URLs", () => {
    expect(slugify("I ate my roommate's pizza!!")).toBe("i-ate-my-roommates-pizza");
    expect(casePath({ number: 42, slug: "fries" })).toBe("/cases/42-fries");
    expect(parseCaseParam("42-fries")).toBe(42);
    expect(parseCaseParam("42")).toBe(42);
    expect(parseCaseParam("fries")).toBeNull();
    expect(parseCaseParam("0")).toBeNull();
  });
  it("derives stable anonymous aliases", () => {
    expect(anonymousAlias("abc").name).toBe(anonymousAlias("abc").name);
    expect(anonymousAlias("abc").name).not.toBe(anonymousAlias("abd").name);
    expect(anonymousAlias("abc").name).toMatch(/^[\w-]+ \w+ #[0-9A-F]{4}$/);
  });
});

describe("validation", () => {
  it("validates confessions", () => {
    const ok = confessionSchema.safeParse({
      title: "  I stole one French fry from everyone  ",
      category: "food-crimes",
      confession: "At dinner I took exactly one fry from every plate while they were looking at the dessert menu.",
      context: "",
      anonymous: "on",
      acceptRules: "on",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.title).toBe("I stole one French fry from everyone");
      expect(ok.data.anonymous).toBe(true);
      expect(ok.data.context).toBeUndefined();
    }
    // Unchecked checkboxes are absent from FormData entirely.
    const noAnon = confessionSchema.safeParse({
      title: "I hid the TV remote in the freezer",
      category: "roommate-disputes",
      confession: "Every time my roommate picks a show I don't like, the remote ends up behind the frozen peas.",
      acceptRules: "on",
    });
    expect(noAnon.success && noAnon.data.anonymous).toBe(false);
    const noRules = confessionSchema.safeParse({ title: "A valid title", category: "food-crimes", confession: "x".repeat(10) + " this is long enough to pass the minimum." });
    expect(noRules.success).toBe(false);
    if (!noRules.success) expect(noRules.error.issues.map((i) => i.message)).toContain("You must accept the community rules.");
    const bad = confessionSchema.safeParse({ title: "x", category: "nope", confession: "short", acceptRules: undefined });
    expect(bad.success).toBe(false);
  });
  it("validates signups", () => {
    expect(
      signupSchema.safeParse({ username: "Hammy_99", displayName: "Hammy", password: "longenough", confirmPassword: "longenough", acceptRules: "on" })
        .success,
    ).toBe(true);
    expect(
      signupSchema.safeParse({ username: "admin", displayName: "x", password: "short", confirmPassword: "nope", acceptRules: "on" }).success,
    ).toBe(false);
  });
});

describe("cosmetic unlocks", () => {
  const ctx = { level: 4, achievements: new Set(["certified-menace"]), entitlements: new Set(["theme:velvet-rope"]), isPatron: false };
  it("evaluates rules", () => {
    expect(isUnlocked("free", ctx)).toBe(true);
    expect(isUnlocked("level:5", ctx)).toBe(false);
    expect(isUnlocked("level:4", ctx)).toBe(true);
    expect(isUnlocked("achievement:certified-menace", ctx)).toBe(true);
    expect(isUnlocked("premium", ctx)).toBe(false);
    expect(isUnlocked("premium", ctx, "theme:velvet-rope")).toBe(true);
  });
});

describe("share card status", () => {
  it("never says the jury is out before the jury stage", () => {
    expect(shareCardStatus("AWAITING_DEFENSE", null).stamp).toBe("NEEDS COUNSEL");
    expect(shareCardStatus("DEFENSE_CLAIMED", null).stamp).toBe("NEEDS COUNSEL");
    expect(shareCardStatus("AWAITING_PROSECUTION", null).stamp).toBe("ON TRIAL");
    expect(shareCardStatus("DELIBERATION", null).stamp).toBe("JURY OUT");
    expect(shareCardStatus("CLOSED", "NOT_GUILTY").stamp).toBe("NOT GUILTY");
  });
});
