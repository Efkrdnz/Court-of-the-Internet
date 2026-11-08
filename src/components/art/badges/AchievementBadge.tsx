import { useId, type ReactNode } from "react";
import type { AchievementDef, AchievementTier } from "@/lib/achievements";
import { TIER_STYLE } from "@/lib/achievements";
import { P, STROKE } from "../palette";

type AchievementIcon = AchievementDef["icon"];

export interface AchievementBadgeProps {
  icon: AchievementIcon;
  tier: AchievementTier;
  locked?: boolean;
  className?: string;
  title?: string;
}

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                   */
/* ------------------------------------------------------------------ */

const CX = 60;
const CY = 58;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Scalloped rosette outline: `n` bumps between valley radius `rIn` and peak radius `rPeak`. */
function rosettePath(cx: number, cy: number, rIn: number, rPeak: number, n: number): string {
  const rCtrl = 2 * rPeak - rIn * Math.cos(Math.PI / n);
  let d = "";
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const am = (a0 + a1) / 2;
    if (i === 0) d += `M${r2(cx + rIn * Math.cos(a0))} ${r2(cy + rIn * Math.sin(a0))}`;
    d += `Q${r2(cx + rCtrl * Math.cos(am))} ${r2(cy + rCtrl * Math.sin(am))} ${r2(cx + rIn * Math.cos(a1))} ${r2(cy + rIn * Math.sin(a1))}`;
  }
  return d + "Z";
}

/** Short radial "pleat" strokes from each rosette valley inward. */
function pleatsPath(cx: number, cy: number, rFrom: number, rTo: number, n: number): string {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    d += `M${r2(cx + rFrom * Math.cos(a))} ${r2(cy + rFrom * Math.sin(a))}L${r2(cx + rTo * Math.cos(a))} ${r2(cy + rTo * Math.sin(a))}`;
  }
  return d;
}

function sparklePath(x: number, y: number, r: number): string {
  const k = r * 0.22;
  return `M${x} ${y - r}C${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y}C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r}C${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y}C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r}Z`;
}

const GLYPH_SCALE = 1.1;
const ROSETTE = rosettePath(CX, CY, 45, 51.5, 18);
const PLEATS = pleatsPath(CX, CY, 45, 41, 18);

const RIBBON: Record<AchievementTier, string> = {
  bronze: P.burgundy,
  silver: P.teal,
  gold: P.burgundyLight,
  legendary: P.plum,
};

/* ------------------------------------------------------------------ */
/*  Glyphs: drawn in a 48×48 box, ivory with ink outline               */
/* ------------------------------------------------------------------ */

interface GlyphCtx {
  accent: string;
  disc: string;
}

const G = {
  fill: P.ivory,
  mid: P.parchment,
  shade: P.parchmentDark,
  ink: P.outline,
  sw: 2.4,
};

