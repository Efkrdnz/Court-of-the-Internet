import { useId } from "react";
import { P, STROKE } from "../palette";

const ol = {
  stroke: P.outline,
  strokeWidth: STROKE,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;
const SHADE = "rgba(26,15,18,0.2)";

const TAIL =
  "M178 200C208 206 236 194 246 166C252 146 246 124 232 112C226 130 218 146 204 156C192 164 180 170 168 180Z";

export function RaccoonProsecutor({ className, title }: { className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const label = title ?? "Raccoon prosecutor in a burgundy waistcoat, pointing dramatically: OBJECTION!";
  const tailClip = `${uid}-tail`;

  return (
    <svg
      viewBox="0 0 260 260"
      role="img"
      aria-label={label}
      className={["chr-root chr-raccoon", className].filter(Boolean).join(" ")}
      width="100%"
      overflow="visible"
    >
      <title>{label}</title>
      <defs>
        <clipPath id={tailClip}>
          <path d={TAIL} />
        </clipPath>
      </defs>

      <ellipse cx={156} cy={248} rx={84} ry={8} fill={P.shadow} />
      <g className="chr-figure">

        <g className="chr-bob" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
          {/* striped tail */}
          <g className="chr-tail" style={{ transformBox: "view-box", transformOrigin: "176px 190px" }}>
            <path d={TAIL} fill={P.raccoonGrey} />
            <g clipPath={`url(#${tailClip})`} stroke={P.raccoonDark} strokeWidth={11} strokeLinecap="butt">
              <path d="M190 150L208 210M214 136L236 196M232 112L254 150" />
              <path d="M222 100L262 110L262 140Z" fill={P.raccoonDark} />
            </g>
            <path d={TAIL} fill="none" {...ol} />
            <path d="M196 186Q216 184 230 168" stroke={P.wigShade} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.6} />
          </g>

          {/* legs */}
          {[140, 172].map((lx) => (
            <g key={lx}>
              <path d={`M${lx - 9} 210L${lx - 8} 236H${lx + 8}L${lx + 9} 210Z`} fill={P.raccoonGrey} {...ol} />
              <path d={`M${lx - 14} 244C${lx - 14} 234 ${lx - 6} 232 ${lx} 232C${lx + 8} 232 ${lx + 14} 236 ${lx + 14} 244Z`} fill={P.raccoonDark} {...ol} />
              <path d={`M${lx - 4} 244v-4M${lx + 4} 244v-4`} stroke={P.raccoonGrey} strokeWidth={2} strokeLinecap="round" />
            </g>
          ))}

          {/* body + shirt */}
          <path d="M108 134C100 162 104 200 120 218H188C202 200 204 162 194 134C174 122 128 122 108 134Z" fill={P.raccoonGrey} {...ol} />
          <path d="M134 126L166 126L150 172Z" fill={P.ivory} {...ol} />
          {/* waistcoat */}
          <path
            d="M108 138C102 166 106 196 116 214L150 224L186 214C196 196 200 166 194 138L168 128L150 172L132 128Z"
            fill={P.burgundy}
            {...ol}
          />
          <path d="M170 132L192 140C196 168 194 194 186 212L160 220C176 200 180 166 170 132Z" fill={P.burgundyDark} opacity={0.7} />
          <path d="M118 150C116 170 118 190 124 204" stroke={P.burgundyLight} strokeWidth={3} strokeLinecap="round" fill="none" />
          {/* pocket + watch chain */}
          <path d="M118 182H136" stroke={P.outline} strokeWidth={2.5} strokeLinecap="round" />
          <path d="M134 182Q140 196 150 188" stroke={P.gold} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="1 3.5" />
          {/* buttons */}
          {[184, 198, 212].map((by) => (
            <g key={by}>
              <circle cx={150} cy={by} r={3.6} fill={P.gold} {...ol} strokeWidth={2} />
            </g>
          ))}
          {/* bow tie */}
          <path d="M150 134L134 126L134 144Z" fill={P.teal} {...ol} />
          <path d="M150 134L166 126L166 144Z" fill={P.teal} {...ol} />
          <rect x={145} y={129} width={10} height={10} rx={3} fill={P.tealLight} {...ol} strokeWidth={2.5} />

          {/* magnifying-glass arm */}
          <path d="M188 134C202 138 214 150 218 164L204 172C198 160 190 152 180 150Z" fill={P.ivory} {...ol} />
          <path d="M200 168L214 160" stroke={P.outline} strokeWidth={2} />
          <path d="M212 160L226 122" stroke={P.outline} strokeWidth={10} strokeLinecap="round" />
          <path d="M212 160L226 122" stroke={P.burgundyDark} strokeWidth={5} strokeLinecap="round" />
          <circle cx={232} cy={102} r={18} fill={P.tealLight} fillOpacity={0.35} stroke={P.outline} strokeWidth={9} />
          <circle cx={232} cy={102} r={18} fill="none" stroke={P.gold} strokeWidth={4} />
          <path d="M222 96Q226 88 234 88" stroke={P.white} strokeWidth={3} strokeLinecap="round" fill="none" />
          <path d="M204 172C198 166 200 156 208 154C216 152 222 158 220 166C218 172 210 176 204 172Z" fill={P.raccoonDark} {...ol} />
          <path d="M208 160l8-2M207 166l9-2" stroke={P.raccoonGrey} strokeWidth={2} strokeLinecap="round" />

          {/* head */}
          <g className="chr-head" style={{ transformBox: "fill-box", transformOrigin: "50% 90%" }}>
            {/* ears */}
            <path d="M100 54L102 16L132 36Z" fill={P.raccoonGrey} {...ol} />
            <path d="M106 46L107 26L122 37Z" fill={P.raccoonDark} />
            <path d="M196 54L194 16L164 36Z" fill={P.raccoonGrey} {...ol} />
            <path d="M190 46L189 26L174 37Z" fill={P.raccoonDark} />
            <path d="M96 80C94 46 120 26 148 26C178 26 202 46 200 78L212 92L196 94C188 112 170 122 148 122C126 122 108 112 100 94L84 90Z" fill={P.raccoonGrey} {...ol} />
            <path d="M176 36C194 48 200 66 198 80L210 92L196 94C190 108 178 116 164 120C180 104 186 80 176 36Z" fill={SHADE} />
            {/* white brow patches */}
            <path d="M104 72C110 56 128 52 142 64C130 62 118 66 108 76Z" fill={P.ivory} {...ol} strokeWidth={2.5} />
            <path d="M194 72C188 56 170 52 156 64C168 62 180 66 190 76Z" fill={P.ivory} {...ol} strokeWidth={2.5} />
            {/* bandit mask */}
            <path d="M98 82C104 66 128 62 148 74C168 62 194 66 200 82C198 94 184 100 170 96C162 94 154 88 148 88C142 88 134 94 126 96C112 100 98 94 98 82Z" fill={P.raccoonDark} {...ol} />
            {/* muzzle */}
            <path d="M120 96C126 88 140 86 148 88C156 86 170 88 176 96C182 112 168 126 148 126C128 126 114 112 120 96Z" fill={P.ivory} {...ol} />
            {/* eyes: fiery, glaring toward the accused */}
            <g className="chr-blink" style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
              <ellipse cx={124} cy={80} rx={9} ry={8} fill={P.ivory} {...ol} strokeWidth={2.5} />
              <ellipse cx={172} cy={80} rx={9} ry={8} fill={P.ivory} {...ol} strokeWidth={2.5} />
              <circle cx={120} cy={81} r={4.5} fill={P.black} />
              <circle cx={168} cy={81} r={4.5} fill={P.black} />
              <circle cx={118.5} cy={79} r={1.5} fill={P.white} />
              <circle cx={166.5} cy={79} r={1.5} fill={P.white} />
            </g>
            {/* furious brows */}
            <path d="M110 68L138 78" stroke={P.outline} strokeWidth={5} strokeLinecap="round" />
            <path d="M186 68L158 78" stroke={P.outline} strokeWidth={5} strokeLinecap="round" />
            {/* nose */}
            <path d="M140 94Q148 90 156 94Q154 101 148 102Q142 101 140 94Z" fill={P.black} {...ol} strokeWidth={2} />
            <path d="M144 94l4 -1" stroke={P.white} strokeWidth={1.5} strokeLinecap="round" />
            {/* shouting mouth */}
            <path d="M132 106Q148 102 162 106Q162 122 147 124Q132 122 132 106Z" fill={P.burgundyDark} {...ol} strokeWidth={2.5} />
            <path d="M136 108Q147 106 158 108L157 112Q147 110 137 112Z" fill={P.white} />
            <path d="M139 120Q147 114 155 120Q147 124 139 120Z" fill={P.blush} />
            {/* whiskers */}
            <path d="M118 104l-14 -2M118 110l-14 4M178 104l14 -2M178 110l14 4" stroke={P.outline} strokeWidth={1.8} strokeLinecap="round" />
          </g>

          {/* the accusatory arm */}
          <g className="chr-point" style={{ transformBox: "view-box", transformOrigin: "116px 142px" }}>
            <path d="M120 130C98 118 76 106 58 96L50 112C68 124 92 140 114 154Z" fill={P.ivory} {...ol} />
            <path d="M80 112C90 120 100 126 112 132" stroke={P.wigShade} strokeWidth={2} strokeLinecap="round" fill="none" />
            <path d="M58 92L48 116L40 112L50 88Z" fill={P.ivory} {...ol} />
            <circle cx={50} cy={104} r={2.5} fill={P.gold} stroke={P.outline} strokeWidth={1.5} />
            {/* paw with extended finger */}
            <path d="M44 92C36 88 28 92 28 100C28 110 36 114 44 112C48 106 48 98 44 92Z" fill={P.raccoonDark} {...ol} />
            <path d="M34 96L12 88" stroke={P.outline} strokeWidth={10} strokeLinecap="round" />
            <path d="M34 96L12 88" stroke={P.raccoonDark} strokeWidth={5} strokeLinecap="round" />
            <path d="M36 92L32 84" stroke={P.outline} strokeWidth={9} strokeLinecap="round" />
            <path d="M36 92L32 84" stroke={P.raccoonDark} strokeWidth={4} strokeLinecap="round" />
            <path d="M30 104Q34 108 38 106" stroke={P.raccoonGrey} strokeWidth={2} strokeLinecap="round" fill="none" />
          </g>

          {/* OBJECTION! burst lines */}
          <g className="chr-burst" stroke={P.crimson} strokeWidth={3.5} strokeLinecap="round">
            <path d="M8 70L2 60M4 90H-2M10 108L2 116" transform="translate(4 0)" />
            <path d="M22 66L20 54M26 112L24 122" />
          </g>
        </g>
      </g>
    </svg>
  );
}
