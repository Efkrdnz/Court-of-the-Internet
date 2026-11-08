import { useId, type CSSProperties, type ReactNode } from "react";
import { P, STROKE } from "../palette";

function useUid() {
  return "prp" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * Gold metal gradient. `user` switches to user-space coordinates, which straight
 * (zero-height/width) strokes need: a bounding-box gradient paints nothing on them.
 */
function GoldDefs({ id, user }: { id: string; user?: [number, number, number, number] }) {
  const coords = user
    ? { gradientUnits: "userSpaceOnUse" as const, spreadMethod: "reflect" as const, x1: user[0], y1: user[1], x2: user[2], y2: user[3] }
    : { x1: 0, y1: 0, x2: 0, y2: 1 };
  return (
    <linearGradient id={id} {...coords}>
      <stop offset="0" stopColor={P.goldLight} />
      <stop offset="0.45" stopColor={P.gold} />
      <stop offset="1" stopColor={P.goldDark} />
    </linearGradient>
  );
}

/** One filigree stroke: dark outline, gold body, thin bright highlight. */
function Fil({ d, w = 3, gold }: { d: string; w?: number; gold: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={P.outline} strokeWidth={w < 2 ? w + 1.4 : w + 2.4} />
      <path d={d} stroke={gold} strokeWidth={w} />
      {w >= 2.5 && <path d={d} stroke={P.goldLight} strokeWidth={w * 0.3} opacity="0.75" transform="translate(-0.4 -0.4)" />}
    </g>
  );
}

const LEAF = "M0 0C5 -6 15 -6.5 22 0C15 6.5 5 6 0 0Z";

/**
 * Laurel branch leaves along a quadratic curve (left-hand branch; mirror for right).
 * Shared by `Laurel` and `Crest`.
 */
export function laurelBranch(opts: {
  p0: [number, number];
  p1: [number, number];
  p2: [number, number];
  pairs: number;
  leafScale: number;
  fill: string;
  vein?: string;
  strokeWidth?: number;
}): ReactNode {
  const { p0, p1, p2, pairs, leafScale, fill, vein = P.goldDark, strokeWidth = 2 } = opts;
  const at = (t: number) => {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  };
  const tan = (t: number) => {
    const u = 1 - t;
    const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };
  const leaves: ReactNode[] = [];
  for (let i = 0; i < pairs; i++) {
    const t = 0.1 + (i / pairs) * 0.82;
    const [x, y] = at(t);
    const a = tan(t);
    const s = leafScale * (1 - t * 0.35);
    for (const side of [-1, 1]) {
      leaves.push(
        <g key={`${i}${side}`} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(a + side * 38).toFixed(1)}) scale(${s.toFixed(3)})`}>
          <path d={LEAF} fill={fill} stroke={P.outline} strokeWidth={strokeWidth / s} strokeLinejoin="round" />
          <path d="M2 0Q11 -0.8 19 0" fill="none" stroke={vein} strokeWidth={1.2 / s} strokeLinecap="round" />
        </g>,
      );
    }
  }
  const [tx, ty] = at(1);
  const ta = tan(1);
  const st = leafScale * 0.7;
  leaves.push(
    <g key="tip" transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) rotate(${ta.toFixed(1)}) scale(${st.toFixed(3)})`}>
      <path d={LEAF} fill={fill} stroke={P.outline} strokeWidth={strokeWidth / st} strokeLinejoin="round" />
    </g>,
  );
  const stem = `M${p0[0]} ${p0[1]}Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`;
  return (
    <g>
      <path d={stem} fill="none" stroke={P.outline} strokeWidth={strokeWidth + 3} strokeLinecap="round" />
      <path d={stem} fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      {leaves}
    </g>
  );
}

const MIRROR: Record<"tl" | "tr" | "bl" | "br", string | undefined> = {
  tl: undefined,
  tr: "translate(120 0) scale(-1 1)",
  bl: "translate(0 120) scale(1 -1)",
  br: "translate(120 120) scale(-1 -1)",
};

