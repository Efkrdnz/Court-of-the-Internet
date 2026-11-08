import { ImageResponse } from "next/og";
import { db } from "@/server/db";
import { ogArt, ogFonts } from "@/server/og";
import { parseCaseParam, formatCaseNumber } from "@/lib/text";
import { getCategory } from "@/lib/categories";
import { anonymousAlias } from "@/lib/alias";

export const alt = "Court of the Internet case file";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STAMP: Record<string, { text: string; color: string }> = {
  GUILTY: { text: "GUILTY", color: "#b3202a" },
  NOT_GUILTY: { text: "NOT GUILTY", color: "#1f6f5c" },
  MISTRIAL: { text: "MISTRIAL", color: "#4b2a5e" },
  DISMISSED: { text: "DISMISSED", color: "#5c5254" },
  PENDING: { text: "JURY OUT", color: "#8a6d1c" },
};

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
  const visible = c && c.moderationState === "VISIBLE";
  const closed = visible && c.status === "CLOSED" && c.verdict;
  const stamp = closed ? STAMP[c.verdict!] : STAMP.PENDING;
  const accused = visible ? (c.anonymous ? anonymousAlias(c.aliasSeed).name : c.accused.displayName) : "";
  const art = await ogArt(visible && c.category === "food-crimes" ? "pizza" : closed ? "judge-stern" : "judge-shocked");
  const confession = visible ? (c.confession.length > 210 ? `${c.confession.slice(0, 207)}…` : c.confession) : "";

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
          <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 300 }}>
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
                <div style={{ marginTop: 10, fontFamily: "Playfair", fontWeight: 700, fontSize: 22, color: "#5a4632", letterSpacing: 2 }}>
                  {`THE PEOPLE v. ${accused.toUpperCase()} · ${getCategory(c.category).label.toUpperCase()}`}
                </div>
                <div style={{ marginTop: 14, fontFamily: "Playfair", fontWeight: 900, fontSize: c.title.length > 60 ? 42 : 50, lineHeight: 1.08, color: "#1a0f12" }}>{c.title}</div>
                <div style={{ marginTop: 18, fontFamily: "Elite", fontSize: 22, lineHeight: 1.45, color: "#2a1c16" }}>{`“${confession}”`}</div>
                <div style={{ marginTop: "auto", display: "flex", gap: 24, fontSize: 24, color: "#5a4632", fontWeight: 700 }}>
                  {closed ? <span>{`Final tally: ${c.guiltyVotes} guilty · ${c.notGuiltyVotes} not guilty`}</span> : <span>The jury is still out. Cast your vote!</span>}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 40, fontFamily: "Playfair", fontWeight: 900, fontSize: 64, color: "#1a0f12" }}>This case has been sealed.</div>
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
                transform: "rotate(-10deg)",
                border: `7px solid ${stamp.color}`,
                borderRadius: 14,
                padding: "8px 22px",
                color: stamp.color,
                fontFamily: "Playfair",
                fontWeight: 900,
                fontSize: stamp.text.length > 8 ? 40 : 54,
                letterSpacing: 3,
                opacity: 0.88,
                background: "rgba(239,227,200,0.6)",
              }}
            >
              {stamp.text}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
