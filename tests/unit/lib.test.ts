import { describe, expect, it } from "vitest";
import { screenFields, screenText, similarity } from "@/lib/content-filter";
import { shareCardStatus } from "@/lib/share-card";
import { levelForXp, levelProgress, wilsonLowerBound, xpForLevel } from "@/lib/progression";
import { ogDrawable, ogText, ogTextOr } from "@/lib/og-text";
import { casePath, charCount, cleanQuery, normalizeText, parseCaseParam, slugify, truncate } from "@/lib/text";
import { anonymousAlias } from "@/lib/alias";
import { confessionSchema, signupSchema, usernameSchema } from "@/lib/validation";
import { randomAvatar } from "@/lib/avatar";
import { safeNext } from "@/lib/safe-next";
import { decideVerdict, controversyScore } from "@/server/services/verdict";
import { isUnlocked, LOCKED_AVATAR_ITEMS } from "@/lib/cosmetics";

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
    // Titles need words (audit 42 D4); any script counts.
    const base = { category: "food-crimes", confession: "At dinner I took exactly one fry from every plate.", acceptRules: "on" };
    const emojiTitle = confessionSchema.safeParse({ ...base, title: "\u{1F600}".repeat(90) });
    expect(emojiTitle.success).toBe(false);
    if (!emojiTitle.success) expect(emojiTitle.error.issues[0].message).toContain("title in words");
    expect(confessionSchema.safeParse({ ...base, title: "\u{1F1EC}\u{1F1E7} \u{1F468}\u200D\u{1F469}\u200D\u{1F467} !!!" }).success).toBe(false);
    expect(confessionSchema.safeParse({ ...base, title: "我吃了室友的披萨" }).success).toBe(true);
    expect(confessionSchema.safeParse({ ...base, title: "I ate it \u{1F355}" }).success).toBe(true);
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

describe("audit 6 regressions", () => {
  it("reserves the deleted-account username prefix", () => {
    expect(usernameSchema.safeParse("deleted_abc12345").success).toBe(false);
    expect(usernameSchema.safeParse("deleted").success).toBe(false);
    expect(usernameSchema.safeParse("undeleted_fan").success).toBe(true);
  });
  it("never hands out a locked item as a starter avatar", () => {
    for (let seed = 0; seed < 2000; seed++) {
      const a = randomAvatar(seed);
      for (const item of LOCKED_AVATAR_ITEMS) expect(a[item.kind as keyof typeof a]).not.toBe(item.value);
    }
  });
});

describe("post-login redirect (audit 10 #1)", () => {
  it("allows same-origin paths only", () => {
    expect(safeNext("/cases/12-x?filed=1#top")).toBe("/cases/12-x?filed=1#top");
    expect(safeNext("/jury")).toBe("/jury");
    for (const bad of ["//example.com", "/\\example.com", "/\texample.com", "/\t/example.com", "/\n/example.com", "https://example.com", "example.com", "", null, 42, "/%5Cexample.com".replace("%5C", "\\"), "/..//evil.example/phish", "/./..//evil.example", "/a/../..//evil.example"]) {
      expect(safeNext(bad), String(bad)).toBe("/court");
    }
  });
});

describe("threat screening (audit 11 #4)", () => {
  it("rejects stated intent to harm a person", () => {
    for (const t of [
      "I want to kill my neighbour because his dog keeps barking all night long",
      "I'm planning to poison my roommate's coffee this weekend for real",
      "I would stab him if he touches my leftovers again, honestly",
    ]) expect(screenText(t).ok, t).toBe(false);
  });
  it("keeps everyday hyperbole", () => {
    for (const t of [
      "I needed to kill time so I alphabetised the whole spice rack by vibes",
      "My mom will kill me when she finds out I ate the last slice of cake",
      "I could kill for a nap after that meeting, so I napped in the supply closet",
      "This group chat is killing me, so I muted it for a week and said nothing",
    ]) expect(screenText(t).ok, t).toBe(true);
  });
});

