import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

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
  await nav.getByRole("link", { name: "Archives" }).click();
  await page.waitForURL(/\/archives/);
  await expect(page.locator("#mobile-nav")).toHaveCount(0);
});
