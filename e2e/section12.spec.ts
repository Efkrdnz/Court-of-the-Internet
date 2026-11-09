/**
 * Explicit verification of GOAL.md §12 ("Final Quality Requirements") against the
 * production build. Each test is named after the requirement it proves.
 */
import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { demoPage } from "./helpers";
import { ACHIEVEMENTS } from "../src/lib/achievements";

const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://court:court@localhost:5432/court_e2e?schema=public";
const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });
test.afterAll(() => prisma.$disconnect());

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

test("§12 the application starts successfully (production server)", async ({ page, request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Justice for the");
  expect(errors).toEqual([]);
});

test("§12 users cannot vote multiple times (stale second tab is rejected)", async ({ browser }) => {
  // An open deliberation the juror hasn't voted on yet.
  const juror = await prisma.user.findUniqueOrThrow({ where: { username: "fresh_intern" } });
  const target = await prisma.case.findFirstOrThrow({
    where: {
      status: "DELIBERATION",
      deliberationEndsAt: { gt: new Date() },
      votes: { none: { userId: juror.id } },
      NOT: [{ accusedId: juror.id }, { attorneyId: juror.id }, { prosecutorId: juror.id }],
    },
    select: { id: true, number: true, slug: true },
  });
  const before = await prisma.vote.count({ where: { caseId: target.id } });

  const tabA = await demoPage(browser, "fresh_intern");
  const tabB = await tabA.context().newPage();
  await tabA.goto(`/cases/${target.number}-${target.slug}`);
  await tabB.goto(`/cases/${target.number}-${target.slug}`);

  await tabA.getByRole("button", { name: /^GUILTY/ }).click();
  await tabA.getByRole("button", { name: "Seal my vote" }).click();
  await expect(tabA.getByText("Your vote is sealed.")).toBeVisible();

  // Tab B still shows the voting booth; try to vote again from it.
  await tabB.getByRole("button", { name: /^NOT GUILTY/ }).click();
  await tabB.getByRole("button", { name: "Seal my vote" }).click();
  await expect(tabB.getByText(/You've already voted on this case/)).toBeVisible();
  // …and the stale tab refreshes into the sealed state instead of offering the buttons again.
  await expect(tabB.getByText("Your vote is sealed.")).toBeVisible();
  await expect(tabB.getByRole("button", { name: /^NOT GUILTY/ })).toHaveCount(0);

  expect(await prisma.vote.count({ where: { caseId: target.id } })).toBe(before + 1);
  expect(await prisma.vote.count({ where: { caseId: target.id, userId: juror.id } })).toBe(1);
});

test("§12 archives display real persisted data", async ({ page }) => {
  const total = await prisma.case.count({ where: { status: "CLOSED", moderationState: "VISIBLE" } });
  const newest = await prisma.case.findFirstOrThrow({
    where: { status: "CLOSED", moderationState: "VISIBLE" },
    orderBy: { closedAt: "desc" },
    select: { title: true, guiltyVotes: true, notGuiltyVotes: true, number: true },
  });
  const guilty = await prisma.case.count({ where: { status: "CLOSED", moderationState: "VISIBLE", verdict: "GUILTY" } });

  await page.goto("/archives");
  await expect(page.getByText(`${total} ${total === 1 ? "case" : "cases"} found`)).toBeVisible();
  const notGuilty = await prisma.case.count({ where: { status: "CLOSED", moderationState: "VISIBLE", verdict: "NOT_GUILTY" } });
  // Conviction rate = guilty / (guilty + not guilty); mistrials and dismissals are neither (audit #6).
  await expect(page.getByText(`${total} cases closed · ${Math.round((guilty / (guilty + notGuilty)) * 100)}% conviction rate (guilty vs. not guilty)`)).toBeVisible();
  // Skip the featured-case card (ring-2) at the top; the grid is ordered by most recent verdict.
  const firstCard = page.locator("article.folder:not(.ring-2)").first();
  await expect(firstCard).toContainText(newest.title);
  await expect(firstCard).toContainText(`${newest.guiltyVotes}–${newest.notGuiltyVotes}`);

  // Search by case number hits the database.
  await page.goto(`/archives?q=${newest.number}`);
  await expect(page.getByRole("link", { name: newest.title })).toBeVisible();
});

test("§12 navigation is functional (every header link, signed in)", async ({ browser }) => {
  const page = await demoPage(browser, "juror_whiskers");
  const errors = watchErrors(page);
  const expected: [string, RegExp, RegExp][] = [
    ["Courtroom", /\/court$/, /Good day/],
    ["Confess", /\/confess$/, /Confess a crime/],
    ["Defend", /\/defend$/, /Become an attorney/],
    ["Prosecute", /\/prosecute$/, /Become a prosecutor/],
    ["Jury Duty", /\/jury(\?case=\d+)?$/, /Jury duty/],
    ["Archives", /\/archives$/, /Public archives/],
    ["Leaderboards", /\/leaderboards$/, /The leaderboards/],
  ];
  await page.goto("/");
  for (const [label, url, heading] of expected) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
  }
  // User menu links.
  for (const [label, url] of [
    ["My profile", /\/u\/juror_whiskers$/],
    ["Settings", /\/settings$/],
    ["Notifications", /\/notifications$/],
  ] as const) {
    await page.getByRole("button", { name: /Account menu/ }).click();
    await page.getByRole("menuitem", { name: label }).click();
    await expect(page).toHaveURL(url);
  }
  // Footer, logo, case cards.
  await page.getByRole("link", { name: "Community rules" }).first().click();
  await expect(page).toHaveURL(/\/rules$/);
  await page.getByRole("link", { name: "Court of the Internet: home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.locator("article.folder h3 a").first().click();
  await expect(page).toHaveURL(/\/cases\/\d+-/);
  expect(errors).toEqual([]);
});

test("§12 visual assets render correctly", async ({ page, request }) => {
  const errors = watchErrors(page);
  for (const path of ["/", "/cases/1", "/archives", "/leaderboards", "/u/counselor_coo", "/jury"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // Every illustration is a real, non-empty, visible SVG drawing.
    const art = await page.locator('svg[role="img"]').evaluateAll((svgs) =>
      svgs.map((s) => {
        const r = s.getBoundingClientRect();
        return { label: s.getAttribute("aria-label"), w: r.width, h: r.height, shapes: s.querySelectorAll("path,circle,ellipse,rect,polygon").length };
      }),
    );
    expect(art.length, `${path} has illustrations`).toBeGreaterThan(3);
    for (const a of art) {
      expect(a.label, `${path} svg has a label`).toBeTruthy();
      expect(a.shapes, `${path} "${a.label}" has drawing content`).toBeGreaterThan(0);
    }
    expect(art.filter((a) => a.w > 0 && a.h > 0).length, `${path} illustrations are laid out`).toBeGreaterThan(3);
    // Self-hosted fonts loaded.
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return ["700 16px 'Playfair Display'", "16px 'Special Elite'", "700 16px 'Bricolage Grotesque'", "700 16px UnifrakturCook"].map((f) => document.fonts.check(f));
    });
    expect(fonts, `${path} fonts`).toEqual([true, true, true, true]);
  }
  // Share card / OG images are valid PNGs.
  for (const url of ["/opengraph-image", "/cases/1-x/opengraph-image", "/cases/27-x/opengraph-image"]) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    const body = await res.body();
    expect(body.subarray(1, 4).toString(), url).toBe("PNG");
    expect(body.length, url).toBeGreaterThan(20_000);
  }
  expect(errors).toEqual([]);
});

test.describe("§12 animations work without breaking interactions", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" }, permissions: ["clipboard-read", "clipboard-write"] });

  test("verdict reveal plays, then everything stays clickable", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/cases/1");
    await page.waitForURL(/\/cases\/1-/);
    // Fresh session: the reveal auto-plays: placeholder first, then the stamp lands.
    await expect(page.getByText("The court will now come to order…")).toBeVisible();
    await expect(page.getByRole("img", { name: /GUILTY/i }).first()).toBeVisible({ timeout: 5000 });
    // CSS idle animations are running on the characters.
    const animated = await page.locator(".chr-blink, .chr-bob, .chr-gavel-arm").evaluateAll((els) =>
      els.filter((e) => getComputedStyle(e).animationName !== "none").length,
    );
    expect(animated).toBeGreaterThan(0);
    // Replay works and the page stays interactive during it.
    await page.getByRole("button", { name: "Replay the verdict" }).click();
    await page.getByRole("button", { name: /Copy link/ }).click();
    await expect(page.getByRole("button", { name: /Link copied!/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("vote booth transition and reaction bump don't block input", async ({ browser }) => {
    const page = await demoPage(browser, "judge_wigsworth");
    const errors = watchErrors(page);
    const juror = await prisma.user.findUniqueOrThrow({ where: { username: "judge_wigsworth" } });
    const target = await prisma.case.findFirstOrThrow({
      where: {
        status: "DELIBERATION",
        deliberationEndsAt: { gt: new Date() },
        votes: { none: { userId: juror.id } },
        NOT: [{ accusedId: juror.id }, { attorneyId: juror.id }, { prosecutorId: juror.id }],
      },
      select: { number: true, slug: true },
    });
    await page.goto(`/jury?case=${target.number}`);
    await page.getByRole("button", { name: /^NOT GUILTY/ }).click();
    // The confirmation panel animates open; its buttons are immediately usable.
    await page.getByRole("button", { name: "Reconsider" }).click();
    await expect(page.getByRole("button", { name: "Seal my vote" })).toHaveCount(0);
    await page.getByRole("button", { name: /^NOT GUILTY/ }).click();
    await page.getByRole("button", { name: "Seal my vote" }).click();
    await expect(page.getByText("Your vote is sealed.")).toBeVisible();
    await expect(page.getByRole("group", { name: /^Tally:/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Next case on the docket →" })).toBeVisible();
    // Reactions live on the case page.
    await page.goto(`/cases/${target.number}-${target.slug}`);
    const legendary = page.getByRole("button", { name: /Legendary/ });
    const pressed = await legendary.getAttribute("aria-pressed");
    await legendary.click();
    await expect(legendary).not.toHaveAttribute("aria-pressed", pressed!);
    await legendary.click(); // clickable again straight after the bump animation
    await expect(legendary).toHaveAttribute("aria-pressed", pressed!);
    await page.goto(`/jury?case=${target.number}`);
    await page.getByRole("link", { name: "Next case on the docket →" }).click();
    await expect(page).toHaveURL(/\/jury/);
    await expect(page).not.toHaveURL(new RegExp(`case=${target.number}$`));
    expect(errors).toEqual([]);
  });

  test("the player's reduce-motion setting disables animation", async ({ browser }) => {
    const page = await demoPage(browser, "fresh_intern");
    await page.goto("/settings");
    await page.getByRole("checkbox", { name: /Reduce motion/ }).check();
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByText("Preferences saved.")).toBeVisible();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    const running = await page.locator(".chr-blink, .chr-bob").evaluateAll((els) =>
      els.filter((e) => getComputedStyle(e).animationName !== "none" && parseFloat(getComputedStyle(e).animationDuration) > 0.001).length,
    );
    expect(running).toBe(0);
    // Restore for other tests.
    await page.goto("/settings");
    await page.getByRole("checkbox", { name: /Reduce motion/ }).uncheck();
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByText("Preferences saved.")).toBeVisible();
  });
});

test("§12 statistics are calculated correctly (profile = database = full recomputation)", async ({ page }) => {
  // Every player's counters, after the seed and all e2e games, match a recomputation from raw history.
  const out = execSync("npx tsx --conditions=react-server scripts/audit-stats.ts", {
    env: { ...process.env, DATABASE_URL },
    encoding: "utf8",
  });
  expect(out).toContain("all statistics match history");

  // And the public profile shows exactly what the database holds.
  const user = await prisma.user.findUniqueOrThrow({ where: { username: "counselor_coo" }, select: { stats: true } });
  const s = user.stats!;
  await page.goto("/u/counselor_coo");
  const row = (card: string, label: string) =>
    page.locator("div.velvet", { has: page.getByText(card, { exact: true }) }).locator("dl div", { has: page.locator("dt", { hasText: label }) });
  await expect(row("Defense attorney", "Wins / losses")).toContainText(`${s.defenseWins} / ${s.defenseLosses}`);
  await expect(row("Defense attorney", "Best streak")).toContainText(String(s.longestDefenseStreak));
  await expect(row("Prosecutor", "Wins / losses")).toContainText(`${s.prosecutionWins} / ${s.prosecutionLosses}`);
  await expect(row("Defendant", "Found guilty")).toContainText(String(s.timesConvicted));
  await expect(page.getByText(`${s.xp} XP`)).toBeVisible();
  await expect(page.getByText("Reputation", { exact: true }).locator("..")).toContainText(String(s.reputation));
});

/**
 * Pixel-level check: every labelled illustration is rasterised in the browser
 * (SVG → canvas) and must produce visible, multi-coloured pixels. Together these pages
 * show every character, all 12 category icons, all 20 achievement badges, all verdict
 * stamps, avatars, seals, the crest and the empty-state scenes.
 */
test("§12 visual assets render correctly (rasterised pixels, all art)", async ({ browser }) => {
  const page = await demoPage(browser, "counselor_coo");
  const pages = ["/", "/confess", "/u/counselor_coo", "/archives", "/archives?verdict=MISTRIAL", "/archives?verdict=DISMISSED", "/archives?q=zzzz-none", "/leaderboards", "/cases/1", "/jury", "/nope"];
  const seen = new Set<string>();
  const failures: string[] = [];
  for (const path of pages) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await page.locator('svg[role="img"]').evaluateAll(async (svgs) => {
      const out: { label: string; opaque: number; colors: number; total: number }[] = [];
      for (const svg of svgs as SVGSVGElement[]) {
        const r = svg.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        const clone = svg.cloneNode(true) as SVGSVGElement;
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        const w = Math.round(r.width), h = Math.round(r.height);
        clone.setAttribute("width", String(w));
        clone.setAttribute("height", String(h));
        const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let opaque = 0;
        const colors = new Set<number>();
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 32) {
            opaque++;
            colors.add(((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4));
          }
        }
        URL.revokeObjectURL(url);
        out.push({ label: svg.getAttribute("aria-label") ?? "?", opaque, colors: colors.size, total: w * h });
      }
      return out;
    });
    for (const r of results) {
      seen.add(r.label);
      if (r.opaque < r.total * 0.05) failures.push(`${path}: "${r.label}" nearly blank (${r.opaque}/${r.total} opaque px)`);
      if (r.colors < 3) failures.push(`${path}: "${r.label}" has only ${r.colors} colours`);
    }
  }
  expect(failures).toEqual([]);
  const labels = [...seen].join(" | ");
  // Coverage: every kind of art actually appeared and was checked.
  for (const needle of [/owl|judge/i, /pigeon/i, /raccoon/i, /hamster/i, /bulldog|bailiff/i, /cat/i, /pizza/i, /Rubber stamp: GUILTY/i, /Rubber stamp: NOT GUILTY/i, /Rubber stamp: MISTRIAL/i, /Rubber stamp: DISMISSED/i, /seal/i, /crest/i, /tumbleweed|no cases/i, /404|confused|pigeon/i]) {
    expect(labels, `art matching ${needle} was rendered`).toMatch(needle);
  }
  const categoryIcons = [...seen].filter((l) => /Crimes|Offenses|Disputes|Treason|Hot Takes|Theft|Misconduct|Shenanigans|Incidents|Fashion|Blunders|Mischief/.test(l));
  expect(new Set(categoryIcons).size, "all 12 category icons rendered").toBeGreaterThanOrEqual(12);
  const missingBadges = ACHIEVEMENTS.map((a) => a.name).filter((name) => !seen.has(name));
  expect(missingBadges, "all 20 achievement badges rendered").toEqual([]);
});

test("§12 forms: invalid submissions don't use up the rate limit (audit defect A)", async ({ browser }) => {
  const page = await demoPage(browser, "hammy_the_accused");
  await page.goto("/confess");
  await page.locator(`label:has(input[value="pet-related"])`).click();
  const sfx = Date.now().toString(36).slice(-5);
  await page.getByLabel("Case title").fill(`I taught the parrot to say my sister's ringtone ${sfx}`);
  await page.getByLabel("The confession").fill(`Every time it chirps she checks her phone. She has checked it four hundred times this week. The parrot is thriving (${sfx}).`);
  // Four failed attempts (rules not accepted) — more than the 3-per-10-minutes limit.
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Submit my confession to the court" }).click();
    await expect(page.getByText("You must accept the community rules.")).toBeVisible();
  }
  await page.getByRole("checkbox", { name: /harmless, petty or fictional/ }).check();
  await page.getByRole("button", { name: "Submit my confession to the court" }).click();
  await page.waitForURL(/\/cases\/\d+-.*\?filed=1/);
});

test("§12 navigation: unknown editor ids are real 404s (audit defect G)", async ({ browser }) => {
  const page = await demoPage(browser, "counselor_coo");
  for (const path of ["/defend/zzz", "/prosecute/zzz", "/cases/999999", "/u/no_such_player"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
  }
});

test("§12 claim buttons explain why they're disabled without overflowing (audit defects C, F)", async ({ browser }) => {
  const page = await demoPage(browser, "fresh_intern");
  const own = await prisma.case.findFirstOrThrow({
    where: { accused: { username: "fresh_intern" }, status: "AWAITING_DEFENSE" },
    select: { number: true, slug: true },
  });
  await page.goto(`/cases/${own.number}-${own.slug}`);
  const btn = page.getByRole("button", { name: "You can't defend your own case." });
  await expect(btn).toBeDisabled();
  const fits = await btn.evaluate((b) => b.scrollWidth <= b.clientWidth + 1);
  expect(fits).toBe(true);
});

test("§12 stats: jury agreement uses decided cases only (audit #2)", async ({ page }) => {
  const u = await prisma.user.findUniqueOrThrow({ where: { username: "counselor_coo" }, select: { id: true, stats: true } });
  const decided = await prisma.vote.count({ where: { userId: u.id, case: { status: "CLOSED", verdict: { in: ["GUILTY", "NOT_GUILTY"] } } } });
  const expected = decided ? `${Math.round((u.stats!.juryMajorityVotes / decided) * 100)}%` : "—";
  await page.goto("/u/counselor_coo");
  const card = page.locator("div.velvet", { has: page.getByText("Juror", { exact: true }) });
  await expect(card.locator("dl div", { has: page.locator("dt", { hasText: "With majority" }) })).toContainText(expected);
});

test("§12 security: wrong passwords from one IP don't lock the owner out elsewhere (audit #1)", async ({ browser }) => {
  const attacker = await browser.newContext({ extraHTTPHeaders: { "X-Forwarded-For": "203.0.113.7" } });
  const a = await attacker.newPage();
  await a.goto("/login");
  for (let i = 0; i < 9; i++) {
    await a.getByLabel("Username").fill("juror_whiskers");
    await a.getByLabel("Password").fill(`wrong-guess-${i}`);
    await a.getByRole("button", { name: "Enter the courtroom" }).click();
    await expect(a.getByRole("alert").filter({ hasText: /wrong password|Too many attempts/ })).toBeVisible();
  }
  await expect(a.getByRole("alert").filter({ hasText: /Too many attempts/ })).toBeVisible(); // attacker is throttled
  const owner = await browser.newContext({ extraHTTPHeaders: { "X-Forwarded-For": "198.51.100.42" } });
  const o = await owner.newPage();
  await o.goto("/login");
  await o.getByLabel("Username").fill("juror_whiskers");
  await o.getByLabel("Password").fill("objection-sustained");
  await o.getByRole("button", { name: "Enter the courtroom" }).click();
  await o.waitForURL(/\/court/);
});

test("§12 share links use the runtime site URL (audit #7)", async ({ page, baseURL }) => {
  await page.goto("/cases/1");
  await page.waitForURL(/\/cases\/1-/);
  const og = await page.locator('meta[property="og:url"]').getAttribute("content");
  expect(og).toContain(baseURL!);
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`${baseURL}/cases/`);
});

test("§12 jurors see majority/minority, not win/loss, on verdicts (audit #5)", async ({ browser }) => {
  const juror = await prisma.user.findUniqueOrThrow({ where: { username: "juror_whiskers" }, select: { id: true } });
  const vote = await prisma.vote.findFirstOrThrow({
    where: { userId: juror.id, case: { status: "CLOSED", verdict: { in: ["GUILTY", "NOT_GUILTY"] } } },
    select: { choice: true, case: { select: { number: true, slug: true, verdict: true } } },
  });
  const page = await demoPage(browser, "juror_whiskers");
  await page.goto(`/cases/${vote.case.number}-${vote.case.slug}`);
  const expected = vote.choice === vote.case.verdict ? "Your vote sided with the majority." : "You were outvoted. Dissent noted.";
  await expect(page.getByText(expected)).toBeVisible();
  await expect(page.getByText(/You won this case|You lost this one/)).toHaveCount(0);
});
