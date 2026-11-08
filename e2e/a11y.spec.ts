import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { demoPage } from "./helpers";

const PUBLIC_PAGES = ["/", "/archives", "/leaderboards", "/rules", "/login", "/signup", "/cases/1", "/u/counselor_coo", "/jury", "/defend"];

for (const path of PUBLIC_PAGES) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
  });
}

for (const path of ["/court", "/confess", "/settings"]) {
  test(`no serious accessibility violations on ${path} (signed in)`, async ({ browser }) => {
    const page = await demoPage(browser, "juror_whiskers");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
  });
}