/** Gold filigree corner flourish for framing documents. */
export function OrnateCorner({ className, position = "tl" }: { className?: string; position?: "tl" | "tr" | "bl" | "br" }) {
  const uid = useUid();
  const g = `url(#${uid}-g)`;
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Ornate gold corner flourish" className={className}>
      <title>Ornate gold corner flourish</title>
      <defs>
        <GoldDefs id={`${uid}-g`} user={[0, 0, 34, 34]} />
      </defs>
      <g transform={MIRROR[position]}>
        {/* rails */}
        <Fil d="M26 9H96" w={3} gold={g} />
        <Fil d="M9 26V96" w={3} gold={g} />
        <Fil d="M34 18H84" w={1.4} gold={g} />
        <Fil d="M18 34V84" w={1.4} gold={g} />
        {/* rail end curls */}
        <Fil d="M96 9C106 9 112 13 110.5 19.5C109.5 24 103 24 103.5 19" w={2.6} gold={g} />
        <Fil d="M9 96C9 106 13 112 19.5 110.5C24 109.5 24 103 19 103.5" w={2.6} gold={g} />
        {/* twin scrolls */}
        <Fil d="M19 19C32 33 50 31 55 21C58.5 13.5 50.5 9.5 46.5 15C44 19 48 22.5 50.5 20" w={3} gold={g} />
        <Fil d="M19 19C33 32 31 50 21 55C13.5 58.5 9.5 50.5 15 46.5C19 44 22.5 48 20 50.5" w={3} gold={g} />
        {/* diagonal leaf + berries */}
        <path d="M22 22C32 25 42 33 47 47C33 42 25 32 22 22Z" fill={g} stroke={P.outline} strokeWidth="2" strokeLinejoin="round" />
        <path d="M25 25L43 43" stroke={P.goldDark} strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="52" cy="40" r="3" fill={P.goldLight} stroke={P.outline} strokeWidth="1.6" />
        <circle cx="40" cy="52" r="3" fill={P.goldLight} stroke={P.outline} strokeWidth="1.6" />
        <circle cx="70" cy="18" r="2.2" fill={P.goldLight} stroke={P.outline} strokeWidth="1.4" />
        <circle cx="18" cy="70" r="2.2" fill={P.goldLight} stroke={P.outline} strokeWidth="1.4" />
        {/* corner jewel */}
        <circle cx="12" cy="12" r="8" fill={g} stroke={P.outline} strokeWidth="2.2" />
        <path d="M12 6.5L17.5 12L12 17.5L6.5 12Z" fill={P.burgundy} stroke={P.outline} strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="10.5" cy="10.5" r="1.3" fill={P.white} opacity="0.6" />
      </g>
    </svg>
  );
}

/** Wide horizontal divider with a central jewelled diamond bearing tiny scales. */
export function FlourishDivider({ className }: { className?: string }) {
  const uid = useUid();
  const g = `url(#${uid}-g)`;
  const half = (
    <g>
      <path d="M224 22.4L384 23.5L394 24L384 24.5L224 25.6Z" fill={g} stroke={P.outline} strokeWidth="1.4" strokeLinejoin="round" />
      <Fil d="M216 24C226 11 246 9 253 18C257.5 24 252 30 247 27C243.5 25 245 21 248.5 21.5" w={2.6} gold={g} />
      <Fil d="M216 24C230 36 256 38 276 30C284 27 292 27 298 30" w={2} gold={g} />
      <Fil d="M276 18C286 13 296 15 300 21" w={1.6} gold={g} />
      <path d="M336 24L341 19.5L346 24L341 28.5Z" fill={g} stroke={P.outline} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="312" cy="24" r="2.4" fill={P.goldLight} stroke={P.outline} strokeWidth="1.3" />
      <circle cx="366" cy="24" r="1.8" fill={P.goldLight} stroke={P.outline} strokeWidth="1.2" />
    </g>
  );
  return (
    <svg viewBox="0 0 400 48" role="img" aria-label="Ornamental divider" className={className}>
      <title>Ornamental divider</title>
      <defs>
        <GoldDefs id={`${uid}-g`} />
      </defs>
      {half}
      <g transform="translate(400 0) scale(-1 1)">{half}</g>
      {/* central diamond */}
      <path d="M200 4L220 24L200 44L180 24Z" fill={g} stroke={P.outline} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M200 10L214 24L200 38L186 24Z" fill={P.burgundy} stroke={P.outline} strokeWidth="1.4" strokeLinejoin="round" />
      <g stroke={P.goldLight} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M200 17V31M196.5 31H203.5M192.5 20.5H207.5" strokeWidth="1.5" />
        <path d="M191 25.5A2 1.5 0 0 0 195 25.5ZM205 25.5A2 1.5 0 0 0 209 25.5Z" strokeWidth="1.2" fill={P.goldLight} />
        <path d="M193 20.5L191 25.5M193 20.5L195 25.5M207 20.5L205 25.5M207 20.5L209 25.5" strokeWidth="0.8" />
      </g>
      <circle cx="200" cy="15.5" r="1.3" fill={P.goldLight} />
    </svg>
  );
}