describe("display names (audit 11 #3)", () => {
  it("rejects Latin mixed with look-alike Cyrillic or Greek letters, but allows single-script names", () => {
    const base = { username: "valid_name", password: "objection-sustained", confirmPassword: "objection-sustained", acceptRules: "on" };
    expect(signupSchema.safeParse({ ...base, displayName: "Judge W\u0456gsworth" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, displayName: "Иван Петров" }).success).toBe(true);
    expect(signupSchema.safeParse({ ...base, displayName: "Judge Mental" }).success).toBe(true);
  });
});

describe("filter evasion with invisible or look-alike characters (audit 12 D1)", () => {
  it.each([
    ["email me at petty.thief­@gmail­.com", "personal-info"],
    ["call 555­123­4567 for fries", "personal-info"],
    ["call ５５５１２３４５６７ for fries", "personal-info"],
    ["you absolute fag­got", "hate"],
    ["you absolute fаggot", "hate"], // Cyrillic а
  ])("flags %j as %s", (text, issue) => {
    expect(screenText(text)).toMatchObject({ ok: false, issue });
  });
  it("strips invisible characters before storage", () => {
    expect(normalizeText("soft­hyphen and zero​width")).toBe("softhyphen and zerowidth");
    // Emoji joined with ZWJ survive; a stray joiner inside a word does not (audit 18 #6).
    expect(normalizeText("family \u{1F469}\u200D\u{1F469}\u200D\u{1F467} night")).toBe("family \u{1F469}\u200D\u{1F469}\u200D\u{1F467} night");
    expect(normalizeText("jo\u200Diner")).toBe("joiner");
  });
  it("still accepts ordinary non-Latin text", () => {
    expect(screenText("Я съел пиццу соседа по комнате и свалил всё на кота.").ok).toBe(true);
  });
});

describe("personal-info / link / handle evasions (audit 13 #1)", () => {
  it.each([
    ["Text me at 555/867/5309 for the full story", "personal-info"],
    ["call 555_867_5309 tonight", "personal-info"],
    ["call ٥٥٥٨٦٧٥٣٠٩ tonight", "personal-info"],
    ["they live at 42 wallaby way", "personal-info"],
    ["all the receipts are on petty-crimes.de", "link"],
    ["mirror at crimes.ru if it goes down", "link"],
    ["h t t p s : / / evidence dot com", "link"],
    ["insta:@sneaky_steve_42 has the video", "handle"],
    ["ask him,@sneaky_steve_42", "handle"],
  ])("flags %j as %s", (text, issue) => {
    expect(screenText(text)).toMatchObject({ ok: false, issue });
  });
  it.each([
    "I ate 3 slices on the way home and blamed the delivery driver",
    "I walked 2 blocks down the road to avoid saying hi to my neighbour",
    "The score was 3-2 and I told everyone it was 4-1 in my favour",
    "I said I'd be there at 7.30 but arrived at 8.15 with no excuse",
    "e.g. the time I hid the remote, i.e. every single weekend",
    "I left a 5 star review for my own lemonade stand under a fake name",
  ])("still accepts %j", (text) => {
    expect(screenText(text).ok).toBe(true);
  });
});

describe("spelled-out evasions (audit 14 #3)", () => {
  it.each([
    ["write to bob [at] example [dot] com", "personal-info"],
    ["write to bob (at) example dot com", "personal-info"],
    ["call five five five eight six seven five three oh nine", "personal-info"],
    ["find him on insta as john_smith_1990", "handle"],
    ["his tiktok is sneaky.steve42 if you want proof", "handle"],
  ])("flags %j as %s", (text, issue) => {
    expect(screenText(text)).toMatchObject({ ok: false, issue });
  });
  it("flags slurs spelled with spaced-out letters", () => {
    expect(screenText("you are such a f a g g o t honestly").ok).toBe(false);
  });
  it.each([
    "I looked at it and laughed so hard I had to sit down",
    "I deleted instagram as a protest and then reinstalled it an hour later",
    "I spent 3 hours on tiktok instead of doing the dishes",
    "I ate one two three slices before anyone noticed",
    "I wrote U S A on the cake in ketchup at the party",
  ])("still accepts %j", (text) => {
    expect(screenText(text).ok).toBe(true);
  });
});

