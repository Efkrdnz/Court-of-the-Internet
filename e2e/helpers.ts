import type { Browser, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/** Opens a fresh browser context signed in as a seeded demo account. */
export async function demoPage(browser: Browser, username: string): Promise<Page> {
  // Use the current project's device (desktop or phone) for every extra player.
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, contextOptions } = test.info().project.use;
  const context = await browser.newContext({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, ...contextOptions });
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
    // Content clipped by an on-screen overflow:hidden/clip ancestor can't cause horizontal scroll.
    const clipped = (el: Element) => {
      for (let a = el.parentElement; a; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if ((ox === "hidden" || ox === "clip" || ox === "auto" || ox === "scroll") && a.getBoundingClientRect().right <= W + 1) return true;
      }
      return false;
    };
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > W + 1 && !el.closest("[aria-hidden=true], .no-scrollbar") && !clipped(el)) {
        culprits.push(`${el.tagName.toLowerCase()} "${(el.getAttribute("class") ?? "").slice(0, 50)}" right=${Math.round(r.right)}`);
      }
    }
    return { scroll: document.documentElement.scrollWidth, inner: window.innerWidth, culprits: culprits.slice(0, 5) };
  }, device);
  expect({ scroll, inner, culprits }, "page content must fit the device width").toEqual({ scroll: device, inner: device, culprits: [] });
}

/**
 * Finds ordinary words (≤ 20 characters) that can't fit on one line of their container, i.e.
 * would be split mid-word ("Reconsid/er", "N/o./0/0/3"). Page-overflow checks miss these
 * because the text wraps inside the page.
 */
export async function findMidWordBreaks(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    const found = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? "";
      if (!text.trim()) continue;
      const el = node.parentElement!;
      if (el.closest("[aria-hidden=true], script, style, svg, noscript, dialog:not([open])")) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.textOverflow === "ellipsis" || el.getClientRects().length === 0) continue;
      // Width available to the text: the nearest non-inline ancestor's content box.
      let box: HTMLElement = el;
      while (box.parentElement && getComputedStyle(box).display.startsWith("inline")) box = box.parentElement;
      const bs = getComputedStyle(box);
      if (bs.whiteSpace === "nowrap" || bs.whiteSpace === "pre") continue;
      const avail = box.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
      if (avail <= 0) continue;
      ctx.font = cs.font;
      // A hyphen is a legitimate break point ("Silver-" / "Tongued").
      for (let word of text.split(/\s+|(?<=-)/)) {
        if (!word || word.length > 20) continue;
        if (cs.textTransform === "uppercase") word = word.toUpperCase();
        const w = ctx.measureText(word).width + word.length * (parseFloat(cs.letterSpacing) || 0);
        if (w > avail + 1) found.add(`"${word}" needs ${Math.round(w)}px, has ${Math.round(avail)}px in <${box.tagName.toLowerCase()} class="${(box.getAttribute("class") ?? "").slice(0, 40)}">`);
      }
    }
    return [...found].slice(0, 10);
  });
}
