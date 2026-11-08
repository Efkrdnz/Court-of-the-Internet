import { ImageResponse } from "next/og";
import { ogArt, ogFonts } from "@/server/og";

export const alt = "Court of the Internet: the internet's most prestigious court for its least important crimes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", background: "#2a0a12", padding: 40, fontFamily: "Bricolage" }}>
        <div style={{ fontFamily: "Fraktur", fontSize: 92, color: "#e8c766" }}>Court of the Internet</div>
        <div style={{ fontFamily: "Playfair", fontWeight: 700, fontSize: 34, color: "#efe3c8", marginTop: 6 }}>Justice for the pettiest crimes ever committed.</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 30, marginTop: 30 }}>
          <img src={await ogArt("pigeon")} width={250} height={270} alt="" />
          <img src={await ogArt("judge-stern")} width={300} height={325} alt="" />
          <img src={await ogArt("raccoon")} width={270} height={270} alt="" />
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
