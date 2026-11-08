import type { CSSProperties } from "react";
import { P, STROKE } from "../palette";

export type CatJuryMood = "judging" | "shocked" | "asleep" | "approving";

const SHADE = "rgba(26,15,18,0.2)";
const STRIPE = "rgba(26,15,18,0.32)";

type CatSpec = {
  x: number;
  cy: number;
  s: number;
  fur: string;
  eye: string;
  tabby?: boolean;
  monocle?: boolean;
  fat?: boolean;
  tail?: "l" | "r";
  delay: string;
};

/** Spiky raised-fur halo for the shocked mood. */
function furSpikes(fat: boolean) {
  const pts: string[] = [];
  const n = 22;
  const wx = fat ? 1.2 : 1;
  for (let i = 0; i <= n; i++) {
    const a = ((200 + (140 * i) / n) * Math.PI) / 180;
    const r = i % 2 === 0 ? 32 : 42;
    pts.push(`${(Math.cos(a) * r * wx).toFixed(1)} ${(Math.sin(a) * r + 2).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

function Cat({ c, mood, railY }: { c: CatSpec; mood: CatJuryMood; railY: number }) {
  const sw = STROKE / c.s;
  const ol = { stroke: P.outline, strokeWidth: sw, strokeLinejoin: "round", strokeLinecap: "round" } as const;
  const thin = { stroke: P.outline, strokeWidth: sw * 0.7, strokeLinecap: "round", fill: "none" } as const;
  const wx = c.fat ? 1.3 : 1;
  const rel = (railY - c.cy) / c.s; // rail position in cat-local units
  const isDark = c.fur === P.catBlack;
  const lineCol = isDark ? P.charcoal : P.outline;

  const head =
    "M-30 -2C-32 -16 -30 -24 -26 -28L-26 -46L-8 -32C-3 -33 3 -33 8 -32L26 -46L26 -28C30 -24 32 -16 30 -2L37 4L30 8C26 20 14 26 0 26C-14 26 -26 20 -30 8L-37 4Z";

  const eyes = (() => {
    switch (mood) {
      case "shocked":
        return [-12, 12].map((ex) => (
          <g key={ex}>
            <circle cx={ex} cy={-7} r={9} fill={P.ivory} {...ol} />
            <circle cx={ex} cy={-7} r={2.6} fill={P.black} />
          </g>
        ));
      case "asleep":
        return [-12, 12].map((ex) => (
          <path key={ex} d={`M${ex - 7} -6Q${ex} -1 ${ex + 7} -6`} {...thin} strokeWidth={sw} stroke={isDark ? P.ivory : P.outline} />
        ));
      case "approving":
        return [-12, 12].map((ex) => (
          <path key={ex} d={`M${ex - 7} -4Q${ex} -12 ${ex + 7} -4`} {...thin} strokeWidth={sw} stroke={isDark ? P.ivory : P.outline} />
        ));
      default:
        return [-12, 12].map((ex, i) => (
          <g key={ex}>
            <ellipse cx={ex} cy={-6} rx={7.5} ry={6.5} fill={c.eye} {...ol} />
            <ellipse cx={ex + (i === 0 ? 1.5 : 1.5)} cy={-5} rx={1.6} ry={4.6} fill={P.black} />
            {/* heavy, unimpressed lids */}
            <path d={`M${ex - 7.6} -5A7.5 6.5 0 0 1 ${ex + 7.6} -5Z`} fill={c.fur} {...ol} />
          </g>
        ));
    }
  })();

  const mouth = {
    judging: "M0 7V10M-7 14Q0 9 7 14",
    shocked: "",
    asleep: "M-4 12Q0 14 4 12",
    approving: "M0 7V10M-8 10Q-4 16 0 10Q4 16 8 10",
  }[mood];

  const tailPath = c.tail === "l" ? "M-28 46C-44 30 -30 0 -46 -16Q-54 -24 -48 -30" : "M28 46C44 30 30 0 46 -16Q54 -24 48 -30";

  return (
    <g transform={`translate(${c.x} ${c.cy}) scale(${c.s})`}>
      {c.tail && (
        <g
          className="chr-cat-tail"
          style={{
            transformBox: "fill-box",
            transformOrigin: c.tail === "l" ? "100% 100%" : "0% 100%",
            ["--chr-d" as string]: c.delay,
          } as CSSProperties}
        >
          <path d={tailPath} stroke={P.outline} strokeWidth={13 / c.s} strokeLinecap="round" fill="none" />
          <path d={tailPath} stroke={c.fur} strokeWidth={13 / c.s - 2 * sw} strokeLinecap="round" fill="none" />
        </g>
      )}
      {/* torso, disappears behind the rail */}
      <path
        d={`M${-26 * wx} 14C${-40 * wx} 30 ${-44 * wx} 50 ${-44 * wx} ${rel + 8}H${44 * wx}C${44 * wx} 50 ${40 * wx} 30 ${26 * wx} 14Z`}
        fill={c.fur}
        {...ol}
      />
      <path d={`M${14 * wx} 22C${30 * wx} 30 ${38 * wx} 44 ${40 * wx} ${rel + 8}H${44 * wx}C${44 * wx} 50 ${40 * wx} 30 ${26 * wx} 14Z`} fill={SHADE} />
      {!isDark && <path d={`M-12 24Q0 34 12 24L10 ${rel}H-10Z`} fill={P.ivory} opacity={0.6} />}

      <g
        className="chr-cat-head"
        style={{ transformBox: "fill-box", transformOrigin: "50% 90%", ["--chr-d" as string]: c.delay } as CSSProperties}
      >
        {mood === "shocked" && <path d={furSpikes(!!c.fat)} fill={c.fur} {...ol} />}
        <g transform={c.fat ? "scale(1.2 1)" : undefined}>
          <path d={head} fill={c.fur} {...ol} strokeWidth={c.fat ? sw / 1.1 : sw} />
          <path d="M-21 -31L-22 -40L-12 -32Z" fill={P.blush} />
          <path d="M21 -31L22 -40L12 -32Z" fill={P.blush} />
          <path d="M18 -26C26 -18 30 -6 26 6C22 16 12 22 2 24C18 14 24 -6 18 -26Z" fill={SHADE} />
          {c.fat && (
            <path d="M-26 12Q-30 24 -14 27Q0 31 14 27Q30 24 26 12" fill={c.fur} stroke={P.outline} strokeWidth={sw / 1.1} strokeLinejoin="round" />
          )}
          {c.tabby && (
            <path d="M-6 -30L-4 -22M0 -32V-22M6 -30L4 -22M-30 -2H-22M-29 6H-23M30 -2H22M29 6H23" stroke={STRIPE} strokeWidth={sw * 1.1} strokeLinecap="round" />
          )}
        </g>
        {/* muzzle */}
        <path d="M-10 4C-10 -2 -3 -1 0 2C3 -1 10 -2 10 4C10 12 4 16 0 16C-4 16 -10 12 -10 4Z" fill={isDark ? P.charcoal : P.ivory} opacity={isDark ? 1 : 0.75} />
        {eyes}
        {mood === "approving" && (
          <>
            <ellipse cx={-20} cy={4} rx={5} ry={3} fill={P.blush} opacity={0.85} />
            <ellipse cx={20} cy={4} rx={5} ry={3} fill={P.blush} opacity={0.85} />
          </>
        )}
        <path d="M-4 3H4L0 7.5Z" fill={P.blush} stroke={P.outline} strokeWidth={sw * 0.6} strokeLinejoin="round" />
        {mood === "shocked" ? (
          <ellipse cx={0} cy={13} rx={3.5} ry={4.5} fill={P.burgundyDark} stroke={P.outline} strokeWidth={sw * 0.7} />
        ) : (
          <path d={mouth} {...thin} stroke={lineCol === P.charcoal ? P.ivory : P.outline} />
        )}
        <path
          d="M-14 6L-34 2M-14 10L-33 13M14 6L34 2M14 10L33 13"
          stroke={isDark ? P.parchment : P.outline}
          strokeWidth={sw * 0.45}
          strokeLinecap="round"
        />
        {c.monocle && (
          <g>
            <path d="M22 0Q30 20 24 40" fill="none" stroke={P.gold} strokeWidth={sw * 0.6} strokeDasharray={`${sw * 0.4} ${sw * 0.9}`} strokeLinecap="round" />
            <circle cx={12} cy={-6} r={10.5} fill="rgba(255,255,255,0.25)" stroke={P.outline} strokeWidth={sw * 1.4} />
            <circle cx={12} cy={-6} r={10.5} fill="none" stroke={P.gold} strokeWidth={sw * 0.6} />
            <path d="M7 -11Q10 -14 14 -13" stroke={P.white} strokeWidth={sw * 0.6} strokeLinecap="round" fill="none" />
          </g>
        )}
        {mood === "asleep" && (
          <g
            className="chr-z"
            style={{ ["--chr-d" as string]: c.delay } as CSSProperties}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 -44h8l-8 8h8M34 -56h6l-6 6h6" stroke={P.outline} strokeWidth={sw * 1.8} />
            <path d="M22 -44h8l-8 8h8M34 -56h6l-6 6h6" stroke={P.ivory} strokeWidth={sw * 0.75} />
          </g>
        )}
      </g>
    </g>
  );
}

function Paws({ c, railY }: { c: CatSpec; railY: number }) {
  const off = (c.fat ? 22 : 15) * c.s;
  const pr = 7 * c.s;
  return (
    <>
      {[-off, off].map((o) => {
        const px = c.x + o;
        return (
          <g key={o}>
            <path
              d={`M${px - pr} ${railY + 4}C${px - pr} ${railY - pr * 1.3} ${px + pr} ${railY - pr * 1.3} ${px + pr} ${railY + 4}Z`}
              fill={c.fur}
              stroke={P.outline}
              strokeWidth={STROKE * 0.85}
              strokeLinejoin="round"
            />
            <path
              d={`M${px - pr * 0.35} ${railY + 2}v-3M${px + pr * 0.35} ${railY + 2}v-3`}
              stroke={c.fur === P.catBlack ? P.charcoal : P.outline}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </>
  );
}

function Rail({ y, x1 = 8, x2 = 352 }: { y: number; x1?: number; x2?: number }) {
  return (
    <g>
      <path d={`M${x1} ${y}H${x2}Q${x2 + 5} ${y + 6} ${x2} ${y + 12}H${x1}Q${x1 - 5} ${y + 6} ${x1} ${y}Z`} fill={P.owlLight} stroke={P.outline} strokeWidth={STROKE} strokeLinejoin="round" />
      <path d={`M${x1 + 6} ${y + 4}H${x2 - 6}`} stroke={P.parchment} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
      <path d={`M${x1 + 2} ${y + 9}H${x2 - 2}`} stroke={SHADE} strokeWidth={3} />
    </g>
  );
}

export function CatJury({
  className,
  mood = "judging",
  count = 3,
  title,
}: {
  className?: string;
  mood?: CatJuryMood;
  count?: 3 | 6;
  title?: string;
}) {
  const label =
    title ??
    {
      judging: "A jury of cats, peering over the rail with deep disapproval",
      shocked: "A jury of cats, fur on end in total shock",
      asleep: "A jury of cats, fast asleep in the jury box",
      approving: "A jury of cats, smugly approving",
    }[mood];

  const railY = count === 6 ? 142 : 122;
  const backRailY = 74;

  const front: CatSpec[] =
    count === 6
      ? [
          { x: 70, cy: 118, s: 0.8, fur: P.catOrange, eye: P.goldLight, tabby: true, tail: "l", delay: "0s" },
          { x: 180, cy: 118, s: 0.8, fur: P.catCream, eye: P.pigeonIris, monocle: true, delay: "0.6s" },
          { x: 290, cy: 118, s: 0.8, fur: P.catBlack, eye: P.goldLight, fat: true, tail: "r", delay: "1.3s" },
        ]
      : [
          { x: 72, cy: 82, s: 1.05, fur: P.catOrange, eye: P.goldLight, tabby: true, tail: "l", delay: "0s" },
          { x: 180, cy: 82, s: 1.05, fur: P.catCream, eye: P.pigeonIris, monocle: true, delay: "0.6s" },
          { x: 286, cy: 82, s: 1.05, fur: P.catBlack, eye: P.goldLight, fat: true, tail: "r", delay: "1.3s" },
        ];
  const back: CatSpec[] =
    count === 6
      ? [
          { x: 70, cy: 46, s: 0.8, fur: P.catGrey, eye: P.pigeonIris, tabby: true, tail: "l", delay: "0.9s" },
          { x: 180, cy: 46, s: 0.8, fur: P.catOrange, eye: P.pigeonIris, delay: "0.3s" },
          { x: 290, cy: 46, s: 0.8, fur: P.catGrey, eye: P.goldLight, tail: "r", delay: "1.7s" },
        ]
      : [];

  return (
    <svg
      viewBox="0 0 360 200"
      role="img"
      aria-label={label}
      className={["chr-root chr-jury", `chr-jury-${mood}`, className].filter(Boolean).join(" ")}
      width="100%"
      overflow="visible"
    >
      <title>{label}</title>
      <ellipse cx={180} cy={195} rx={176} ry={5} fill={P.shadow} />
      <g className="chr-figure">

        {count === 6 && (
          <g>
            {back.map((c) => (
              <Cat key={c.x} c={c} mood={mood} railY={backRailY} />
            ))}
            {/* raised back bench */}
            <path d={`M14 ${backRailY + 6}H346V${railY}H14Z`} fill={P.owlBrown} stroke={P.outline} strokeWidth={STROKE} strokeLinejoin="round" />
            <path d={`M14 ${backRailY + 12}H346V${backRailY + 22}H14Z`} fill={SHADE} />
            <Rail y={backRailY} x1={14} x2={346} />
            {back.map((c) => (
              <Paws key={c.x} c={c} railY={backRailY} />
            ))}
          </g>
        )}

        {front.map((c) => (
          <Cat key={c.x} c={c} mood={mood} railY={railY} />
        ))}

        {/* jury box front */}
        <g>
          <path d={`M12 ${railY + 6}H348V188H12Z`} fill={P.owlBrown} stroke={P.outline} strokeWidth={STROKE} strokeLinejoin="round" />
          <path d={`M300 ${railY + 6}H348V188H300Z`} fill={SHADE} />
          {[
            [26, 112],
            [124, 236],
            [248, 334],
          ].map(([a, b]) => (
            <g key={a}>
              <rect x={a} y={railY + 18} width={b - a} height={180 - railY - 26} rx={4} fill={SHADE} stroke={P.outline} strokeWidth={2} />
              <path d={`M${a + 4} ${180 - 10}H${b - 4}`} stroke={P.owlLight} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
              <path d={`M${a + 10} ${railY + 30}Q${(a + b) / 2} ${railY + 26} ${b - 10} ${railY + 34}`} stroke={P.outline} strokeWidth={1.2} fill="none" opacity={0.25} />
            </g>
          ))}
          {/* brass plaque */}
          <rect x={150} y={railY + 22} width={60} height={20} rx={3} fill={P.gold} stroke={P.outline} strokeWidth={2.5} />
          <rect x={153} y={railY + 25} width={54} height={14} rx={2} fill="none" stroke={P.goldDark} strokeWidth={1.2} />
          <text x={180} y={railY + 36.5} textAnchor="middle" fontFamily='"Playfair Display", Georgia, serif' fontWeight={800} fontSize={11} letterSpacing={2} fill={P.burgundyDark}>
            JURY
          </text>
          <path d="M8 186H352V196H8Z" fill={P.owlBrown} stroke={P.outline} strokeWidth={STROKE} strokeLinejoin="round" />
          <path d="M10 192H350" stroke={SHADE} strokeWidth={4} />
          <Rail y={railY} />
        </g>

        {front.map((c) => (
          <Paws key={c.x} c={c} railY={railY} />
        ))}
      </g>
    </svg>
  );
}