const line = { fill: "none", stroke: G.ink, strokeWidth: G.sw, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const thin = { ...line, strokeWidth: 1.6 } as const;
const solid = (fill: string) => ({ fill, stroke: G.ink, strokeWidth: G.sw, strokeLinejoin: "round", strokeLinecap: "round" }) as const;

/** An outlined tube: ink stroke underneath, colour stroke on top. */
function Tube({ d, w, color = G.fill, dash }: { d: string; w: number; color?: string; dash?: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={G.ink} strokeWidth={w + G.sw * 1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      {dash ? <path d={d} fill="none" stroke={G.shade} strokeWidth={w} strokeDasharray={dash} /> : null}
    </>
  );
}

const GLYPHS: Record<AchievementIcon, (c: GlyphCtx) => ReactNode> = {
  quill: () => (
    <>
      <path d="M17 45c3-3 5 2 8 0s5 2 8 0 4 1 6-1" {...thin} />
      <path d="M13 37C11 25 22 9 42 4C42 16 33 30 13 37Z" {...solid(G.fill)} />
      <path d="M13 37C22 27 31 15 42 4C42 16 33 30 13 37Z" fill={G.shade} />
      <path d="M13 37C11 25 22 9 42 4C42 16 33 30 13 37Z" {...line} />
      <path d="M9 42C20 29 30 16 42 4" {...line} strokeWidth={1.8} />
      <path d="M31 26l-4-1M24 15l-1-3M33 10l-2-3" {...thin} />
      <path d="M6 45l4-4" {...line} strokeWidth={3.4} />
    </>
  ),
  handcuffs: () => (
    <>
      <Tube d="M17 19Q24 9 31 19" w={1.6} dash="2 2" />
      <circle cx={13} cy={32} r={9} fill="none" stroke={G.ink} strokeWidth={7.4} />
      <circle cx={13} cy={32} r={9} fill="none" stroke={G.fill} strokeWidth={3.6} />
      <circle cx={35} cy={32} r={9} fill="none" stroke={G.ink} strokeWidth={7.4} />
      <circle cx={35} cy={32} r={9} fill="none" stroke={G.fill} strokeWidth={3.6} />
      <path d="M8 37a7 7 0 0 0 10 0M30 37a7 7 0 0 0 10 0" fill="none" stroke={G.shade} strokeWidth={2} strokeLinecap="round" />
      <rect x={9} y={17} width={10} height={8} rx={2} {...solid(G.mid)} />
      <rect x={29} y={17} width={10} height={8} rx={2} {...solid(G.mid)} />
      <circle cx={14} cy={21} r={1.3} fill={G.ink} />
      <circle cx={34} cy={21} r={1.3} fill={G.ink} />
    </>
  ),
  "skull-wig": () => (
    <>
      <path d="M8 43C2 31 3 15 12 9C17 3 31 3 36 9C45 15 46 31 40 43Z" {...solid(P.wigShade)} />
      {[
        [7, 22],
        [6, 30],
        [8, 38],
        [41, 22],
        [42, 30],
        [40, 38],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={4.6} {...solid(P.wig)} />
          <path d={`M${x - 1.6} ${y}a1.8 1.8 0 1 1 1.8 1.8`} {...thin} strokeWidth={1.2} />
        </g>
      ))}
      <path d="M12 22C12 13 17 9 24 9S36 13 36 22C36 27 33 29 32 30V36C32 39 16 39 16 36V30C15 29 12 27 12 22Z" {...solid(G.fill)} />
      <path d="M31 13C35 17 35 25 32 29V36C30 38 26 38.5 24 38.5C29 36 30 31 30 26C31 21 32 17 31 13Z" fill={G.shade} />
      <ellipse cx={19} cy={23} rx={3.6} ry={4} fill={G.ink} />
      <ellipse cx={29} cy={23} rx={3.6} ry={4} fill={G.ink} />
      <circle cx={20} cy={22} r={1} fill={G.fill} />
      <circle cx={30} cy={22} r={1} fill={G.fill} />
      <path d="M24 27l-1.6 2.6h3.2Z" fill={G.ink} stroke={G.ink} strokeWidth={1} strokeLinejoin="round" />
      <path d="M17.5 32.5h13M20.5 32.5v4.5M24 32.5v5M27.5 32.5v4.5" {...thin} strokeWidth={1.3} />
      <path d="M11 17C11 8 19 4 24 7C29 4 37 8 37 17C34 13 31 12 28 14C26 11 22 11 20 14C17 12 14 13 11 17Z" {...solid(P.wig)} />
      <path d="M15 12q2-2 4 0M29 12q2-2 4 0M22 8.5q2-1.5 4 0" {...thin} strokeWidth={1.2} />
      <path d="M24 39l-5 6h10Z" {...solid(P.wig)} />
    </>
  ),
  halo: ({ accent }) => (
    <>
      <path d="M14 27C9 21 2 20 1 23C3 25 4 25 5 25.5C2 26.5 2 28.5 3 29.5C5 29.5 6 29.5 7 30C5 32 6 34 7.5 34.5C9 34 10.5 33.5 13 35Z" {...solid(G.mid)} />
      <path d="M34 27C39 21 46 20 47 23C45 25 44 25 43 25.5C46 26.5 46 28.5 45 29.5C43 29.5 42 29.5 41 30C43 32 42 34 40.5 34.5C39 34 37.5 33.5 35 35Z" {...solid(G.mid)} />
      <path d="M16.5 19l1.5-5 3 4M31.5 19l-1.5-5-3 4" {...solid(G.shade)} strokeWidth={1.6} />
      <circle cx={24} cy={29} r={12} {...solid(G.fill)} />
      <path d="M33 22a12 12 0 0 1-6 18.6A12 12 0 0 0 33 22Z" fill={G.shade} />
      <path d="M17 28q2.5-2.6 5 0M26 28q2.5-2.6 5 0" {...line} strokeWidth={1.8} />
      <path d="M19.5 33.5q4.5 3.6 9 0" {...line} strokeWidth={1.8} />
      <circle cx={16.5} cy={32} r={2} fill={P.blush} opacity={0.85} />
      <circle cx={31.5} cy={32} r={2} fill={P.blush} opacity={0.85} />
      <ellipse cx={24} cy={9} rx={13} ry={4.2} fill="none" stroke={G.ink} strokeWidth={6.4} />
      <ellipse cx={24} cy={9} rx={13} ry={4.2} fill="none" stroke={accent} strokeWidth={2.8} />
      <path d="M14 7.4q4-2 8-2.2" stroke={P.white} strokeWidth={1.2} strokeLinecap="round" fill="none" opacity={0.8} />
    </>
  ),
  wanted: ({ accent }) => (
    <g transform="rotate(-5 24 24)">
      <path d="M8 3H40V39L34 45H8Z" {...solid(G.fill)} />
      <path d="M34 45V39H40Z" {...solid(G.shade)} strokeWidth={1.6} />
      <text
        x={24}
        y={11.5}
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontWeight={900}
        fontSize={7.4}
        letterSpacing={-0.2}
        fill={G.ink}
      >
        WANTED
      </text>
      <rect x={13} y={14} width={22} height={17} rx={1} fill={G.shade} stroke={G.ink} strokeWidth={1.4} />
      <path d="M17 31C17 26 20 24 24 24S31 26 31 31Z" fill={G.ink} />
      <circle cx={24} cy={20.5} r={5} fill={G.ink} />
      <path d="M19.5 19.5h9" stroke={G.fill} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={22} cy={19.5} r={0.9} fill={G.ink} />
      <circle cx={26.5} cy={19.5} r={0.9} fill={G.ink} />
      <text
        x={24}
        y={38.5}
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontWeight={900}
        fontSize={6}
        fill={G.ink}
      >
        $5
      </text>
      <path d="M12 41.5h18" {...thin} strokeWidth={1.1} />
      <circle cx={24} cy={4} r={2.2} fill={accent} stroke={G.ink} strokeWidth={1.4} />
    </g>
  ),
  briefcase: ({ accent }) => (
    <>
      <Tube d="M18 15V11Q18 8.5 21 8.5H27Q30 8.5 30 11V15" w={2.4} />
      <path d="M30 18l8-7 4 4-6 5" {...solid(G.fill)} strokeWidth={1.8} />
      <text x={36} y={16.6} textAnchor="middle" fontFamily="Georgia, serif" fontWeight={700} fontSize={5} fill={G.ink} transform="rotate(-41 36 15)">
        $
      </text>
      <rect x={4} y={15} width={40} height={27} rx={4} {...solid(G.fill)} />
      <path d="M6 36H42V38Q42 40 40 40H8Q6 40 6 38Z" fill={G.shade} />
      <path d="M5 25.5H43" {...line} strokeWidth={1.8} />
      <rect x={10} y={22} width={6} height={7} rx={1.4} fill={accent} stroke={G.ink} strokeWidth={1.6} />
      <rect x={32} y={22} width={6} height={7} rx={1.4} fill={accent} stroke={G.ink} strokeWidth={1.6} />
      <path d="M20 31l1.4 2.8 3 .4-2.2 2.1.5 3-2.7-1.4-2.7 1.4.5-3-2.2-2.1 3-.4Z" fill={G.mid} stroke={G.ink} strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M8 18.5h6" stroke={P.white} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
    </>
  ),
  pinocchio: () => (
    <>
      <path d="M23 21L44 18.5C47 18.4 47 22 44 22.4L23.5 27Z" {...solid(G.fill)} />
      <path d="M24 25.5L44 22.4C46 22 46.6 21 46.5 20.2C45 23 30 25 24 25.5Z" fill={G.shade} />
      <path d="M36 20.2C35 15 37 12 41 12C41 16 39 19 36 20.2Z" {...solid(G.mid)} strokeWidth={1.6} />
      <circle cx={14} cy={24} r={12} {...solid(G.fill)} />
      <path d="M8 11C10 6 18 5 21 9C18 8 15 9 14 12C12 9 10 9 8 11Z" {...solid(G.shade)} strokeWidth={1.8} />
      <circle cx={10} cy={21} r={3} {...solid(P.white)} strokeWidth={1.6} />
      <circle cx={17.5} cy={21} r={3} {...solid(P.white)} strokeWidth={1.6} />
      <circle cx={11.6} cy={21.5} r={1.4} fill={G.ink} />
      <circle cx={19.1} cy={21.5} r={1.4} fill={G.ink} />
      <path d="M7 16.5l5 1M15.5 17.5l5-2" {...line} strokeWidth={1.6} />
      <path d="M8 31q4 3 9-1" {...line} strokeWidth={1.8} />
      <circle cx={6.5} cy={27} r={1.8} fill={P.blush} opacity={0.85} />
      <path d="M42 10l1-2M45 12l2-1" {...thin} strokeWidth={1.2} />
    </>
  ),
  rocket: ({ accent }) => (
    <>
      <path d="M4 34h6M2 40h8M8 46h5" {...thin} />
      <g transform="rotate(42 24 24)">
        <path d="M18 33C17 39 24 47 24 47S31 39 30 33Z" {...solid(G.mid)} />
        <path d="M21 33C21 37 24 41 24 41S27 37 27 33Z" fill={accent} stroke={G.ink} strokeWidth={1.2} />
        <path d="M17 23L9 33L17 31Z" {...solid(G.shade)} />
        <path d="M31 23L39 33L31 31Z" {...solid(G.shade)} />
        <path d="M24 2C32 9 34 20 32 33H16C14 20 16 9 24 2Z" {...solid(G.fill)} />
        <path d="M27 6C31 12 32 22 30.5 33H32C34 20 32 9 24 2Z" fill={G.shade} />
        <circle cx={24} cy={17} r={4.6} fill={accent} stroke={G.ink} strokeWidth={G.sw} />
        <path d="M22 15.4a2.6 2.6 0 0 1 2.8-1.2" stroke={P.white} strokeWidth={1.2} strokeLinecap="round" fill="none" />
        <path d="M16.5 27H31.5" {...thin} />
      </g>
    </>
  ),
  megaphone: ({ accent }) => (
    <>
      <path d="M14 29L11.5 39H17L19 29" {...solid(G.mid)} />
      <path d="M6 18L30 9V39L6 30Z" {...solid(G.fill)} />
      <path d="M6 26.5L30 34V39L6 30Z" fill={G.shade} />
      <path d="M6 18L30 9V39L6 30Z" {...line} />
      <path d="M12 15.8V32.2" stroke={accent} strokeWidth={3.2} />
      <path d="M10.6 16.3V31.7M13.4 15.2V32.8" {...thin} strokeWidth={1.2} />
      <rect x={3} y={18} width={4.4} height={12} rx={2} {...solid(G.mid)} />
      <ellipse cx={30} cy={24} rx={4} ry={15} {...solid(G.mid)} />
      <ellipse cx={30.6} cy={24} rx={1.8} ry={10} fill={G.ink} />
      <path d="M37 18q3 6 0 12M41 14q6 10 0 20M45 11q8 13 0 26" {...line} strokeWidth={2} />
    </>
  ),
  gavel: ({ accent }) => (
    <>
      <path d="M3 34.5Q3 32 6 32H28Q31 32 31 34.5V39Q31 42 28 42H6Q3 42 3 39Z" {...solid(G.shade)} />
      <path d="M3 34.5Q3 37 6 37H28Q31 37 31 34.5" {...thin} />
      <path d="M2 27l4 2.5M3.5 21.5l4.5 2M8 44.5l-3 2.5M26 44.5l3 2.5" {...line} strokeWidth={1.8} />
      <g transform="rotate(-32 27 19)">
        <rect x={24.5} y={22} width={5} height={24} rx={2.5} {...solid(G.mid)} />
        <rect x={13} y={11} width={28} height={13} rx={3.4} {...solid(G.fill)} />
        <path d="M14 20.5H40V21Q40 23.5 37.5 23.5H16.5Q14 23.5 14 21Z" fill={G.shade} />
        <rect x={13} y={11} width={28} height={13} rx={3.4} {...line} />
        <path d="M18.5 11.5V23.5M35.5 11.5V23.5" stroke={accent} strokeWidth={3} />
        <path d="M17 11.5V23.5M20 11.5V23.5M34 11.5V23.5M37 11.5V23.5" {...thin} strokeWidth={1.1} />
        <path d="M23 14.5h8" stroke={P.white} strokeWidth={1.5} strokeLinecap="round" opacity={0.85} />
      </g>
    </>
  ),
  stamp: ({ accent }) => (
    <>
      <g transform="rotate(-9 20 38)">
        <rect x={3} y={31} width={33} height={13} rx={1.5} fill="none" stroke={G.fill} strokeWidth={1.6} />
        <rect x={5} y={33} width={29} height={9} rx={1} fill="none" stroke={G.fill} strokeWidth={0.8} />
        <text
          x={19.5}
          y={40.4}
          textAnchor="middle"
          fontFamily="'Playfair Display', Georgia, serif"
          fontWeight={900}
          fontSize={7.4}
          letterSpacing={-0.2}
          fill={G.fill}
        >
          DENIED
        </text>
      </g>
      <g transform="rotate(18 32 16)">
        <circle cx={32} cy={6} r={5} {...solid(G.fill)} />
        <path d="M29 10.5H35L34 18H30Z" {...solid(G.mid)} />
        <path d="M22 18.5Q22 17 24 17H40Q42 17 42 18.5V24H22Z" {...solid(G.fill)} />
        <path d="M22 21.5H42V24H22Z" fill={G.shade} />
        <rect x={22} y={24} width={20} height={3.6} rx={1} fill={accent} stroke={G.ink} strokeWidth={1.8} />
        <path d="M30 4.5a2.5 2.5 0 0 1 2.5-1.5" stroke={P.white} strokeWidth={1.3} strokeLinecap="round" fill="none" />
      </g>
    </>
  ),
  raccoon: () => (
    <>
      <circle cx={11} cy={12} r={6} {...solid(G.shade)} />
      <circle cx={37} cy={12} r={6} {...solid(G.shade)} />
      <circle cx={11.5} cy={12.5} r={2.6} fill={G.ink} />
      <circle cx={36.5} cy={12.5} r={2.6} fill={G.ink} />
      <path d="M6 27C6 15 14 9 24 9S42 15 42 27L46 31L41 32C38 38 32 41 24 41S10 38 7 32L2 31Z" {...solid(G.mid)} />
      <path d="M24 9.5C22 12 22 17 24 21C26 17 26 12 24 9.5Z" fill={G.shade} />
      <path d="M7 25C10 18 18 19 24 23C30 19 38 18 41 25C38 31 30 31 24 27.5C18 31 10 31 7 25Z" fill={G.ink} />
      <ellipse cx={16.5} cy={18} rx={4} ry={1.6} fill={G.fill} />
      <ellipse cx={31.5} cy={18} rx={4} ry={1.6} fill={G.fill} />
      <circle cx={16} cy={25} r={3.3} fill={G.fill} />
      <circle cx={32} cy={25} r={3.3} fill={G.fill} />
      <circle cx={17} cy={25.4} r={1.6} fill={G.ink} />
      <circle cx={33} cy={25.4} r={1.6} fill={G.ink} />
      <circle cx={17.6} cy={24.6} r={0.6} fill={P.white} />
      <circle cx={33.6} cy={24.6} r={0.6} fill={P.white} />
      <ellipse cx={24} cy={34} rx={8} ry={5.5} fill={G.fill} stroke={G.ink} strokeWidth={1.6} />
      <ellipse cx={24} cy={31.6} rx={3} ry={2.1} fill={G.ink} />
      <path d="M21 36.5q3 2 7-.8" {...thin} />
    </>
  ),
  scales: ({ accent }) => (
    <>
      <path d="M14 45H34L30 39H18Z" {...solid(G.mid)} />
      <rect x={22.4} y={9} width={3.2} height={31} rx={1.2} {...solid(G.fill)} strokeWidth={1.8} />
      <path d="M7 14.5L41 10" {...line} strokeWidth={1} />
      <Tube d="M7 14.5L41 10" w={2.4} />
      <circle cx={24} cy={8} r={3} {...solid(accent)} strokeWidth={1.8} />
      <path d="M7 14.5L2 30M7 14.5L13 30M41 10L35.5 25M41 10L46.5 25" {...thin} strokeWidth={1.1} />
      <circle cx={7.5} cy={27.5} r={3.4} fill={G.shade} stroke={G.ink} strokeWidth={1.4} />
      <circle cx={7.5} cy={27.5} r={1} fill={G.ink} />
      <path d="M0.5 30H14.5Q13 36 7.5 36Q2 36 0.5 30Z" {...solid(G.fill)} strokeWidth={2} />
      <path d="M40 22q2-3 4-1" {...thin} strokeWidth={1.1} />
      <path d="M34 25H48Q46.5 31 41 31Q35.5 31 34 25Z" {...solid(G.fill)} strokeWidth={2} />
    </>
  ),
  cat: () => (
    <>
      <path d="M10 23L8 6L21 15Z" {...solid(G.mid)} />
      <path d="M38 23L40 6L27 15Z" {...solid(G.mid)} />
      <path d="M11.5 18L10.5 10L17 14.5Z" fill={P.blush} />
      <path d="M36.5 18L37.5 10L31 14.5Z" fill={P.blush} />
      <path d="M8 30C8 20 14 14 24 14S40 20 40 30C40 38 33 42 24 42S8 38 8 30Z" {...solid(G.fill)} />
      <path d="M36 21C40 27 40 36 33 40C28 42.5 21 42.5 17 41C30 40 36 34 36 21Z" fill={G.shade} />
      <path d="M20.5 15.5l1 3.5M24 15v4M27.5 15.5l-1 3.5" {...thin} strokeWidth={1.3} />
      <path d="M12 26.5Q16.5 31.5 21 26.5Z" fill={P.white} stroke={G.ink} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M27 26.5Q31.5 31.5 36 26.5Z" fill={P.white} stroke={G.ink} strokeWidth={1.4} strokeLinejoin="round" />
      <ellipse cx={18.6} cy={27.8} rx={1} ry={1.4} fill={G.ink} />
      <ellipse cx={33.6} cy={27.8} rx={1} ry={1.4} fill={G.ink} />
      <path d="M11 26.2H22M26 26.2H37" {...line} strokeWidth={2.2} />
      <path d="M12 23l7 1.2M36 23l-7 1.2" {...thin} strokeWidth={1.3} />
      <path d="M22.5 32h3L24 34Z" fill={P.blush} stroke={G.ink} strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M20 35.5q2 2 4 0q2.5 2 5.5-1.2" {...thin} strokeWidth={1.4} />
      <path d="M13 33L3 31.5M13 35.5L4 37.5M35 33L45 31.5M35 35.5L44 37.5" {...thin} strokeWidth={1} />
    </>
  ),
  coin: ({ accent }) => (
    <>
      <path d="M8 46C6 38 8 32 14 28" {...line} strokeWidth={1.6} strokeDasharray="2 3" />
      <path d="M38 6.5a14 14 0 0 1 6 9M44 15.5l.4-3.6M44 15.5l-3.2-1.6" {...line} strokeWidth={1.6} />
      <path d="M6 18.5a14 14 0 0 1 4-8.5M10 10l-3.5.5M10 10l-.4 3.5" {...line} strokeWidth={1.6} />
      <g transform="translate(25 22) rotate(-24) scale(1 0.62)">
        <circle cx={0} cy={6} r={14} {...solid(G.shade)} />
        <rect x={-14} y={0} width={28} height={6} fill={G.shade} />
        <path d="M-14 0V6M14 0V6" {...line} />
        <circle cx={0} cy={0} r={14} {...solid(G.fill)} />
        <circle cx={0} cy={0} r={10} fill="none" stroke={G.ink} strokeWidth={1.2} strokeDasharray="1.4 1.6" />
        <path d="M0 -7.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7Z" fill={accent} stroke={G.ink} strokeWidth={1.3} strokeLinejoin="round" />
      </g>
      <path d="M40 30l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1Z" fill={G.fill} />
      <path d="M33 40l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7Z" fill={G.fill} />
    </>
  ),
  rope: () => (
    <>
      <rect x={12} y={2} width={24} height={5} rx={2.2} {...solid(G.shade)} strokeWidth={2} />
      <path d="M24 33Q19 38 14 41M24 33Q21 39 19 44.5M24 33Q25 39 25.5 45.5M24 33Q28 38 32 42.5M24 33Q29 36 35 37" fill="none" stroke={G.ink} strokeWidth={4.4} strokeLinecap="round" />
      <path d="M24 33Q19 38 14 41M24 33Q21 39 19 44.5M24 33Q25 39 25.5 45.5M24 33Q28 38 32 42.5M24 33Q29 36 35 37" fill="none" stroke={G.fill} strokeWidth={2} strokeLinecap="round" />
      <Tube d="M24 7C17 13 31 19 24 26Q22.5 29 24 33" w={7.5} dash="2.6 2.6" />
      <path d="M20 31.5Q24 34 28 31.5" {...line} strokeWidth={1.8} />
      <path d="M36 23l4-1M35.5 29l4 1.5M12 23l-4-1M12.5 29l-4 1.5" {...thin} strokeWidth={1.4} />
    </>
  ),
  trident: ({ accent }) => (
    <>
      <Tube d="M24 12V46" w={3.2} />
      <Tube d="M11 10V15Q11 21 24 21Q37 21 37 15V10" w={3} />
      <path d="M7 12L11 2L15 12Z" {...solid(G.fill)} />
      <path d="M33 12L37 2L41 12Z" {...solid(G.fill)} />
      <path d="M19.5 10L24 -1L28.5 10Z" {...solid(G.fill)} />
      <rect x={20.5} y={23} width={7} height={6} rx={1.4} fill={accent} stroke={G.ink} strokeWidth={1.8} />
      <path d="M20.5 26H27.5" {...thin} strokeWidth={1.1} />
      <path d="M23 13v6" stroke={P.white} strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
    </>
  ),
  stopwatch: ({ accent }) => (
    <>
      <path d="M2 23h5M1 29h6M3 35h5" {...thin} />
      <rect x={21} y={4} width={6} height={4.6} rx={1.4} {...solid(G.mid)} strokeWidth={1.8} />
      <rect x={22.6} y={8.6} width={2.8} height={3} fill={G.mid} stroke={G.ink} strokeWidth={1.4} />
      <g transform="rotate(42 24 28)">
        <rect x={22.2} y={7} width={3.6} height={5} rx={1} {...solid(G.mid)} strokeWidth={1.6} />
      </g>
      <circle cx={24} cy={28} r={16} {...solid(G.fill)} />
      <path d="M35 17a16 16 0 0 1-8 26.7A16 16 0 0 0 35 17Z" fill={G.shade} />
      <circle cx={24} cy={28} r={11.6} fill={P.white} stroke={G.ink} strokeWidth={1.4} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r0 = i % 3 === 0 ? 8.2 : 9.6;
        return (
          <path
            key={i}
            d={`M${r2(24 + Math.sin(a) * r0)} ${r2(28 - Math.cos(a) * r0)}L${r2(24 + Math.sin(a) * 11)} ${r2(28 - Math.cos(a) * 11)}`}
            stroke={G.ink}
            strokeWidth={i % 3 === 0 ? 1.4 : 0.9}
            strokeLinecap="round"
          />
        );
      })}
      <path d="M24 28A9 9 0 0 1 32.3 24.5" fill="none" stroke={accent} strokeWidth={2.4} opacity={0.9} />
      <path d="M24 28L31 22" {...line} strokeWidth={2} />
      <circle cx={24} cy={28} r={1.8} fill={G.ink} />
    </>
  ),
  crown: ({ accent }) => (
    <g transform="rotate(-7 24 26)">
      <path d="M7 38L4 14L14 24L24 8L34 24L44 14L41 38Z" {...solid(G.fill)} />
      <path d="M24 8L34 24L44 14L41 38H30C34 30 33 20 24 8Z" fill={G.shade} />
      <path d="M7 38L4 14L14 24L24 8L34 24L44 14L41 38Z" {...line} />
      <rect x={6} y={32} width={36} height={8} rx={1.6} {...solid(G.mid)} />
      <circle cx={4} cy={13} r={2.6} {...solid(G.fill)} strokeWidth={1.8} />
      <circle cx={24} cy={7} r={2.8} {...solid(G.fill)} strokeWidth={1.8} />
      <circle cx={44} cy={13} r={2.6} {...solid(G.fill)} strokeWidth={1.8} />
      <circle cx={14} cy={36} r={2} fill={accent} stroke={G.ink} strokeWidth={1.3} />
      <path d="M24 33l3 3-3 3-3-3Z" fill={accent} stroke={G.ink} strokeWidth={1.3} strokeLinejoin="round" />
      <circle cx={34} cy={36} r={2} fill={accent} stroke={G.ink} strokeWidth={1.3} />
      <path d="M9.5 21l1.3 9" stroke={P.white} strokeWidth={1.4} strokeLinecap="round" opacity={0.85} />
    </g>
  ),
  pizza: () => (
    <>
      <path d="M7 13L24 45L30 34A3.4 3.4 0 0 1 33.5 27.6A3.4 3.4 0 0 1 37 21.2L41 13Z" {...solid(P.pizzaCheese)} />
      <path d="M24 45L30 34A3.4 3.4 0 0 1 33.5 27.6A3.4 3.4 0 0 1 37 21.2L39 17C33 26 28 36 24 45Z" fill={P.pizzaCrust} opacity={0.45} />
      <path d="M7 13L24 45L30 34A3.4 3.4 0 0 1 33.5 27.6A3.4 3.4 0 0 1 37 21.2L41 13Z" {...line} />
      <path d="M17 31Q17.5 36 19.4 36.4Q21 36.6 20.6 34" fill={P.pizzaCheese} stroke={G.ink} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <path d="M4.5 11.5C14 4.5 34 4.5 43.5 11.5C44 14 42.5 16.5 41 15.6C32 10.5 16 10.5 7 15.6C5.5 16.5 4 14 4.5 11.5Z" {...solid(P.pizzaCrust)} />
      <path d="M12 9.5q2-1 4-1.2M31 8.4q2 .3 4 1.1" stroke={P.ivory} strokeWidth={1.3} strokeLinecap="round" fill="none" opacity={0.8} />
      <circle cx={17} cy={20} r={3.4} fill={P.pepperoni} stroke={G.ink} strokeWidth={1.6} />
      <circle cx={28.5} cy={19.5} r={3} fill={P.pepperoni} stroke={G.ink} strokeWidth={1.6} />
      <circle cx={23} cy={30} r={2.7} fill={P.pepperoni} stroke={G.ink} strokeWidth={1.6} />
      <circle cx={16.2} cy={19.2} r={0.8} fill={P.ivory} opacity={0.7} />
    </>
  ),
};

