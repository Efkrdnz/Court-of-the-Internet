import { useId, type ReactNode } from "react";
import { P, STROKE } from "../palette";

export type WaxSealColor = "burgundy" | "gold" | "teal";
export type WaxSealEmblem = "scales" | "gavel" | "pizza" | "crown";

const WAX: Record<WaxSealColor, { base: string; light: string; dark: string; text: string }> = {
  burgundy: { base: P.burgundyLight, light: "#b0384b", dark: P.burgundyDark, text: "#c45a69" },
  gold: { base: P.gold, light: P.goldLight, dark: P.goldDark, text: "#f3dc8f" },
  teal: { base: P.teal, light: P.tealLight, dark: "#123f34", text: "#5fb3a3" },
};

/** Closed Catmull-Rom spline through points, as cubic Béziers. */
function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  const f = (v: number) => v.toFixed(2);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

/** Irregular wax puddle outline (deterministic so SSR and client match). */
const BLOB = (() => {
  const pts: [number, number][] = [];
  const n = 56;
  const drips = [0.7, 2.45, 3.9, 5.3];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let r = 80 + 3.6 * Math.sin(5 * a + 0.6) + 2.6 * Math.sin(9 * a + 1.9) + 1.8 * Math.sin(14 * a + 0.3);
    for (const d0 of drips) {
      const da = Math.atan2(Math.sin(a - d0), Math.cos(a - d0));
      r += 8 * Math.exp(-(da * da) / 0.018);
    }
    pts.push([100 + r * Math.cos(a), 100 + r * Math.sin(a)]);
  }
  return smoothClosed(pts);
})();

function Emblem({ kind, c }: { kind: WaxSealEmblem; c: string }): ReactNode {
  switch (kind) {
    case "gavel":
      return (
        <g fill={c} stroke={c} strokeLinecap="round" strokeLinejoin="round">
          <g transform="rotate(-32 100 92)">
            <rect x="66" y="70" width="24" height="40" rx="6" stroke="none" />
            <rect x="62" y="76" width="32" height="6" rx="3" stroke="none" />
            <rect x="62" y="98" width="32" height="6" rx="3" stroke="none" />
            <rect x="88" y="86" width="50" height="8" rx="4" stroke="none" />
            <circle cx="140" cy="90" r="6" stroke="none" />
          </g>
          <path d="M86 128h44a4 4 0 0 1 0 8H86a4 4 0 0 1 0-8Z" stroke="none" />
        </g>
      );
    case "pizza":
      return (
        <g fill={c} stroke="none">
          <path d="M70 70Q100 58 130 70L128 79Q100 68 72 79Z" />
          <path
            fillRule="evenodd"
            d="M73 84Q100 74 127 84L100 136Z M88 92m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0Z M110 98m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0Z M98 114m-4.5 0a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0Z"
          />
        </g>
      );
    case "crown":
      return (
        <g fill={c} stroke={c} strokeLinejoin="round">
          <path d="M68 118L63 80L83 97L100 70L117 97L137 80L132 118Z" strokeWidth="2" />
          <rect x="66" y="122" width="68" height="9" rx="3" stroke="none" />
          <circle cx="63" cy="77" r="4.5" stroke="none" />
          <circle cx="100" cy="66" r="5" stroke="none" />
          <circle cx="137" cy="77" r="4.5" stroke="none" />
        </g>
      );
    default:
      return (
        <g fill={c} stroke={c} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="100" cy="72" r="4.5" stroke="none" />
          <rect x="97.5" y="74" width="5" height="50" rx="2" stroke="none" />
          <path d="M66 83Q100 76 134 83" fill="none" strokeWidth="4.5" />
          <path d="M70 84L61 106M70 84L79 106M130 84L121 106M130 84L139 106" fill="none" strokeWidth="1.8" />
          <path d="M58 106H82Q81 116 70 116Q59 116 58 106Z" stroke="none" />
          <path d="M118 106H142Q141 116 130 116Q119 116 118 106Z" stroke="none" />
          <path d="M82 132H118L112 124H88Z" stroke="none" />
        </g>
      );
  }
}

