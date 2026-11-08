import { P, STROKE } from "../palette";

export type JudgeOwlMood = "stern" | "shocked" | "sleepy";

const ol = {
  stroke: P.outline,
  strokeWidth: STROKE,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;
const SHADE = "rgba(26,15,18,0.2)";

/** Horizontal sausage curl, the building block of a full-bottomed wig. */
function Roll({ x, y, w, h, curl }: { x: number; y: number; w: number; h: number; curl: "l" | "r" }) {
  const r = h / 2;
  const d = `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const dir = curl === "l" ? 1 : -1;
  const sw = curl === "l" ? 1 : 0;
  const cx = curl === "l" ? x + r - 2 : x + w - r + 2;
  const cy = y + r + 1;
  const spiral = `M${cx} ${cy}a2.5 2.5 0 0 ${sw} ${5 * dir} 0a5 5 0 0 ${sw} ${-10 * dir} 0a7.5 7.5 0 0 ${sw} ${15 * dir} 0`;
  return (
    <g>
      <path d={d} fill={P.wig} {...ol} />
      <path d={`M${x + r * 0.9} ${y + h - 5}H${x + w - r * 0.9}`} stroke={P.wigShade} strokeWidth={4} strokeLinecap="round" />
      <path d={`M${x + w * 0.42} ${y + 5}H${x + w * 0.62}`} stroke={P.white} strokeWidth={2.5} strokeLinecap="round" />
      <path d={spiral} fill="none" stroke={P.outline} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
    </g>
  );
}

/** A lace frill tier: straight top edge, scalloped bottom edge. */
function frill(xl: number, xr: number, top: number, xb: number, bot: number, n: number) {
  const xbr = 240 - xb;
  const w = (xbr - xb) / n;
  let d = `M${xl} ${top}Q120 ${top + 8} ${xr} ${top}L${xbr} ${bot}`;
  for (let i = 0; i < n; i++) d += `q${-w / 2} ${7} ${-w} 0`;
  return `${d}Z`;
}

/** Eyelid: the segment of an eye circle above the chord between two angles (degrees, y-down). */
function lid(cx: number, cy: number, r: number, a1: number, a2: number) {
  const rad = (a: number) => (a * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(a1));
  const y1 = cy + r * Math.sin(rad(a1));
  const x2 = cx + r * Math.cos(rad(a2));
  const y2 = cy + r * Math.sin(rad(a2));
  let sweep = a2 - a1;
  while (sweep < 0) sweep += 360;
  const large = sweep > 180 ? 1 : 0;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}Z`;
}

function Eye({ cx, cy, mood, side }: { cx: number; cy: number; mood: JudgeOwlMood; side: "l" | "r" }) {
  const r = mood === "shocked" ? 19 : 16;
  const ir = mood === "shocked" ? 8 : 10.5;
  const pr = mood === "shocked" ? 3 : 5.5;
  const py = mood === "sleepy" ? cy + 5 : cy + 2;
  const px = cx + (side === "l" ? 1.5 : -1.5);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={P.ivory} {...ol} />
      <circle cx={px} cy={py} r={ir} fill={P.goldLight} stroke={P.goldDark} strokeWidth={2} />
      <circle cx={px} cy={py} r={pr} fill={P.black} />
      <circle cx={px - ir * 0.35} cy={py - ir * 0.4} r={mood === "shocked" ? 1.8 : 2.6} fill={P.white} />
      {mood === "stern" &&
        (side === "l" ? (
          <path d={lid(cx, cy, r, 196, 12)} fill={P.owlBrown} {...ol} />
        ) : (
          <path d={lid(cx, cy, r, 168, 344)} fill={P.owlBrown} {...ol} />
        ))}
      {mood === "sleepy" && (
        <>
          <path d={lid(cx, cy, r, 166, 14)} fill={P.owlBrown} {...ol} />
          <path
            d={side === "l" ? `M${cx - 12} ${cy + 6}l-4 4M${cx - 4} ${cy + 8}l-2 5` : `M${cx + 12} ${cy + 6}l4 4M${cx + 4} ${cy + 8}l2 5`}
            stroke={P.outline}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
}

export function JudgeOwl({
  className,
  mood = "stern",
  title,
}: {
  className?: string;
  mood?: JudgeOwlMood;
  title?: string;
}) {
  const label = title ?? "The Honourable Judge Owl, in an enormous powdered wig, gavel raised";
  const shocked = mood === "shocked";
  const sleepy = mood === "sleepy";

  const leftRolls = [0, 1, 2, 3, 4, 5].map((i) => {
    const w = 40 + i * 3;
    const x = 38 - i * 3 + (i % 2) * 4;
    return { x, y: 70 + i * 22, w, h: 26 };
  });

  const brows = {
    stern: [
      "M74 80C90 72 106 78 119 92C104 88 90 88 76 88Z",
      "M166 80C150 72 134 78 121 92C136 88 150 88 164 88Z",
    ],
    shocked: [
      "M78 72C88 60 106 60 116 68C106 68 92 70 80 78Z",
      "M162 72C152 60 134 60 124 68C134 68 148 70 160 78Z",
    ],
    sleepy: [
      "M78 86C90 82 106 82 117 86C106 88 92 90 78 92Z",
      "M162 86C150 82 134 82 123 86C134 88 148 90 162 92Z",
    ],
  }[mood];

  return (
    <svg
      viewBox="0 0 240 260"
      role="img"
      aria-label={label}
      className={["chr-root chr-owl", className].filter(Boolean).join(" ")}
      width="100%"
      overflow="visible"
    >
      <title>{label}</title>
      <ellipse cx={120} cy={249} rx={82} ry={8} fill={P.shadow} />
      <g className="chr-figure">

        <g className="chr-bob" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
          {/* talons */}
          {[98, 142].map((fx) => (
            <g key={fx}>
              <path
                d={`M${fx - 12} 238C${fx - 15} 246 ${fx - 11} 252 ${fx - 7} 249C${fx - 4} 253 ${fx + 2} 253 ${fx + 3} 249C${fx + 6} 253 ${fx + 12} 251 ${fx + 11} 244L${fx + 8} 237Z`}
                fill={P.beak}
                {...ol}
              />
              <path d={`M${fx - 7} 249l-1 3M${fx + 3} 249v3.5M${fx + 11} 247l1.5 3`} stroke={P.outline} strokeWidth={2.5} strokeLinecap="round" />
            </g>
          ))}

          {/* robe */}
          <path
            d="M70 160C74 148 96 142 120 142C144 142 166 148 170 160C180 190 186 220 188 242Q120 254 52 242C54 220 60 190 70 160Z"
            fill={P.charcoal}
            {...ol}
          />
          <path d="M150 150C168 176 176 214 177 246Q184 244 186 242C184 218 178 188 168 160C164 152 158 150 150 150Z" fill={P.black} />
          <path d="M120 186V247M96 196C92 214 90 230 90 246M146 196C150 214 152 230 152 246" stroke={P.plum} strokeWidth={2} strokeLinecap="round" opacity={0.8} fill="none" />
          <path d="M70 160C80 180 82 200 78 222" stroke={P.plum} strokeWidth={2} strokeLinecap="round" opacity={0.6} fill="none" />

          {/* wig: side cascades (behind head) */}
          {leftRolls.map((r, i) => (
            <Roll key={`l${i}`} {...r} curl="l" />
          ))}
          {leftRolls.map((r, i) => (
            <Roll key={`r${i}`} x={240 - r.x - r.w} y={r.y} w={r.w} h={r.h} curl="r" />
          ))}

          {/* velvet facings down the robe front */}
          <path d="M102 150L113 152L109 247L97 246Z" fill={P.burgundy} {...ol} strokeWidth={2.5} />
          <path d="M138 150L127 152L131 247L143 246Z" fill={P.burgundy} {...ol} strokeWidth={2.5} />

          {/* jabot: three tiers of lace frills */}
          <path d={frill(106, 134, 172, 120, 192, 4)} fill={P.white} {...ol} />
          <path d={frill(100, 140, 158, 102, 178, 5)} fill={P.white} {...ol} />
          <path d={frill(102, 138, 145, 100, 164, 5)} fill={P.white} {...ol} />
          <path d="M108 154Q114 158 120 156Q126 158 132 154M106 168Q113 172 120 170Q127 172 134 168" stroke={P.wigShade} strokeWidth={2} fill="none" strokeLinecap="round" />
          <path d="M116 148Q120 151 124 148L122 155H118Z" fill={P.wigShade} />

          {/* left wing holding a tiny law book */}
          <path
            d="M80 156C62 162 52 186 56 206C58 218 74 220 86 212L104 204L100 188L78 194C76 180 80 168 88 160Z"
            fill={P.charcoal}
            {...ol}
          />
          <g transform="rotate(-8 112 204)">
            <rect x={96} y={192} width={32} height={24} rx={3} fill={P.burgundy} {...ol} />
            <path d="M99 195H125V213H99Z" fill="none" stroke={P.goldLight} strokeWidth={1.5} />
            <path d="M104 202H120M106 207H118" stroke={P.gold} strokeWidth={2} strokeLinecap="round" />
            <path d="M128 195V214" stroke={P.parchment} strokeWidth={3} />
          </g>
          <path
            d="M92 198C96 192 106 192 108 198C110 204 104 212 96 212C90 212 88 204 92 198Z"
            fill={P.owlBrown}
            {...ol}
          />
          <path d="M96 200Q102 202 104 206M94 205Q98 208 100 211" stroke={P.outline} strokeWidth={1.8} fill="none" strokeLinecap="round" />

          {/* ear tufts poking up through the wig */}
          <path d="M80 50L58 4L102 34Z" fill={P.owlBrown} {...ol} />
          <path d="M160 50L182 4L138 34Z" fill={P.owlBrown} {...ol} />
          <path d="M68 22L80 38M172 22L160 38" stroke={P.outline} strokeWidth={2} strokeLinecap="round" />

          {/* head */}
          <path d="M72 100C70 70 92 56 120 56C148 56 170 70 168 100C168 132 148 152 120 152C92 152 72 132 72 100Z" fill={P.owlBrown} {...ol} />
          <path d="M150 64C164 74 170 94 166 114C162 134 146 148 126 151C150 140 160 118 158 96C157 82 154 72 150 64Z" fill={SHADE} />
          {/* facial disc */}
          <path d="M120 80C108 68 80 70 80 98C80 124 100 138 120 144C140 138 160 124 160 98C160 70 132 68 120 80Z" fill={P.owlLight} {...ol} />
          <path d="M84 120Q96 136 120 141M156 120Q144 136 120 141" stroke={P.owlBrown} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.6} />
          <path d="M78 132l-5 3M82 140l-4 4M162 132l5 3M158 140l4 4" stroke={P.outline} strokeWidth={2} strokeLinecap="round" />

          {/* eyes */}
          <g className="chr-blink chr-owl-eyes" style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
            <Eye cx={shocked ? 99 : 101} cy={100} mood={mood} side="l" />
            <Eye cx={shocked ? 141 : 139} cy={100} mood={mood} side="r" />
          </g>

          {/* beak */}
          {shocked ? (
            <g>
              <path d="M111 118Q120 136 129 118Q120 124 111 118Z" fill={P.burgundyDark} {...ol} />
              <path d="M112 110Q120 104 128 110Q126 118 120 122Q114 118 112 110Z" fill={P.beak} {...ol} />
            </g>
          ) : (
            <g>
              <path d="M111 110Q120 103 129 110Q127 122 120 131Q113 122 111 110Z" fill={P.beak} {...ol} />
              <path d="M120 106Q127 107 128 111Q126 121 120 130Z" fill={SHADE} />
              <path d="M115 111Q118 109 121 110" stroke={P.white} strokeWidth={2} strokeLinecap="round" fill="none" />
            </g>
          )}

          {/* half-moon spectacles, perched low */}
          <g>
            <path d="M88 116H112A12 10 0 0 1 88 116ZM128 116H152A12 10 0 0 1 128 116Z" fill="rgba(255,255,255,0.35)" stroke={P.outline} strokeWidth={4.5} strokeLinejoin="round" />
            <path d="M88 116H112A12 10 0 0 1 88 116ZM128 116H152A12 10 0 0 1 128 116Z" fill="none" stroke={P.gold} strokeWidth={2} strokeLinejoin="round" />
            <path d="M112 116Q120 110 128 116M88 116L75 108M152 116L165 108" fill="none" stroke={P.outline} strokeWidth={4.5} strokeLinecap="round" />
            <path d="M112 116Q120 110 128 116M88 116L75 108M152 116L165 108" fill="none" stroke={P.gold} strokeWidth={2} strokeLinecap="round" />
            <path d="M94 120l5 2M134 120l5 2" stroke={P.white} strokeWidth={2} strokeLinecap="round" />
          </g>

          {/* wig crown: rows of rolls over the dome */}
          <path d="M44 92C40 44 76 12 120 12C164 12 200 44 196 92L170 86C160 72 142 66 120 66C98 66 80 72 70 86Z" fill={P.wig} {...ol} />
          <Roll x={68} y={14} w={36} h={24} curl="l" />
          <Roll x={136} y={14} w={36} h={24} curl="r" />
          <Roll x={101} y={8} w={38} h={24} curl="l" />
          <Roll x={50} y={36} w={40} h={24} curl="l" />
          <Roll x={150} y={36} w={40} h={24} curl="r" />
          <Roll x={86} y={32} w={34} h={24} curl="l" />
          <Roll x={120} y={32} w={34} h={24} curl="r" />
          <Roll x={60} y={56} w={30} h={22} curl="l" />
          <Roll x={150} y={56} w={30} h={22} curl="r" />
          <Roll x={86} y={54} w={34} h={20} curl="l" />
          <Roll x={120} y={54} w={34} h={20} curl="r" />

          {/* eyebrows (on top of the wig fringe when they shoot up) */}
          <path d={brows[0]} fill={P.ink} {...ol} strokeWidth={2} />
          <path d={brows[1]} fill={P.ink} {...ol} strokeWidth={2} />

          {shocked && (
            <g strokeLinecap="round" fill="none">
              <path d="M30 60l-10-6M28 76H16M206 56l12-8M210 72h12" stroke={P.outline} strokeWidth={5.5} />
              <path d="M30 60l-10-6M28 76H16M206 56l12-8M210 72h12" stroke={P.goldLight} strokeWidth={2.5} />
            </g>
          )}

          {/* gavel arm */}
          <g transform={sleepy ? "rotate(-12 166 162)" : undefined}>
            <g className="chr-gavel-arm" style={{ transformBox: "view-box", transformOrigin: "166px 162px" }}>
              <path d="M160 154C178 156 196 168 202 184C206 196 192 204 182 196C176 186 166 178 156 172Z" fill={P.charcoal} {...ol} />
              <path d="M184 198C180 182 184 166 190 152L212 156C210 170 206 186 202 196C198 204 188 204 184 198Z" fill={P.charcoal} {...ol} />
              <path d="M188 152Q201 146 214 156Q201 162 188 152Z" fill={P.black} {...ol} strokeWidth={2.5} />
              {/* handle */}
              <path d="M197 150L199 94" stroke={P.outline} strokeWidth={10} strokeLinecap="round" />
              <path d="M197 150L199 94" stroke={P.burgundyLight} strokeWidth={5} strokeLinecap="round" />
              {/* head */}
              <path d="M176 76H220A6 12 0 0 1 220 100H176A6 12 0 0 1 176 76Z" fill={P.burgundy} {...ol} />
              <ellipse cx={220} cy={88} rx={6} ry={12} fill={P.burgundyLight} {...ol} />
              <path d="M184 76V100M190 76V100M206 76V100M212 76V100" stroke={P.outline} strokeWidth={1.5} />
              <path d="M184 77H190V99H184ZM206 77H212V99H206Z" fill={P.gold} />
              <path d="M178 81H216" stroke={P.burgundyLight} strokeWidth={2.5} strokeLinecap="round" />
              <path d="M176 76H220A6 12 0 0 1 220 100H176A6 12 0 0 1 176 76Z" fill="none" {...ol} />
              {/* feathered fist */}
              <path d="M190 150C186 140 192 128 202 128C212 128 216 138 212 150C206 154 196 154 190 150Z" fill={P.owlBrown} {...ol} />
              <path d="M193 136Q200 138 210 135M192 143Q200 145 211 142" stroke={P.outline} strokeWidth={2} fill="none" strokeLinecap="round" />
            </g>
          </g>

          {sleepy && (
            <g className="chr-z" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M200 30h12l-12 12h12M216 8h9l-9 9h9" stroke={P.outline} strokeWidth={6} />
              <path d="M200 30h12l-12 12h12M216 8h9l-9 9h9" stroke={P.ivory} strokeWidth={2.5} />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}