function Padlock() {
  return (
    <g transform={`translate(${CX} ${CY + 2})`}>
      <path d="M-8.5 -2V-9C-8.5 -20 8.5 -20 8.5 -9V-2" fill="none" stroke={P.outline} strokeWidth={8} strokeLinecap="round" />
      <path d="M-8.5 -2V-9C-8.5 -20 8.5 -20 8.5 -9V-2" fill="none" stroke={P.catGrey} strokeWidth={3.6} strokeLinecap="round" />
      <rect x={-14} y={-4} width={28} height={22} rx={4.5} fill={P.pigeonGrey} stroke={P.outline} strokeWidth={STROKE} />
      <path d="M-11 12H11V13.5Q11 15 9.5 15H-9.5Q-11 15 -11 13.5Z" fill={P.pigeonDark} />
      <path d="M-10 0h7" stroke={P.white} strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
      <circle cx={0} cy={5} r={3.2} fill={P.outline} />
      <path d="M-1.4 6.5L-2.2 12H2.2L1.4 6.5Z" fill={P.outline} />
    </g>
  );
}

const ICON_LABEL: Record<AchievementIcon, string> = {
  quill: "a quill signing a confession",
  handcuffs: "handcuffs",
  "skull-wig": "a skull in a powdered wig",
  halo: "a suspiciously innocent halo",
  wanted: "a wanted poster",
  briefcase: "a lawyer's briefcase",
  pinocchio: "a long-nosed liar",
  rocket: "a rocket",
  megaphone: "a megaphone",
  gavel: "a gavel",
  stamp: "a DENIED stamp",
  raccoon: "a raccoon",
  scales: "the scales of justice",
  cat: "a smug cat",
  coin: "a coin flip",
  rope: "a frayed rope",
  trident: "a trident",
  stopwatch: "a stopwatch",
  crown: "a crown",
  pizza: "a slice of pizza",
};

