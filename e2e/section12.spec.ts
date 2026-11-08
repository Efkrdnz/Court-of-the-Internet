/**
 * Explicit verification of GOAL.md §12 ("Final Quality Requirements") against the
 * production build. Each test is named after the requirement it proves.
 */
import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { demoPage } from "./helpers";

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
  await expect(page.getByText(`${total} cases decided · ${Math.round((guilty / total) * 100)}% conviction rate`)).toBeVisible();
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