describe("serious harm (audit 15 #3)", () => {
  it.each([
    "I poisoned the office coffee machine with bleach and two people went to hospital",
    "I sold cocaine to kids behind the school",
    "I stabbed my coworker with a kitchen knife",
    "I shot my roommate during an argument",
    "I killed my neighbour last night",
  ])("rejects %j", (text) => {
    expect(screenText(text).ok, text).toBe(false);
  });
  it.each([
    "I killed it at karaoke and refused to give anyone else the microphone",
    "I shot a video of my cat and pretended it was a nature documentary",
    "I stabbed the pizza box to let the steam out and called it ventilation",
    "I sold my brother's old comics and bought snacks with the money",
    "I put salt in the sugar bowl at the office coffee machine",
  ])("still accepts %j", (text) => {
    expect(screenText(text).ok, text).toBe(true);
  });
  it("catches a spaced-out email address", () => {
    expect(screenText("my email is j o h n @ g m a i l . c o m if you want it").ok).toBe(false);
  });
});

describe("zalgo and combining marks (audit 16 #1)", () => {
  it("counts what readers see and caps stacked marks", () => {
    const zalgoE = "e" + "́".repeat(15);
    expect(charCount(normalizeText(zalgoE))).toBeLessThanOrEqual(2);
    expect(normalizeText(zalgoE).length).toBeLessThanOrEqual(3);
    const r = confessionSchema.safeParse({ category: "food-crimes", title: "Pen" + "́".repeat(28), confession: "I ate my roommate's pizza and blamed his girlfriend for it.", acceptRules: "on" });
    expect(r.success).toBe(false);
    expect(charCount("café")).toBe(4);
  });
});

describe("filter precision (audit 16 #3)", () => {
  it.each([
    "I binge watched the whole 2019-2020 season in one weekend and called in sick",
    "I scored 12345678 points and told everyone the leaderboard was broken",
    "I took 1 2 3 4 5 6 7 8 steps backwards out of the meeting and nobody noticed",
  ])("accepts %j", (text) => {
    expect(screenText(text).ok, text).toBe(true);
  });
  it.each([
    ["i want to k1ll my neighbour", "violence"],
    ["visit court-of-pettiness dot com for the receipts", "link"],
  ])("flags %j as %s", (text, issue) => {
    expect(screenText(text)).toMatchObject({ ok: false, issue });
  });
});

describe("serious crime and spelled addresses (audit 17 #3)", () => {
  it.each([
    "I stole a car outside the mall and sold it for parts",
    "I robbed a bank with a water pistol",
    "I committed arson for the insurance money",
    "I burned down the shed behind my ex's house",
    "I hit my girlfriend during an argument",
    "I drove home drunk after the office party",
    "I sold weed to teenagers behind the gym",
    "my address is seven forty two evergreen terrace springfield",
  ])("rejects %j", (text) => {
    expect(screenText(text).ok, text).toBe(false);
  });
  it.each([
    "I hit my brother with a pillow during movie night and blamed the dog",
    "I stole my sister's car keys and hid them in the freezer",
    "I set the toaster on fire making a bagel and blamed the toaster",
    "I walked two blocks down the road to avoid my neighbour",
    "I drove home singing loudly with the windows down",
  ])("still accepts %j", (text) => {
    expect(screenText(text).ok, text).toBe(true);
  });
});

describe("display names mixing alphabets (audit 17 #4)", () => {
  it("rejects Latin mixed with any other script", () => {
    const base = { username: "valid_name", password: "objection-sustained", confirmPassword: "objection-sustained", acceptRules: "on" };
    expect(signupSchema.safeParse({ ...base, displayName: "J\u057Ddge Wigsworth" }).success).toBe(false); // Armenian ս
    expect(signupSchema.safeParse({ ...base, displayName: "\u13DFlerk Pemberton" }).success).toBe(false); // Cherokee Ꮯ
    expect(signupSchema.safeParse({ ...base, displayName: "山田 太郎" }).success).toBe(true);
  });
});

describe("threat and evasion regressions (audit 18 #2)", () => {
  it.each([
    ["I'm gonna kill my roommate", "violence"],
    ["Im gonna kill my roommate", "violence"],
    ["gonna kill my roommate", "violence"],
    ["i will k i l l my neighbour", "violence"],
    ["the proof is on evil[.]com", "link"],
    ["the proof is on evil.c0m", "link"],
    ["call 555-123-45six7 tonight", "personal-info"],
    ["they live at forty two Wallaby Way", "personal-info"],
    ["find me on ig: coolguy", "handle"],
  ])("flags %j as %s", (text, issue) => {
    expect(screenText(text)).toMatchObject({ ok: false, issue });
  });
  it.each([
    "I'm gonna be late again so I blamed the bus",
    "My roommate is gonna kill me when she sees the kitchen",
    "I told everyone I was going to the gym and went to the bakery",
  ])("still accepts %j", (text) => {
    expect(screenText(text).ok, text).toBe(true);
  });
});

