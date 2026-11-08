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

/**
 * Content must fit the *device* width. (Under mobile emulation the browser widens the
 * layout viewport to fit oversized content, so comparing against innerWidth would hide
 * the very overflow we're looking for.)
 */
export async function expectNoHorizontalScroll(page: Page) {
  const device = page.viewportSize()!.width;
  const { scroll, inner, culprits } = await page.evaluate((W) => {
    const culprits: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > W + 1 && !el.closest("[aria-hidden=true], .no-scrollbar")) {
        culprits.push(`${el.tagName.toLowerCase()} "${(el.getAttribute("class") ?? "").slice(0, 50)}" right=${Math.round(r.right)}`);
      }
    }
    return { scroll: document.documentElement.scrollWidth, inner: window.innerWidth, culprits: culprits.slice(0, 5) };
  }, device);
  expect({ scroll, inner, culprits }, "page content must fit the device width").toEqual({ scroll: device, inner: device, culprits: [] });
}
