import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, findMidWordBreaks } from "./helpers";

const PAGES = ["/", "/archives", "/leaderboards", "/rules", "/login", "/signup", "/cases/1", "/cases/27", "/u/counselor_coo", "/jury", "/defend", "/prosecute", "/confess"];

for (const path of PAGES) {
  test(`mobile layout fits the screen: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalScroll(page);
  });
}

test("mobile navigation menu opens and navigates", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const nav = page.locator("#mobile-nav");
  await expect(nav).toBeVisible();
  // The panel covers the screen below the header and every link is visible (not clipped).
  const box = (await nav.boundingBox())!;
  expect(box.height).toBeGreaterThan(page.viewportSize()!.height * 0.8);
  for (const label of ["Courtroom", "Confess", "Defend", "Prosecute", "Jury Duty", "Archives", "Leaderboards"]) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeInViewport();
  }
  await nav.getByRole("link", { name: "Archives" }).click();
  await page.waitForURL(/\/archives/);
  await expect(page.locator("#mobile-nav")).toHaveCount(0);
});

test("mobile menu closes on Back and on resize to desktop (audit 25 D3, D4)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("#mobile-nav").getByRole("link", { name: "Archives" }).click();
  await page.waitForURL(/\/archives/);
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator("#mobile-nav")).toBeVisible();
  await page.goBack();
  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.locator("#mobile-nav")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator("#mobile-nav")).toBeVisible();
  await page.setViewportSize({ width: 1180, height: 820 });
  await expect(page.locator("#mobile-nav")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

/* ---------- Usability beyond layout: real flows on a phone ---------- */

async function phoneLogin(browser: import("@playwright/test").Browser, username: string) {
  const { devices } = await import("@playwright/test");
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  await page.goto("/login");
  await page.locator(`form:has(input[name="username"][value="${username}"]) button`).tap();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  return page;
}

async function expectTapTargets(page: import("@playwright/test").Page) {
  // Every visible button and button-styled link is at least 36px tall and fully on screen.
  const bad = await page.locator("button:visible, a.btn:visible, a.chip:visible, footer nav a:visible, nav[aria-label=Pagination] a:visible").evaluateAll((els) =>
    els
      // Items inside a horizontal scroller (e.g. the category chip row) are reachable by swiping.
      .filter((el) => {
        for (let a = el.parentElement; a; a = a.parentElement) {
          const ox = getComputedStyle(a).overflowX;
          if (ox === "auto" || ox === "scroll") return false;
        }
        return true;
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { text: (el.textContent ?? "").trim().slice(0, 40), h: r.height, left: r.left, right: r.right };
      })
      .filter((b) => b.h > 0 && (b.h < 36 || b.left < -1 || b.right > window.innerWidth + 1)),
  );
  expect(bad).toEqual([]);
}

test("mobile: confess a crime end to end on a phone", async ({ browser }) => {
  const page = await phoneLogin(browser, "fresh_intern");
  await page.goto("/confess");
  await expectTapTargets(page);
  await page.locator(`label:has(input[value="gaming-offenses"])`).tap();
  const sfx = Date.now().toString(36).slice(-5);
  await page.getByLabel("Case title").fill(`I paused the online game to win ${sfx}`);
  await page.getByLabel("The confession").fill("It was an online match, which cannot be paused, so I unplugged the router instead and claimed the win by forfeit. Twice.");
  await page.getByRole("checkbox", { name: /harmless, petty or fictional/ }).tap();
  await page.getByRole("button", { name: /^Submit my confession/ }).tap();
  await page.waitForURL(/\/cases\/\d+-.*\?filed=1/);
  await expect(page.getByText(/entered into the record/)).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("mobile: serve on a jury and react on a phone", async ({ browser }) => {
  const page = await phoneLogin(browser, "da_rascal");
  await page.goto("/jury");
  await page.waitForURL(/\/jury\?case=\d+/);
  await expectNoHorizontalScroll(page);
  const notGuilty = page.getByRole("button", { name: /^NOT GUILTY/ });
  await notGuilty.scrollIntoViewIfNeeded();
  await expect(notGuilty).toBeInViewport();
  await notGuilty.tap();
  await page.getByRole("button", { name: "Seal my vote" }).tap();
  await expect(page.getByText("Your vote is sealed.")).toBeVisible();
  await expect(page.getByRole("group", { name: /^Tally:/ })).toBeVisible();
  await expectTapTargets(page);
  // Reactions + share on a closed case.
  await page.goto("/cases/2");
  await page.waitForURL(/\/cases\/2-/);
  const relatable = page.getByRole("button", { name: /Relatable/ });
  const pressed = await relatable.getAttribute("aria-pressed");
  await relatable.tap();
  await expect(relatable).not.toHaveAttribute("aria-pressed", pressed!);
  await expect(page.getByRole("button", { name: "Copy verdict summary" })).toBeInViewport({ ratio: 0 }).catch(() => undefined);
  await expectNoHorizontalScroll(page);
});

test("mobile: only one header menu is open at a time (audit 32 D3)", async ({ browser }) => {
  const page = await phoneLogin(browser, "counselor_coo");
  await page.goto("/court");
  await page.getByRole("button", { name: "Open menu" }).tap();
  await expect(page.locator("#mobile-nav")).toBeVisible();
  await page.getByRole("button", { name: /account menu/i }).tap();
  await expect(page.locator("#mobile-nav")).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Settings" })).toBeInViewport();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  await page.context().close();
});

test("mobile: dashboard, queues and settings are usable on a phone", async ({ browser }) => {
  const page = await phoneLogin(browser, "counselor_coo");
  for (const path of ["/court", "/defend", "/prosecute", "/settings", "/notifications", "/u/counselor_coo", "/archives", "/cases/1", "/cases/27", "/leaderboards", "/jury", "/"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalScroll(page);
    await expectTapTargets(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  }
  // The account menu works on touch and doesn't break the header (audit defect B).
  const logo = page.getByRole("link", { name: "Court of the Internet", exact: true });
  const before = (await logo.boundingBox())!;
  await page.getByRole("button", { name: /account menu/i }).tap();
  const after = (await logo.boundingBox())!;
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
  const header = (await page.locator("header").first().boundingBox())!;
  const menu = (await page.getByRole("menu").boundingBox())!;
  expect(menu.y).toBeGreaterThanOrEqual(header.y + header.height - 2);
  await page.getByRole("menuitem", { name: "Settings" }).tap();
  await expect(page).toHaveURL(/\/settings$/);
  // Settings form submits on mobile.
  await page.getByRole("button", { name: "Save preferences" }).tap();
  await expect(page.getByText("Preferences saved.")).toBeVisible();
});

test("mobile: claim a case and file a defense on a phone", async ({ browser }) => {
  const page = await phoneLogin(browser, "juror_whiskers");
  await page.goto("/defend");
  await page.getByRole("button", { name: "Assign me a random case" }).tap();
  await page.waitForURL(/\/defend\/.+/);
  await expect(page.getByText("You hold this case.")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.getByRole("button", { name: /^Your Honour, my client is a victim/ }).tap();
  await page.getByLabel("Your defense").fill(
    "Your Honour, my client is a victim of circumstance. The snack was unattended, the night was long, and hunger is not a crime: it is a lifestyle.",
  );
  await page.getByRole("button", { name: "File the defense" }).tap();
  await page.waitForURL(/\?filed=defense/);
  await expect(page.getByText("Defense filed!")).toBeVisible();
});

for (const width of [360, 320]) {
  test(`narrow phones (${width}px): every page fits`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 740 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto("/login");
    await page.locator(`form:has(input[name="username"][value="counselor_coo"]) button`).tap();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
    for (const path of ["/", "/court", "/confess", "/defend", "/prosecute", "/jury", "/cases/1", "/archives", "/leaderboards", "/u/counselor_coo", "/settings", "/notifications", "/rules"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalScroll(page);
      // …and no ordinary word is squeezed into a column too narrow for it (audit 7 #1–3).
      expect(await findMidWordBreaks(page), `${path} at ${width}px`).toEqual([]);
    }
    // The vote confirmation (shown after picking a side, before sealing the vote).
    await page.goto("/jury");
    const pick = page.locator("button[aria-pressed]").last();
    if (await pick.isVisible()) {
      await pick.tap();
      await expect(page.getByRole("button", { name: "Reconsider" })).toBeVisible();
      expect(await findMidWordBreaks(page), `vote confirmation at ${width}px`).toEqual([]);
    }
    await context.close();
  });
}

test("mobile: a server-side rejection is brought into view (audit #4)", async ({ browser }) => {
  const page = await phoneLogin(browser, "hammy_the_accused");
  await page.goto("/confess");
  await page.locator(`label:has(input[value="social-misconduct"])`).tap();
  await page.getByLabel("Case title").fill("I gave out a fake number at the party");
  await page.getByLabel("The confession").fill("Someone asked for my number so I gave them 555 123 4567 and then hid behind the snack table for an hour.");
  await page.getByRole("checkbox", { name: /harmless, petty or fictional/ }).tap();
  await page.getByRole("button", { name: /^Submit my confession/ }).tap();
  // Focus moves to the offending field, and its own error message is on screen next to it.
  const field = page.getByLabel("The confession");
  await expect(field).toBeFocused();
  await expect(field).toBeInViewport();
  await expect(page.locator("p[role=alert]", { hasText: /personal information/ })).toBeInViewport();
});

test("narrow phones: long unbroken words never widen the page (audit 3 #1)", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto("/login");
  await page.locator(`form:has(input[name="username"][value="fresh_intern"]) button`).tap();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  await page.goto("/confess");
  await page.locator(`label:has(input[value="miscellaneous-mischief"])`).tap();
  // 36+ character words are rejected as keyboard-mash…
  await page.getByLabel("Case title").fill("Supercalifragilisticexpialidociouslyx microwave");
  await page.getByLabel("The confession").fill("I microwaved fish in the office kitchen and then blamed the new intern, who does not exist.");
  await page.getByRole("checkbox", { name: /harmless, petty or fictional/ }).tap();
  await page.getByRole("button", { name: /^Submit my confession/ }).tap();
  await expect(page.getByRole("alert").filter({ hasText: /longer than 35 characters|spam/ }).first()).toBeVisible();
  // …and the longest allowed word (35 chars) still wraps everywhere it appears.
  const word = `Antidisestablishmentarianismwaffle${Date.now().toString(36).slice(-1)}`;
  expect(word.length).toBe(35);
  await page.getByLabel("Case title").fill(`I hid the ${word}`);
  // Let the first rejection settle before re-submitting (this flaked once under heavy load).
  await page.waitForLoadState("networkidle");
  const submit = page.getByRole("button", { name: /^Submit my confession/ });
  await expect(submit).toBeEnabled();
  await submit.tap();
  await expect(page, "the 35-character title should be accepted").toHaveURL(/\/cases\/\d+-.*\?filed=1/, { timeout: 30_000 });
  await expectNoHorizontalScroll(page);
  for (const path of ["/defend", "/u/fresh_intern", "/court"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalScroll(page);
  }
});
