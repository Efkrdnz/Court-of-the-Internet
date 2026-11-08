import { useId, type CSSProperties } from "react";
import { P, STROKE } from "../palette";

const ol = {
  stroke: P.outline,
  strokeWidth: STROKE,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;
const SHADE = "rgba(26,15,18,0.16)";

/** The slice silhouette, with a bite taken out of the top-right corner. */
const SLICE =
  "M32 56C30 34 70 22 120 22C148 22 168 25 180 29A10 10 0 0 0 192 46A10 10 0 0 0 208 62L127 230Q120 240 113 230Z";

function Pepperoni({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={P.pepperoni} {...ol} strokeWidth={2.5} />
      <path d={`M${cx + r * 0.1} ${cy + r * 0.85}A${r * 0.85} ${r * 0.85} 0 0 0 ${cx + r * 0.85} ${cy + r * 0.1}`} stroke={P.burgundy} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <circle cx={cx - r * 0.35} cy={cy - r * 0.3} r={r * 0.18} fill={P.blush} />
      <circle cx={cx + r * 0.25} cy={cy - r * 0.05} r={r * 0.12} fill={P.burgundy} />
      <circle cx={cx - r * 0.05} cy={cy + r * 0.4} r={r * 0.1} fill={P.burgundy} />
    </g>
  );
}

function TearDrop({ x, y, delay }: { x: number; y: number; delay: string }) {
  return (
    <path
      className="chr-tear-drop"
      style={{ ["--chr-d" as string]: delay } as CSSProperties}
      d={`M${x} ${y}C${x - 4} ${y + 6} ${x - 5} ${y + 9} ${x - 5} ${y + 11}A5 5 0 0 0 ${x + 5} ${y + 11}C${x + 5} ${y + 9} ${x + 4} ${y + 6} ${x} ${y}Z`}
      fill={P.tear}
      stroke={P.outline}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  );
}

export function CryingPizza({ className, title }: { className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const label = title ?? "A bitten pizza slice sobbing uncontrollably, the victim";
  const clip = `${uid}-slice`;

  return (
    <svg
      viewBox="0 0 240 260"
      role="img"
      aria-label={label}
      className={["chr-root chr-pizza", className].filter(Boolean).join(" ")}
      width="100%"
      overflow="visible"
    >
      <title>{label}</title>
      <defs>
        <clipPath id={clip}>
          <path d={SLICE} />
        </clipPath>
      </defs>
      <ellipse cx={120} cy={250} rx={46} ry={6} fill={P.shadow} />
      <g className="chr-figure">

        <g className="chr-sob" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
          {/* rubber-hose legs */}
          <path d="M111 222Q106 236 100 244M129 222Q134 236 140 244" stroke={P.outline} strokeWidth={4} strokeLinecap="round" fill="none" />
          <path d="M88 248C88 242 94 240 102 240C108 240 110 244 110 248Z" fill={P.black} {...ol} strokeWidth={2.5} />
          <path d="M130 248C130 244 132 240 138 240C146 240 152 242 152 248Z" fill={P.black} {...ol} strokeWidth={2.5} />

          {/* arms: one clutching a soggy napkin, one flung to the heavens */}
          <path d="M74 150Q54 156 42 148" stroke={P.outline} strokeWidth={4} strokeLinecap="round" fill="none" />
          <path d="M168 140Q188 132 196 112" stroke={P.outline} strokeWidth={4} strokeLinecap="round" fill="none" />
          <path d="M24 140L30 132L38 136L46 130L52 140L46 150L50 158L38 158L30 154Z" fill={P.ivory} {...ol} strokeWidth={2.5} />
          <path d="M32 142L42 146M38 138l4 6" stroke={P.wigShade} strokeWidth={2} strokeLinecap="round" />
          <path d="M44 142C38 140 34 146 38 152C42 156 50 154 50 148Z" fill={P.white} {...ol} strokeWidth={2.5} />
          <path d="M190 112C186 104 192 96 200 98C208 100 208 110 202 114Z" fill={P.white} {...ol} strokeWidth={2.5} />
          <path d="M196 98L194 90M202 98L204 91" stroke={P.outline} strokeWidth={2.5} strokeLinecap="round" />

          {/* slice */}
          <path d={SLICE} fill={P.pizzaCheese} />
          <g clipPath={`url(#${clip})`}>
            <path d="M150 40C180 70 170 140 130 236L150 236L220 60Z" fill={SHADE} />
            {/* crust band */}
            <path d="M10 76C50 46 190 46 230 76V0H10Z" fill={P.pizzaCrust} />
            <path d="M10 76C50 46 190 46 230 76" stroke={P.outline} strokeWidth={STROKE} fill="none" />
            <path d="M150 26C176 30 196 40 210 54L210 70C196 58 176 52 150 50Z" fill={SHADE} />
            <path d="M56 38Q90 26 128 28" stroke={P.goldLight} strokeWidth={4} strokeLinecap="round" fill="none" />
            <g fill={P.goldDark} opacity={0.7}>
              <ellipse cx={70} cy={46} rx={4} ry={2} />
              <ellipse cx={104} cy={40} rx={3} ry={1.6} />
              <ellipse cx={150} cy={42} rx={4} ry={2} />
            </g>
            {/* melty cheese texture */}
            <path d="M60 96Q66 104 64 112M176 92Q170 100 172 110M110 206Q114 212 112 218" stroke={P.goldLight} strokeWidth={3} strokeLinecap="round" fill="none" />
            <path d="M90 186q6 4 12 0" stroke={P.gold} strokeWidth={2.5} strokeLinecap="round" fill="none" />
          </g>
          <path d={SLICE} fill="none" {...ol} />

          {/* cheese drips over the edges */}
          <path d="M54 104C46 116 44 130 46 140A6 6 0 0 0 58 140C58 132 60 126 66 124L70 118L60 100Z" fill={P.pizzaCheese} />
          <path d="M54 104C46 116 44 130 46 140A6 6 0 0 0 58 140C58 132 60 126 64 124" fill="none" {...ol} />
          <path d="M180 118C188 130 190 142 188 150A6 6 0 0 1 176 148C176 140 174 136 170 133L168 126L178 112Z" fill={P.pizzaCheese} />
          <path d="M180 118C188 130 190 142 188 150A6 6 0 0 1 176 148C176 140 174 136 172 134" fill="none" {...ol} />

          {/* pepperoni */}
          <Pepperoni cx={64} cy={74} r={10} />
          <Pepperoni cx={174} cy={76} r={9} />
          <Pepperoni cx={120} cy={196} r={11} />
          <Pepperoni cx={140} cy={168} r={7} />
          <Pepperoni cx={96} cy={166} r={6} />

          {/* bite crumbs */}
          <g fill={P.pizzaCrust} stroke={P.outline} strokeWidth={1.5} strokeLinejoin="round">
            <path d="M214 30l5 -2l1 5l-4 2Z" />
            <path d="M222 46l4 1l-1 4l-4 -1Z" />
          </g>

          {/* face */}
          <g className="chr-blink" style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
            {[96, 144].map((ex) => (
              <g key={ex}>
                <ellipse cx={ex} cy={98} rx={14} ry={16} fill={P.ivory} {...ol} />
                <circle cx={ex} cy={95} r={10} fill={P.black} />
                <circle cx={ex - 4} cy={90} r={3.6} fill={P.white} />
                <circle cx={ex + 4} cy={99} r={1.8} fill={P.white} />
                {/* welling tears */}
                <path d={`M${ex - 13} 104Q${ex} 112 ${ex + 13} 104Q${ex + 10} 114 ${ex} 114Q${ex - 10} 114 ${ex - 13} 104Z`} fill={P.tear} stroke={P.outline} strokeWidth={2} strokeLinejoin="round" />
              </g>
            ))}
          </g>
          {/* devastated brows */}
          <path d="M80 80Q92 76 106 68M160 80Q148 76 134 68" stroke={P.outline} strokeWidth={4.5} strokeLinecap="round" fill="none" />
          {/* quivering mouth */}
          <g className="chr-quiver" style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}>
            <path d="M100 138Q105 132 110 138Q115 132 120 138Q125 132 130 138Q135 132 140 138C142 156 98 156 100 138Z" fill={P.burgundyDark} {...ol} strokeWidth={2.5} />
            <path d="M108 150Q120 142 132 150Q120 154 108 150Z" fill={P.blush} />
          </g>
          <ellipse cx={78} cy={124} rx={7} ry={4} fill={P.blush} opacity={0.8} />
          <ellipse cx={162} cy={124} rx={7} ry={4} fill={P.blush} opacity={0.8} />

          {/* streaming tears */}
          <g className="chr-tears">
            <path d="M84 110C78 120 74 126 66 134" stroke={P.outline} strokeWidth={8} strokeLinecap="round" fill="none" />
            <path d="M156 110C162 120 166 126 174 134" stroke={P.outline} strokeWidth={8} strokeLinecap="round" fill="none" />
            <path d="M84 110C78 120 74 126 66 134" stroke={P.tear} strokeWidth={4} strokeLinecap="round" fill="none" />
            <path d="M156 110C162 120 166 126 174 134" stroke={P.tear} strokeWidth={4} strokeLinecap="round" fill="none" />
            <path d="M82 104Q66 82 44 88" stroke={P.outline} strokeWidth={7} strokeLinecap="round" fill="none" />
            <path d="M158 104Q174 82 196 88" stroke={P.outline} strokeWidth={7} strokeLinecap="round" fill="none" />
            <path d="M82 104Q66 82 44 88" stroke={P.tear} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            <path d="M158 104Q174 82 196 88" stroke={P.tear} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            <TearDrop x={36} y={92} delay="0s" />
            <TearDrop x={204} y={92} delay="0.35s" />
            <TearDrop x={26} y={110} delay="0.7s" />
            <TearDrop x={214} y={112} delay="1.05s" />
            <TearDrop x={62} y={170} delay="0.2s" />
            <TearDrop x={180} y={172} delay="0.55s" />
          </g>
        </g>
      </g>
    </svg>
  );
}