/** A gold laurel branch. */
export function Laurel({ className, side = "left" }: { className?: string; side?: "left" | "right" }) {
  const uid = useUid();
  return (
    <svg viewBox="0 0 80 160" role="img" aria-label="Gold laurel branch" className={className}>
      <title>Gold laurel branch</title>
      <defs>
        <GoldDefs id={`${uid}-g`} />
      </defs>
      <g transform={side === "right" ? "translate(80 0) scale(-1 1)" : undefined}>
        {laurelBranch({ p0: [56, 150], p1: [4, 96], p2: [42, 18], pairs: 7, leafScale: 0.95, fill: `url(#${uid}-g)` })}
      </g>
    </svg>
  );
}

const TILT = { left: -8, right: 8, level: 0 } as const;

/** Scales of justice. The beam (`prp-scales-beam`) sways gently around its tilt when motion is allowed. */
export function Scales({ className, tilt = "level" }: { className?: string; tilt?: "left" | "right" | "level" }) {
  const uid = useUid();
  const g = `url(#${uid}-g)`;
  const deg = TILT[tilt] ?? 0;
  const o = { stroke: P.outline, strokeWidth: STROKE, strokeLinejoin: "round" as const };
  const label = tilt === "level" ? "Balanced scales of justice" : `Scales of justice tipping ${tilt}`;
  const beamStyle = {
    transformBox: "view-box",
    transformOrigin: "100px 50px",
    transform: `rotate(${deg}deg)`,
    "--prp-tilt": `${deg}deg`,
  } as CSSProperties;
  const panStyle = {
    transformBox: "fill-box",
    transformOrigin: "50% 3px",
    transform: `rotate(${-deg}deg)`,
    "--prp-tilt": `${deg}deg`,
  } as CSSProperties;

  const pan = (cx: number) => (
    <g className="prp-scales-pan" style={panStyle}>
      <path
        d={`M${cx} 52L${cx - 23} 112M${cx} 52L${cx + 23} 112`}
        stroke={P.outline}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path d={`M${cx} 52L${cx - 23} 112M${cx} 52L${cx + 23} 112`} stroke={P.goldLight} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx={cx} cy="52" r="3" fill={g} stroke={P.outline} strokeWidth="2" />
      <path d={`M${cx - 26} 112H${cx + 26}C${cx + 24} 128 ${cx + 12} 134 ${cx} 134C${cx - 12} 134 ${cx - 24} 128 ${cx - 26} 112Z`} fill={g} {...o} />
      <path d={`M${cx - 18} 118Q${cx - 14} 126 ${cx - 4} 128`} stroke={P.white} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.45" />
    </g>
  );

  return (
    <svg viewBox="0 0 200 190" role="img" aria-label={label} className={className}>
      <title>{label}</title>
      <defs>
        <GoldDefs id={`${uid}-g`} />
        <linearGradient id={`${uid}-gh`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={P.goldDark} />
          <stop offset="0.35" stopColor={P.goldLight} />
          <stop offset="0.7" stopColor={P.gold} />
          <stop offset="1" stopColor={P.goldDark} />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="180" rx="50" ry="5" fill={P.shadow} />
      {/* pedestal + pillar */}
      <path d="M62 178H138L130 164H70Z" fill={g} {...o} />
      <rect x="76" y="156" width="48" height="9" rx="3" fill={`url(#${uid}-gh)`} {...o} />
      <rect x="95" y="44" width="10" height="114" rx="3" fill={`url(#${uid}-gh)`} {...o} />
      <rect x="90" y="132" width="20" height="7" rx="3" fill={g} {...o} strokeWidth="2.2" />
      <rect x="91" y="88" width="18" height="6" rx="3" fill={g} {...o} strokeWidth="2.2" />

      <g className="prp-scales-beam" style={beamStyle}>
        <path d="M30 47.5Q100 41 170 47.5V53.5Q100 47 30 53.5Z" fill={g} {...o} />
        <circle cx="28" cy="50.5" r="5" fill={g} {...o} strokeWidth="2.2" />
        <circle cx="172" cy="50.5" r="5" fill={g} {...o} strokeWidth="2.2" />
        {pan(28)}
        {pan(172)}
      </g>
      {/* hub + finial */}
      <circle cx="100" cy="50" r="10" fill={g} {...o} />
      <circle cx="100" cy="50" r="4" fill={P.burgundy} stroke={P.outline} strokeWidth="1.6" />
      <path d="M100 40V30" stroke={P.outline} strokeWidth="5" strokeLinecap="round" />
      <path d="M100 40V30" stroke={P.gold} strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="26" r="5" fill={g} {...o} strokeWidth="2.2" />
    </svg>
  );
}
