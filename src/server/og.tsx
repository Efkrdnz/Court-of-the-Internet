import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Fonts are vendored in /assets/og-fonts (copied from @fontsource; all SIL OFL licensed). */
async function fontFile(_pkg: string, file: string) {
  return readFile(path.join(process.cwd(), "assets", "og-fonts", file));
}

let fontCache: Promise<{ name: string; data: Buffer; weight: 400 | 700 | 900; style: "normal" }[]> | null = null;

/** Satori needs raw font data (woff/ttf, not woff2). */
export function ogFonts() {
  fontCache ??= Promise.all([
    fontFile("@fontsource/playfair-display", "playfair-display-latin-900-normal.woff").then((data) => ({ name: "Playfair", data, weight: 900 as const, style: "normal" as const })),
    fontFile("@fontsource/playfair-display", "playfair-display-latin-700-normal.woff").then((data) => ({ name: "Playfair", data, weight: 700 as const, style: "normal" as const })),
    fontFile("@fontsource/special-elite", "special-elite-latin-400-normal.woff").then((data) => ({ name: "Elite", data, weight: 400 as const, style: "normal" as const })),
    fontFile("@fontsource/bricolage-grotesque", "bricolage-grotesque-latin-700-normal.woff").then((data) => ({ name: "Bricolage", data, weight: 700 as const, style: "normal" as const })),
    fontFile("@fontsource/unifrakturcook", "unifrakturcook-latin-700-normal.woff").then((data) => ({ name: "Fraktur", data, weight: 700 as const, style: "normal" as const })),
  ]);
  return fontCache;
}

export type OgArt = "judge-stern" | "judge-shocked" | "pigeon" | "raccoon" | "pizza";

/** Character art pre-rendered by scripts/build-og-art.tsx, as a data URI for <img> in satori. */
export async function ogArt(name: OgArt): Promise<string> {
  const svg = await readFile(path.join(process.cwd(), "assets", "og-art", `${name}.svg`));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}
