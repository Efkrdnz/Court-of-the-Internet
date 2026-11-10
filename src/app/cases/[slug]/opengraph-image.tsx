import { ImageResponse } from "next/og";
import { db } from "@/server/db";
import { ogArt, ogFonts } from "@/server/og";
import { parseCaseParam, formatCaseNumber } from "@/lib/text";
import { getCategory } from "@/lib/categories";
import { anonymousAlias } from "@/lib/alias";
import { shareCardStatus } from "@/lib/share-card";
import { ogText, ogTextOr } from "@/lib/og-text";

export const alt = "Court of the Internet case file";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";



/** Width of the text column left of the stamp and art, in pixels. */
const COLUMN = 650;
/** Special Elite is a typewriter face: about 0.55em per character at 22px (measured). */
const QUOTE_CHARS_PER_LINE = Math.floor(COLUMN / (22 * 0.56));

/** Rough rendered width in em: wide capitals count more than narrow lower-case letters. */
function emWidth(text: string): number {
  let em = 0;
  // (Fitted to Satori's Playfair 900: "I licked every cookie so" at 48px is about 520px wide.)
  for (const ch of text) em += /[WM@%]/.test(ch) ? 1 : /[wm]/.test(ch) ? 0.78 : /[A-Z0-9]/.test(ch) ? 0.7 : ch === " " ? 0.25 : /[iljtf.,'’!:;|]/.test(ch) ? 0.3 : 0.5;
  return em;
}

/** Lines `text` takes at `size` px (with optional letter spacing), allowing for word wrapping slack. */
function lineCount(text: string, size: number, letterSpacing = 0): number {
  return Math.max(1, Math.ceil((emWidth(text) * size + [...text].length * letterSpacing) / (COLUMN * 0.92)));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const number = parseCaseParam(slug);
  const c = number
    ? await db.case.findUnique({
        where: { number },
        select: {
          number: true,
          title: true,
          confession: true,
          category: true,
          status: true,
          verdict: true,
          anonymous: true,
          aliasSeed: true,
          moderationState: true,
          guiltyVotes: true,
          notGuiltyVotes: true,
          accused: { select: { displayName: true } },
        },
      })
    : null;
  // No such case: a real 404 rather than a blank card. (Sealed cases still get a neutral card.)
  if (!c) return new Response("Not found", { status: 404 });
  const visible = c.moderationState === "VISIBLE";
  const closed = visible && c.status === "CLOSED" && c.verdict;
  const status = visible ? shareCardStatus(c.status, c.verdict) : null;
  const stamp = { text: status?.stamp ?? "", color: status?.color ?? "#5c5254" };
  const longestStampWord = Math.max(0, ...stamp.text.split(" ").map((w) => w.length));
  // Only what the bundled fonts can draw: anything else would be fetched from a CDN or Google
  // Fonts while rendering (and an emoji fetch that fails crashes the image). Text in another
  // script falls back to neutral wording rather than showing half a name.
  const accused = visible ? ogTextOr(c.anonymous ? anonymousAlias(c.aliasSeed).name : c.accused.displayName, "the accused") : "";
  const title = ogTextOr(c.title, `Case No. ${formatCaseNumber(c.number)}`);
  const quote = ogText(c.confession);
  const quoteText = quote.lostLetters ? "" : quote.text;
  const art = await ogArt(visible && c.category === "food-crimes" ? "pizza" : closed ? "judge-stern" : "judge-shocked");
  // Lay the text out by its estimated width (not its length: 90 W's are far wider than 90 i's),
  // so the subtitle, title and quote always fit above the footer.
  const subtitle = `THE PEOPLE v. ${accused.toUpperCase()} · ${getCategory(c.category).label.toUpperCase()}`;
  const subtitleSize = lineCount(subtitle, 22, 2) <= 1 ? 22 : 18;
  const subtitleHeight = Math.min(2, lineCount(subtitle, subtitleSize, 2)) * subtitleSize * 1.3;
  const titleSize = [48, 42, 36, 32, 28].find((size) => lineCount(title, size) <= 3) ?? 26;
  const titleHeight = lineCount(title, titleSize) * titleSize * 1.08;
  // Card body height, minus the header row, margins and the footer line.
  // (36px of slack: Satori wraps wide words a little less tightly than estimated.)
  const quoteRoom = 470 - 52 - 10 - subtitleHeight - 14 - titleHeight - 18 - 44 - 36;
  const quoteLines = Math.max(0, Math.floor(quoteRoom / (22 * 1.45)));
  const quoteMax = quoteLines * QUOTE_CHARS_PER_LINE - 4;
  // Shortened at a word boundary, so it never ends mid-word ("until the ver…").
  const shorten = (text: string, max: number) => {
    const cut = text.slice(0, Math.max(0, max - 1));
    const atWord = cut.replace(/\s+\S*$/, "");
    return `${(atWord.length > max * 0.6 ? atWord : cut).trimEnd().replace(/[,;:.!?-]+$/, "")}…`;
  };
  const confession = !visible || quoteLines === 0 || !quoteText ? "" : quoteText.length > quoteMax ? shorten(quoteText, quoteMax) : quoteText;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#2a0a12", padding: 36, fontFamily: "Bricolage" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            position: "relative",
            background: "#efe3c8",
            borderRadius: 14,
            border: "5px solid #8a6d1c",
            padding: "34px 44px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ position: "absolute", top: 8, left: 8, right: 8, bottom: 8, border: "2px solid #6b1426", borderRadius: 8, display: "flex" }} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 360 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontFamily: "Fraktur", fontSize: 40, color: "#6b1426" }}>Court of the Internet</div>
              {visible ? (
                <div style={{ display: "flex", background: "#c9a227", color: "#2b1d05", padding: "4px 14px", borderRadius: 6, fontFamily: "Playfair", fontWeight: 700, fontSize: 22 }}>
                  {`Case No. ${formatCaseNumber(c.number)}`}
                </div>
              ) : null}
            </div>
            {visible ? (
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ marginTop: 10, fontFamily: "Playfair", fontWeight: 700, fontSize: subtitleSize, color: "#5a4632", letterSpacing: 2, wordBreak: "break-word" }}>
                  {subtitle}
                </div>
                <div style={{ marginTop: 14, fontFamily: "Playfair", fontWeight: 900, fontSize: titleSize, lineHeight: 1.08, color: "#1a0f12", wordBreak: "break-word" }}>{title}</div>
                {confession ? <div style={{ marginTop: 18, fontFamily: "Elite", fontSize: 22, lineHeight: 1.45, color: "#2a1c16", wordBreak: "break-word" }}>{`“${confession}”`}</div> : null}
                <div style={{ marginTop: "auto", display: "flex", gap: 24, fontSize: 24, color: "#5a4632", fontWeight: 700 }}>
                  {closed ? <span>{`Final tally: ${c.guiltyVotes} guilty · ${c.notGuiltyVotes} not guilty`}</span> : <span>{status?.footer}</span>}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 40, fontFamily: "Playfair", fontWeight: 900, fontSize: 64, color: "#1a0f12" }}>{c.moderationState === "UNDER_REVIEW" ? "This case is under review." : "This case has been sealed."}</div>
            )}
          </div>
          <img src={art} width={250} height={271} style={{ position: "absolute", right: 34, bottom: 22 }} alt="" />
          {visible ? (
            <div
              style={{
                position: "absolute",
                right: 40,
                top: 34,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transform: "rotate(-10deg)",
                border: `7px solid ${stamp.color}`,
                borderRadius: 14,
                padding: "8px 22px",
                color: stamp.color,
                fontFamily: "Playfair",
                fontWeight: 900,
                // One word per line and sized by the longest word, so the stamp stays inside the
                // 360px column reserved for it ("NEEDS COUNSEL" used to overlap the subtitle).
                fontSize: longestStampWord >= 9 ? 40 : longestStampWord >= 7 ? 44 : 54,
                lineHeight: 1.05,
                letterSpacing: 3,
                opacity: 0.88,
                background: "rgba(239,227,200,0.6)",
              }}
            >
              {stamp.text.split(" ").map((word) => (
                <div key={word} style={{ display: "flex" }}>
                  {word}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
