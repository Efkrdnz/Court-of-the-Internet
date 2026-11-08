import { useId } from "react";
import { P } from "../palette";

export type StampVerdict = "GUILTY" | "NOT_GUILTY" | "MISTRIAL" | "DISMISSED";

const STAMPS: Record<StampVerdict, { word: string; ink: string; sub: string; len: number; size: number }> = {
  GUILTY: { word: "GUILTY", ink: P.crimson, sub: "SENTENCE TO BE PRONOUNCED", len: 196, size: 48 },
  NOT_GUILTY: { word: "NOT GUILTY", ink: P.teal, sub: "ACQUITTED OF ALL CHARGES", len: 226, size: 44 },
  MISTRIAL: { word: "MISTRIAL", ink: P.plum, sub: "THE JURY IS HOPELESSLY DIVIDED", len: 216, size: 46 },
  DISMISSED: { word: "DISMISSED", ink: P.raccoonGrey, sub: "CASE THROWN OUT OF COURT", len: 222, size: 46 },
};

/** Five-point star path centred on (cx, cy). */
function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** A rubber-stamp verdict impression with a grungy, uneven ink texture. */
export function VerdictStamp({
  verdict,
  className,
  animate,
}: {
  verdict: StampVerdict;
  className?: string;
  animate?: boolean;
}) {
  const uid = "prp" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const s = STAMPS[verdict] ?? STAMPS.DISMISSED;
  const label = `Rubber stamp: ${s.word}`;
  const classes = [className, animate ? "prp-stamp-slam" : null].filter(Boolean).join(" ") || undefined;
  const half = s.len / 2;

  return (
    <svg
      viewBox="0 0 360 160"
      role="img"
      aria-label={label}
      className={classes}
      style={animate ? { transformOrigin: "50% 50%" } : undefined}
    >
      <title>{label}</title>
      <defs>
        <filter id={`${uid}-ink`} filterUnits="userSpaceOnUse" x="0" y="0" width="360" height="160">
          {/* wobble the edges like ink pressed into paper fibres */}
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4" result="warp" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale="3.2"
            xChannelSelector="R"
            yChannelSelector="G"
            result="rough"
          />
          {/* broad blotches where the stamp pressed unevenly */}
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.028" numOctaves="3" seed="12" result="blot" />
          <feColorMatrix
            in="blot"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2 0 0 0 -0.12"
            result="blotA"
          />
          <feComposite in="rough" in2="blotA" operator="in" result="inked" />
          {/* fine speckles of missing ink */}
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="9" result="speck" />
          <feColorMatrix
            in="speck"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  14 0 0 0 -8.6"
            result="holes"
          />
          <feComposite in="inked" in2="holes" operator="out" />
        </filter>
      </defs>
      <g filter={`url(#${uid}-ink)`} opacity={0.92}>
        <g transform="rotate(-8 180 80)" fill={s.ink} stroke={s.ink}>
          <rect x="30" y="26" width="300" height="108" rx="16" fill="none" strokeWidth="7" />
          <rect x="41" y="37" width="278" height="86" rx="9" fill="none" strokeWidth="2.2" />
          <text
            x="180"
            y="54"
            textAnchor="middle"
            stroke="none"
            fontFamily='"Special Elite", "Courier New", monospace'
            fontSize="10.5"
            textLength="236"
            lengthAdjust="spacingAndGlyphs"
          >
            BY ORDER OF THE COURT OF THE INTERNET
          </text>
          <path d="M58 61H302" strokeWidth="1.6" />
          <path d="M58 108H302" strokeWidth="1.6" />
          <text
            x="180"
            y="102"
            textAnchor="middle"
            stroke="none"
            fontFamily='"Playfair Display", Georgia, serif'
            fontWeight="900"
            fontSize={s.size}
            textLength={s.len}
            lengthAdjust="spacingAndGlyphs"
          >
            {s.word}
          </text>
          <path d={star(180 - half - 15, 87, 6.5)} stroke="none" />
          <path d={star(180 + half + 15, 87, 6.5)} stroke="none" />
          <text
            x="180"
            y="119"
            textAnchor="middle"
            stroke="none"
            fontFamily='"Special Elite", "Courier New", monospace'
            fontSize="8.5"
            letterSpacing="1.2"
          >
            {s.sub}
          </text>
          <path d={star(64, 116, 3.6)} stroke="none" />
          <path d={star(296, 116, 3.6)} stroke="none" />
          <path d={star(52, 54, 3.6)} stroke="none" />
          <path d={star(308, 54, 3.6)} stroke="none" />
        </g>
      </g>
    </svg>
  );
}