/* ------------------------------------------------------------------ */
/*  Badge                                                              */
/* ------------------------------------------------------------------ */

export function AchievementBadge({ icon, tier, locked = false, className, title }: AchievementBadgeProps) {
  const uid = useId().replace(/:/g, "");
  const style = TIER_STYLE[tier];
  const label = title ?? `${locked ? "Locked " : ""}${style.label} badge: ${ICON_LABEL[icon]}`;
  const id = (s: string) => `bdg-${s}-${uid}`;
  const isLegendary = tier === "legendary";
  const metal = isLegendary ? `url(#${id("irid")})` : style.ring;
  const ribbon = RIBBON[tier];
  const glyph = GLYPHS[icon]({ accent: style.ring, disc: style.fill });

  const classes = ["bdg", `bdg--${tier}`, locked ? "bdg--locked" : "bdg--unlocked", className].filter(Boolean).join(" ");

  return (
    <svg viewBox="0 0 120 140" role="img" aria-label={label} className={classes} xmlns="http://www.w3.org/2000/svg">
      <title>{label}</title>
      <defs>
        <linearGradient id={id("sheen")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={P.white} stopOpacity={0.6} />
          <stop offset="0.42" stopColor={P.white} stopOpacity={0} />
          <stop offset="0.58" stopColor={P.outline} stopOpacity={0} />
          <stop offset="1" stopColor={P.outline} stopOpacity={0.42} />
        </linearGradient>
        <radialGradient id={id("disc")} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor={P.white} stopOpacity={0.18} />
          <stop offset="0.6" stopColor={P.white} stopOpacity={0} />
          <stop offset="1" stopColor={P.outline} stopOpacity={0.35} />
        </radialGradient>
        {isLegendary ? (
          <linearGradient id={id("irid")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={P.tear} />
            <stop offset="0.3" stopColor={style.ring} />
            <stop offset="0.55" stopColor={P.blush} />
            <stop offset="0.75" stopColor={style.ring} />
            <stop offset="1" stopColor={P.goldLight} />
          </linearGradient>
        ) : null}
        <clipPath id={id("clip")}>
          <path d={ROSETTE} />
        </clipPath>
        {locked ? (
          <filter id={id("grey")} colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
          </filter>
        ) : null}
      </defs>

      <g filter={locked ? `url(#${id("grey")})` : undefined} opacity={locked ? 0.55 : 1}>
        {/* ribbon tails */}
        <g stroke={P.outline} strokeWidth={STROKE} strokeLinejoin="round">
          <path d="M46 86L30 134L39 128L44 137L58 92Z" fill={ribbon} />
          <path d="M74 86L90 134L81 128L76 137L62 92Z" fill={ribbon} />
          <path d="M49 92L37 128M71 92L83 128" stroke={style.ring} strokeWidth={3} strokeLinecap="round" />
          <path d="M52 94L42 128.5M68 94L78 128.5" stroke={P.outline} strokeWidth={1} opacity={0.35} />
          <path d="M44 94L56 96L52 108Z" fill={P.outline} stroke="none" opacity={0.25} />
          <path d="M76 94L64 96L68 108Z" fill={P.outline} stroke="none" opacity={0.25} />
        </g>

        {/* rosette */}
        <path d={ROSETTE} fill={metal} />
        <path d={ROSETTE} fill={`url(#${id("sheen")})`} />
        <path d={PLEATS} stroke={P.outline} strokeWidth={1.4} strokeLinecap="round" opacity={0.45} />
        <path d={ROSETTE} fill="none" stroke={P.outline} strokeWidth={STROKE} strokeLinejoin="round" />

        {/* band */}
        <circle cx={CX} cy={CY} r={39.5} fill={metal} stroke={P.outline} strokeWidth={2.6} />
        <circle cx={CX} cy={CY} r={39.5} fill={`url(#${id("sheen")})`} />
        <circle
          cx={CX}
          cy={CY}
          r={36}
          fill="none"
          stroke={P.white}
          strokeWidth={2.2}
          strokeDasharray="0 5.65"
          strokeLinecap="round"
          opacity={0.75}
        />
        <path
          d={`M${CX - 37} ${CY - 6}A37.5 37.5 0 0 1 ${CX - 8} ${CY - 37}`}
          fill="none"
          stroke={P.white}
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.7}
        />

        {/* inner disc */}
        <circle cx={CX} cy={CY} r={32} fill={style.fill} stroke={P.outline} strokeWidth={2.6} />
        <circle cx={CX} cy={CY} r={32} fill={`url(#${id("disc")})`} />
        <circle cx={CX} cy={CY} r={29.4} fill="none" stroke={style.ring} strokeWidth={0.9} opacity={0.55} />

        {/* glyph */}
        <g transform={`translate(${CX - 24 * GLYPH_SCALE} ${CY - 24 * GLYPH_SCALE}) scale(${GLYPH_SCALE})`} opacity={locked ? 0.35 : 1}>
          {glyph}
        </g>

        {/* specular glints */}
        <path d="M24 33Q28 22 36 16" fill="none" stroke={P.white} strokeWidth={2.4} strokeLinecap="round" opacity={0.7} />

        {/* unlock sweep (parked off-medal; animated by .bdg-unlock) */}
        {!locked ? (
          <g clipPath={`url(#${id("clip")})`}>
            <g transform="rotate(20 60 58)">
              <rect
                className="bdg-sweep"
                x={-40}
                y={-10}
                width={18}
                height={150}
                fill={P.white}
                opacity={0.55}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            </g>
          </g>
        ) : null}
      </g>

      {locked ? (
        <Padlock />
      ) : (
        <g className="bdg-shine" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <path d={sparklePath(25, 21, 9)} fill={P.ivory} stroke={P.outline} strokeWidth={1.4} strokeLinejoin="round" />
          <path d={sparklePath(97, 84, 5)} fill={P.ivory} stroke={P.outline} strokeWidth={1.2} strokeLinejoin="round" />
          <circle cx={100} cy={22} r={1.8} fill={P.ivory} />
        </g>
      )}
    </svg>
  );
}