describe("emoji joiner chains (audit 19 #1)", () => {
  it("can't pad past a maximum length", () => {
    const chain = "\u{1F468}" + "\u200D\u{1F468}".repeat(400);
    expect(charCount(chain)).toBeGreaterThan(300);
    const base = { username: "valid_name", password: "objection-sustained", confirmPassword: "objection-sustained", acceptRules: "on" };
    expect(signupSchema.safeParse({ ...base, displayName: "Bob " + chain }).success).toBe(false);
    expect(charCount("\u{1F469}\u200D\u{1F469}\u200D\u{1F467}")).toBeLessThanOrEqual(3); // a real family emoji is still short
  });
});

describe("share-image text (audit 42 D1)", () => {
  it("keeps what the bundled fonts draw, folds accents and drops emoji", () => {
    expect(ogText("Crème brûlée at the café")).toEqual({ text: "Crème brûlée at the café", lostLetters: false });
    expect(ogText("Snack Fan \u{1F355}")).toEqual({ text: "Snack Fan", lostLetters: false });
    expect(ogText("ā ē ī Ａ ﬁx")).toEqual({ text: "a e i A fix", lostLetters: false });
    expect(ogText("\u{1F600}".repeat(90)).text).toBe("");
    expect(ogText("I love Москва").lostLetters).toBe(true);
    expect(ogTextOr("我吃了披萨", "Case No. 0001")).toBe("Case No. 0001");
    expect(ogTextOr("\u{1F600}\u{1F600}", "the accused")).toBe("the accused");
    expect(ogTextOr("Pizza \u{1F355} thief", "x")).toBe("Pizza thief");
    for (const ch of ogText("“Quotes” — dashes… £5 €5 ½ × ÷ ™").text) expect(ogDrawable(ch.codePointAt(0)!)).toBe(true);
  });
});

describe("truncate (audit 41 D2)", () => {
  it("never cuts an emoji or grapheme in half", () => {
    const pray = "\u{1F64F}";
    const cut = truncate("x".repeat(199) + pray + " thanks", 200);
    expect(cut).toBe("x".repeat(199));
    expect(truncate(pray.repeat(200), 300)).toBe(pray.repeat(150));
    expect(truncate("x".repeat(298) + pray + "y", 300, "…")).toBe("x".repeat(298) + "…");
    const family = "\u{1F469}\u200D\u{1F469}\u200D\u{1F467}";
    expect(truncate("ab" + family, 5)).toBe("ab");
    expect(truncate("short", 300)).toBe("short");
    expect(cleanQuery("q".repeat(79) + pray)).toBe("q".repeat(79));
    // One giant joiner chain still gives whole code points.
    const chain = "\u{1F468}" + "\u200D\u{1F468}".repeat(400);
    expect(truncate(chain, 10)).not.toMatch(/[\uD800-\uDBFF]$/);
    expect(truncate(chain, 10).length).toBeGreaterThan(0);
  });
});

describe("harm phrasing (audit 19 #4)", () => {
  it.each([
    "I will end my neighbour if he mows at 7am again",
    "I'm gonna unalive my flatmate for eating my leftovers",
    "I sold some weed to the high schoolers next door",
    "I put laxatives in my coworker's coffee",
    "I spiked the punch at the office party with vodka",
    "I set my roommate's mattress on fire",
    "I keyed my ex's car in the parking lot",
  ])("rejects %j", (text) => {
    expect(screenText(text).ok, text).toBe(false);
  });
  it.each([
    "I will end my streak of honesty today and blame the cat",
    "I set my alarm on fire mode and slept through it anyway",
    "I spiked my hair with way too much gel for the interview",
    "I put extra sugar in my coworker's coffee every morning",
  ])("still accepts %j", (text) => {
    expect(screenText(text).ok, text).toBe(true);
  });
});