/** A pressed wax seal with an embossed emblem, raised lettered ring and glossy highlights. */
export function WaxSeal({
  className,
  color = "burgundy",
  emblem = "scales",
}: {
  className?: string;
  color?: WaxSealColor;
  emblem?: WaxSealEmblem;
}) {
  const uid = "prp" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const w = WAX[color] ?? WAX.burgundy;
  const label = `Wax seal with ${emblem} emblem`;

  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={label} className={className}>
      <title>{label}</title>
      <defs>
        <clipPath id={`${uid}-blob`}>
          <path d={BLOB} />
        </clipPath>
        <clipPath id={`${uid}-well`}>
          <circle cx="100" cy="100" r="62" />
        </clipPath>
        <path id={`${uid}-top`} d="M52.5 100A47.5 47.5 0 0 1 147.5 100" />
        <path id={`${uid}-bot`} d="M45.5 100A54.5 54.5 0 0 0 154.5 100" />
        <linearGradient id={`${uid}-shine`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-spec`}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-gloss`} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor={w.light} />
          <stop offset="0.55" stopColor={w.base} />
          <stop offset="1" stopColor={w.dark} />
        </radialGradient>
      </defs>

      {/* drop shadow */}
      <path d={BLOB} fill={P.outline} opacity="0.22" transform="translate(3 5)" />
      {/* wax body */}
      <path d={BLOB} fill={`url(#${uid}-gloss)`} />
      <g clipPath={`url(#${uid}-blob)`}>
        <path d={BLOB} fill={w.dark} opacity="0.55" />
        <circle cx="95" cy="94" r="84" fill={`url(#${uid}-gloss)`} />
        {/* squished rim ripples */}
        <circle cx="100" cy="100" r="71" fill="none" stroke={w.dark} strokeWidth="3" opacity="0.35" />
        <circle cx="99" cy="99" r="74" fill="none" stroke={w.light} strokeWidth="1.5" opacity="0.4" />
      </g>
      <path d={BLOB} fill="none" stroke={P.outline} strokeWidth={STROKE} strokeLinejoin="round" />

      {/* pressed well: shadow on the upper-left inner edge, light on the lower-right */}
      <circle cx="100" cy="100" r="62" fill={w.dark} />
      <g clipPath={`url(#${uid}-well)`}>
        <circle cx="102.4" cy="102.4" r="62" fill={w.base} />
      </g>
      <circle cx="100" cy="100" r="62" fill={w.dark} opacity="0.22" />
      <path d="M144 141A62 62 0 0 1 56 144" fill="none" stroke={w.light} strokeWidth="2" opacity="0.8" />

      {/* raised lettered ring */}
      <circle cx="100" cy="100" r="58" fill="none" stroke={w.dark} strokeWidth="1.4" transform="translate(1 1)" />
      <circle cx="100" cy="100" r="58" fill="none" stroke={w.light} strokeWidth="1.4" />
      <circle cx="100" cy="100" r="43" fill="none" stroke={w.dark} strokeWidth="1.4" transform="translate(1 1)" />
      <circle cx="100" cy="100" r="43" fill="none" stroke={w.light} strokeWidth="1.4" />
      {[
        { dx: 0.9, fill: w.dark },
        { dx: -0.6, fill: w.text },
        { dx: 0, fill: w.base },
      ].map((l, i) => (
        <g
          key={i}
          transform={`translate(${l.dx} ${l.dx})`}
          fill={l.fill}
          fontFamily='"Playfair Display", Georgia, serif'
          fontWeight="800"
          fontSize="9.5"
          letterSpacing="1.4"
        >
          <text>
            <textPath href={`#${uid}-top`} startOffset="50%" textAnchor="middle">
              COURT OF THE INTERNET
            </textPath>
          </text>
          <text>
            <textPath href={`#${uid}-bot`} startOffset="50%" textAnchor="middle">
              ★ SEALED ★
            </textPath>
          </text>
        </g>
      ))}

      {/* embossed emblem */}
      <g transform="translate(100 100) scale(0.62) translate(-100 -100)">
        <g transform="translate(3 3)">
          <Emblem kind={emblem} c={w.dark} />
        </g>
        <g transform="translate(-2 -2)">
          <Emblem kind={emblem} c={w.light} />
        </g>
        <Emblem kind={emblem} c={w.base} />
      </g>

      {/* gloss */}
      <g clipPath={`url(#${uid}-blob)`}>
        <ellipse cx="58" cy="52" rx="30" ry="11" transform="rotate(-38 58 52)" fill={`url(#${uid}-spec)`} />
        <circle cx="44" cy="76" r="3.4" fill="#fff" opacity="0.55" />
        <circle cx="76" cy="34" r="2.2" fill="#fff" opacity="0.5" />
        <path d="M26 112Q22 70 52 40" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.22" />
        <g transform="rotate(22 100 100)">
          <rect
            className="prp-seal-shine"
            x="-20"
            y="-40"
            width="44"
            height="280"
            fill={`url(#${uid}-shine)`}
            style={{ transform: "translateX(-60px)" }}
          />
        </g>
      </g>
    </svg>
  );
}
