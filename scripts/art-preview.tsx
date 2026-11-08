/**
 * Renders a gallery module (default export: React element) to static HTML and
 * screenshots it with Playwright, so SVG art can be reviewed without the dev server.
 *
 *   npx tsx scripts/art-preview.tsx scripts/art-galleries/characters.tsx /path/out.png [width] [--dark]
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function main() {
  const [galleryPath, outPath, widthArg, ...flags] = process.argv.slice(2);
  if (!galleryPath || !outPath) throw new Error("usage: art-preview <gallery.tsx> <out.png> [width] [--dark]");
  const mod = await import(pathToFileURL(path.resolve(galleryPath)).href);
  const element = mod.default?.default ?? mod.default;
  const markup = renderToStaticMarkup(typeof element === "function" ? element() : element);

  const artDir = path.resolve("src/components/art");
  const css = readdirSync(artDir)
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(path.join(artDir, f), "utf8"))
    .join("\n");
  const font = (pkg: string, file: string) =>
    pathToFileURL(path.join(path.dirname(require.resolve(`${pkg}/package.json`)), "files", file)).href;
  const fonts = `
    @font-face { font-family: "Playfair Display"; font-weight: 700 900; src: url(${font("@fontsource/playfair-display", "playfair-display-latin-800-normal.woff2")}); }
    @font-face { font-family: "Bricolage Grotesque"; font-weight: 400 800; src: url(${font("@fontsource/bricolage-grotesque", "bricolage-grotesque-latin-700-normal.woff2")}); }
    @font-face { font-family: "Special Elite"; src: url(${font("@fontsource/special-elite", "special-elite-latin-400-normal.woff2")}); }
    @font-face { font-family: "UnifrakturCook"; src: url(${font("@fontsource/unifrakturcook", "unifrakturcook-latin-700-normal.woff2")}); }`;
  const dark = flags.includes("--dark");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
    body { margin: 0; padding: 24px; background: ${dark ? "#1c1316" : "#efe3c8"}; font-family: "Bricolage Grotesque", sans-serif; color: ${dark ? "#f6ecd6" : "#2a1c16"}; }
    .gallery { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-end; }
    .gallery figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .gallery figcaption { font-size: 12px; opacity: .75; }
    ${css}</style></head><body>${markup}</body></html>`;
  const htmlPath = outPath.replace(/\.png$/, ".html");
  writeFileSync(htmlPath, html);

  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: Number(widthArg) || 1400, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href);
  await page.waitForTimeout(400);
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
  console.log(`wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
