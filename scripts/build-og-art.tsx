/**
 * Pre-renders the character SVGs used by Open Graph images into assets/og-art/
 * (next/og runs inside the React Server graph, where react-dom/server is off-limits).
 *   npx tsx scripts/build-og-art.tsx
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { JudgeOwl, PigeonAttorney, RaccoonProsecutor, CryingPizza } from "../src/components/art/characters";

const out = path.resolve("assets/og-art");
mkdirSync(out, { recursive: true });
const art: Record<string, React.ReactElement> = {
  "judge-stern": <JudgeOwl mood="stern" />,
  "judge-shocked": <JudgeOwl mood="shocked" />,
  pigeon: <PigeonAttorney />,
  raccoon: <RaccoonProsecutor />,
  pizza: <CryingPizza />,
};
for (const [name, el] of Object.entries(art)) {
  let markup = renderToStaticMarkup(el);
  if (!markup.includes("xmlns=")) markup = markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  writeFileSync(path.join(out, `${name}.svg`), markup);
  console.log(`wrote assets/og-art/${name}.svg (${markup.length} bytes)`);
}