describe("more evasions (audit 20 #1, #5)", () => {
  it.each([
    ["Complaints to 555,123,4567 or nowhere", "personal-info"],
    ["call 07700,900,123 tonight", "personal-info"],
    ["Complaints to pettycrimes.ninja please", "link"],
    ["see pettycrimes。com", "link"],
    ["see pettycrimes . com", "link"],
    ["you are such a fa ggot", "hate"],
    ["I put Ex-Lax in his coffee", "serious-crime"],
  ])("flags %j as %s", (text, issue) => {
    expect(screenText(text)).toMatchObject({ ok: false, issue });
  });
  it("explains the long-word rule accurately", () => {
    const r = screenFields({ title: "I said Pneumonoultramicroscopicsilicovolcanoconiosis wrong" });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/longer than 35 characters/);
  });
  it.each(["I said the scores were 3, 4, 5 and 6 out of 10", "the end. Then I left early"])("still accepts %j", (text) => {
    expect(screenText(text).ok, text).toBe(true);
  });
});

describe("addresses that are links (audit 21 #8)", () => {
  it.each(["the receipts are at 203.0.113.42 if you want them", "see pettycrimes.example for the full story"])("flags %j", (text) => {
    expect(screenText(text).ok).toBe(false); // as a link (or, for the IP, as a phone-like number)
  });
  it("still accepts version numbers and scores", () => {
    expect(screenText("I installed version 2.0 of the office coffee machine firmware without asking").ok).toBe(true);
  });
});

describe("audit 22 filter gaps", () => {
  it.each([
    ["come to 221B Baker Street at noon", "personal-info"],
    ["the receipts are at e v i l . c o m", "link"],
    ["follow @ pettyking on twitter for updates", "handle"],
    ["I hacked my ex's email account", "serious-crime"],
  ])("flags %j as %s", (text, issue) => {
    expect(screenText(text)).toMatchObject({ ok: false, issue });
  });
  it.each(["meet me @ noon at the vending machine", "I hacked together a costume from cereal boxes"])("still accepts %j", (text) => {
    expect(screenText(text).ok, text).toBe(true);
  });
  it("rejects display names that look like anonymous aliases", () => {
    const base = { username: "valid_name", password: "objection-sustained", confirmPassword: "objection-sustained", acceptRules: "on" };
    expect(signupSchema.safeParse({ ...base, displayName: "Sweaty Walrus #D89B" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, displayName: "Agent 47" }).success).toBe(true);
  });
});

describe("alias and title impersonation (audit 23 #1)", () => {
  it.each(["Sweaty Walrus ＃D89B", "Sweaty Walrus #D89B.", "Presiding Judge", "court clerk"])("rejects %j", (displayName) => {
    const base = { username: "valid_name", password: "objection-sustained", confirmPassword: "objection-sustained", acceptRules: "on" };
    expect(signupSchema.safeParse({ ...base, displayName }).success).toBe(false);
  });
  it.each(["Judge Mental", "Clerk Kent", "#1 Fan"])("accepts %j", (displayName) => {
    const base = { username: "valid_name", password: "objection-sustained", confirmPassword: "objection-sustained", acceptRules: "on" };
    expect(signupSchema.safeParse({ ...base, displayName }).success).toBe(true);
  });
});

describe("alias look-alikes and titles (audit 24 #2)", () => {
  const base = { username: "valid_name", password: "objection-sustained", confirmPassword: "objection-sustained", acceptRules: "on" };
  it.each(["Shifty Pigeon ♯06EF", "Shifty Pigeon ⋕06EF", "Mod", "Presiding Judge Owl", "The Judge", "Your Honour", "Officer of the Court"])("rejects %j", (displayName) => {
    expect(signupSchema.safeParse({ ...base, displayName }).success).toBe(false);
  });
  it.each(["Agent 47", "Modest Mouse", "Room 101", "Judge Mental"])("accepts %j", (displayName) => {
    expect(signupSchema.safeParse({ ...base, displayName }).success).toBe(true);
  });
});

