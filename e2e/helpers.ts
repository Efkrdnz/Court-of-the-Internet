import type { Browser, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Opens a fresh browser context signed in as a seeded demo account. */
export async function demoPage(browser: Browser, username: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.locator(`form:has(input[name="username"][value="${username}"]) button`).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  return page;
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(1);
}