describe("plurals, emoji separators and letter-digit phones (audit 25 D1, D2)", () => {
  it.each([
    ["you are all faggots", "hate"],
    ["those f4gg0ts again", "hate"],
    ["you fаggots", "hate"], // Cyrillic а
    ["what a f🍕a🍕g🍕g🍕o🍕t", "hate"],
    ["call me on O77OO 9OO 123", "personal-info"],
    ["visit e v i l . c o m to see", "link"],
  ])("flags %j as %s", (text, issue) => {
    expect(screenText(text)).toMatchObject({ ok: false, issue });
  });
  it.each([
    "I ate all the cookies and blamed my brothers again",
    "I hid 5 Oreos in the office plant pot",
    "I said I O U to my roommate 100 times",
    "my boss classes are on Mondays",
  ])("still accepts %j", (text) => {
    expect(screenText(text).ok, text).toBe(true);
  });
});

describe("full-width display names (audit 25 D5)", () => {
  it("folds full-width letters and spaces to ordinary ones", () => {
    const base = { username: "valid_name", password: "objection-sustained", confirmPassword: "objection-sustained", acceptRules: "on" };
    const parsed = signupSchema.safeParse({ ...base, displayName: "Ｗｉｄｅ　Ｆｕｌｌｗｉｄｔｈ　Ｐｒｏｓｅｃｕｔｏｒ" });
    expect(parsed.success && parsed.data.displayName).toBe("Wide Fullwidth Prosecutor");
    expect(signupSchema.safeParse({ ...base, displayName: "Ｐｒｅｓｉｄｉｎｇ Ｊｕｄｇｅ" }).success).toBe(false);
  });
});

describe("small capitals, keycaps, odd separators and long words (audit 26 #2, #3)", () => {
  it.each([
    ["you ꜰᴀɢɢᴏᴛ", "hate"],
    ["you fa66ot", "hate"],
    ["call 555|123|4567 for legal advice", "personal-info"],
    ["call 555:123:4567", "personal-info"],
    ["call 555🍕123🍕4567", "personal-info"],
    ["call 5️⃣5️⃣5️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣", "personal-info"],
  ])("flags %j as %s", (text, issue) => {
    expect(screenText(text)).toMatchObject({ ok: false, issue });
  });
  it.each(["I hid 6 donuts in the 6th floor fridge", "Final score 3|2 after 90 minutes", "I ate 2🍕 and 3🍔 at the 1 o'clock meeting"])("still accepts %j", (text) => {
    expect(screenText(text).ok, text).toBe(true);
  });
  it("gives arguments the specific long-word message", () => {
    const result = screenText("My client suffers from hippopotomonstrosesquippedaliophobic tendencies.");
    expect(result).toMatchObject({ ok: false, issue: "spam" });
    expect(!result.ok && result.message).toMatch(/longer than 35 characters/);
  });
});

describe("crafted action calls (audit 26 #5)", () => {
  it("refuses a call without a form body with a validation error, not a TypeError", async () => {
    const { assertForm } = await import("@/app/actions/_util");
    for (const bad of [undefined, null, "x", {}, []]) expect(() => assertForm(bad)).toThrow(expect.objectContaining({ code: "VALIDATION" }));
    expect(() => assertForm(new FormData())).not.toThrow();
  });
});

describe("alias look-alikes without a hash (audit 26 #8)", () => {
  const base = { username: "valid_name", password: "objection-sustained", confirmPassword: "objection-sustained", acceptRules: "on" };
  it.each(["Sneaky Pigeon D577", "Sweaty Walrus d89b", "Shifty Goose - 06EF"])("rejects %j", (displayName) => {
    expect(signupSchema.safeParse({ ...base, displayName }).success).toBe(false);
  });
  it.each(["Big Tony 2024", "Pigeon Fan 1999", "Agent 47", "Goose Lover"])("accepts %j", (displayName) => {
    expect(signupSchema.safeParse({ ...base, displayName }).success).toBe(true);
  });
});

describe("inflections, dot stand-ins, street abbreviations, rare look-alikes (audit 27 #2)", () => {
  it.each([
    ["the most retarded intern", "hate"],
    ["visit pettyking·com for receipts", "link"],
    ["visit pettyking, com for receipts", "link"],
    ["visit pettyking dot c o m for receipts", "link"],
    ["visit pettyking .co for receipts", "link"],
    ["I live at 42 wallaby st", "personal-info"],
    ["meet me at 9 maple ave tonight", "personal-info"],
    ["just k y s already", "violence"],
    ["you ǝvil fagɡot", "hate"],
    ["🇫🇦🇬🇬🇴🇹", "hate"],
  ])("flags %j as %s", (text, issue) => {
    expect(screenText(text)).toMatchObject({ ok: false, issue });
  });
  it.each([
    "I went w/ co-workers to the comedy club",
    "My grades were A B C and I hid the report",
    "I stole 2 slices on the way home",
    "We cheered for 🇫🇷 and 🇮🇹 in the final",
    "My boss, Tom, came in late",
    "I invited Smith, Jones and co. to my party",
    "I hid the spices from my roommate",
    "I spiced up the chili and blamed the intern",
    "the chinking of glasses woke the office",
  ])("still accepts %j", (text) => {
    expect(screenText(text).ok, text).toBe(true);
  });
});

describe("crafted values get human messages (audit 27 #6)", () => {
  it("replaces Zod's built-in wording", async () => {
    const { fieldErrors, reportSchema } = await import("@/lib/validation");
    const parsed = reportSchema.safeParse({ caseId: "x", target: "NOPE", reason: 42 });
    expect(parsed.success).toBe(false);
    const messages = Object.values(fieldErrors(parsed.error!)).flat();
    expect(messages.length).toBeGreaterThan(0);
    for (const m of messages) expect(m).not.toMatch(/expected|Invalid option|Too big/);
  });
});

describe("everyday confessions vs evasions corpus (audit 28 #1, #2)", async () => {
  const { BENIGN, EVASIONS } = await import("./filter-corpus");
  it.each(BENIGN)("accepts %j", (text) => {
    const result = screenText(text);
    expect(result.ok, `${text} → ${result.ok ? "" : result.issue}`).toBe(true);
  });
  it.each(EVASIONS)("flags %j as %s", (text, issue) => {
    expect(screenText(text)).toMatchObject({ ok: false, issue });
  });
});

describe("stacked accents on precomposed letters (audit 29 #6)", () => {
  it("caps marks on the decomposed form and keeps real two-mark letters", () => {
    expect(normalizeText("á́́́").normalize("NFD")).toBe("á́");
    expect(normalizeText("Nguyễn Thị Ệ")).toBe("Nguyễn Thị Ệ");
    expect(normalizeText("한국어 café")).toBe("한국어 café");
  });
});

describe("symbol-only display names (audit 30 D6)", () => {
  it("needs at least one letter or number", () => {
    const base = { username: "valid_name", password: "objection-sustained", confirmPassword: "objection-sustained", acceptRules: "on" };
    expect(signupSchema.safeParse({ ...base, displayName: "@".repeat(32) }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, displayName: "★ Nova ★" }).success).toBe(true);
  });
});

describe("emoji-only text, stray marks and alias names (audit 35 notes)", () => {
  const base = { username: "valid_name", password: "objection-sustained", confirmPassword: "objection-sustained", acceptRules: "on" };
  it("refuses an emoji-only confession and long runs of one emoji", () => {
    const flags = "🏳️‍🌈".repeat(40);
    expect(confessionSchema.safeParse({ title: "A very proud confession", category: "petty-theft", confession: flags }).success).toBe(false);
    expect(screenText(`I did it ${"🏳️‍🌈".repeat(30)}`)).toMatchObject({ ok: false, issue: "spam" });
  });
  it("drops combining marks with nothing to sit on", () => {
    expect(normalizeText("́́Title with stray marks")).toBe("Title with stray marks");
    expect(normalizeText("café")).toBe("café");
  });
  it("refuses an alias's two words as a display name, once", () => {
    const parsed = signupSchema.safeParse({ ...base, displayName: "Mysterious Walrus" });
    expect(parsed.success).toBe(false);
    const hashed = signupSchema.safeParse({ ...base, displayName: "Sweaty Walrus #D89B" });
    const messages = hashed.success ? [] : hashed.error.issues.filter((i) => i.path[0] === "displayName").map((i) => i.message);
    expect(new Set(messages).size).toBeGreaterThan(0);
    expect(signupSchema.safeParse({ ...base, displayName: "Walrus Enthusiast" }).success).toBe(true);
  });
});
