import { useId } from "react";
import { P, STROKE } from "../palette";

const ol = {
  stroke: P.outline,
  strokeWidth: STROKE,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;
const SHADE = "rgba(26,15,18,0.2)";

const TOP_SLICE = "M200 94V72C194 64 198 52 210 54C216 44 264 44 270 54C282 52 286 64 280 72V94Z";

export function BailiffBulldog({ className, title }: { className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const label = title ?? "Bailiff bulldog with enormous crossed arms, guarding a stolen sandwich marked Exhibit A";
  const bite = `${uid}-bite`;
  const topClip = `${uid}-top`;

  return (
    <svg
      viewBox="0 0 300 260"
      role="img"
      aria-label={label}
      className={["chr-root chr-bulldog", className].filter(Boolean).join(" ")}
      width="100%"
      overflow="visible"
    >
      <title>{label}</title>
      <defs>
        <mask id={bite} maskUnits="userSpaceOnUse" x={0} y={0} width={300} height={260}>
          <rect width={300} height={260} fill={P.white} />
          <circle cx={284} cy={62} r={9} fill={P.black} />
          <circle cx={285} cy={78} r={8} fill={P.black} />
        </mask>
        <clipPath id={topClip}>
          <path d={TOP_SLICE} />
        </clipPath>
      </defs>
      <ellipse cx={100} cy={248} rx={84} ry={8} fill={P.shadow} />
      <ellipse cx={240} cy={248} rx={50} ry={7} fill={P.shadow} />
      <g className="chr-figure">

        {/* ---------- evidence stand ---------- */}
        <g>
          <path d="M206 246L212 232H268L274 246Z" fill={P.parchmentDark} {...ol} />
          <path d="M218 232L222 150H258L262 232Z" fill={P.ivory} {...ol} />
          <path d="M250 152L253 232H262L258 150Z" fill={SHADE} />
          <path d="M232 156V228M240 156V228M248 156V228" stroke={P.parchmentDark} strokeWidth={2} strokeLinecap="round" />
          <path d="M208 150L212 140H268L272 150Z" fill={P.parchmentDark} {...ol} />
          {/* velvet cushion */}
          <path d="M206 140C206 128 216 126 240 126C264 126 274 128 274 140Z" fill={P.burgundy} {...ol} />
          <path d="M210 138Q240 132 270 138" stroke={P.burgundyLight} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </g>

        {/* ---------- the sandwich ---------- */}
        <g className="chr-sandwich" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
          {/* bottom slice */}
          <path d="M202 128V118Q202 113 207 113H273Q278 113 278 118V128Z" fill={P.pizzaCrust} {...ol} />
          <path d="M206 120H274" stroke={P.parchment} strokeWidth={3} strokeLinecap="round" />
          {/* ham */}
          <path d="M196 112Q206 104 220 110Q232 104 244 110Q256 104 268 110Q278 104 286 112Q278 118 240 118Q202 118 196 112Z" fill={P.blush} {...ol} />
          {/* cheese with drips */}
          <path d="M200 104H282L276 112L272 122L266 112H232L228 124L222 112H204Z" fill={P.pizzaCheese} {...ol} />
          {/* tomato */}
          <path d="M204 98Q240 92 276 98L278 104Q240 108 202 104Z" fill={P.crimson} {...ol} />
          {/* lettuce frills */}
          <path d="M194 96Q200 86 208 92Q214 82 222 90Q230 80 238 88Q246 80 254 88Q262 80 270 90Q278 84 286 94Q280 100 240 100Q200 100 194 96Z" fill={P.frogGreen} {...ol} />
          {/* top slice: loaf silhouette, with a guilty bite out of the corner */}
          <g mask={`url(#${bite})`}>
            <path d={TOP_SLICE} fill={P.pizzaCrust} {...ol} />
            <path d="M207 88V73C202 67 204 60 212 61C218 53 262 53 268 61C276 60 278 67 273 73V88Z" fill={P.parchment} />
            <path d="M262 62C270 64 272 70 268 76V88H273V73C278 67 276 60 268 61Z" fill={SHADE} />
            <g fill={P.parchmentDark}>
              <circle cx={222} cy={72} r={1.6} />
              <circle cx={236} cy={80} r={1.3} />
              <circle cx={250} cy={68} r={1.6} />
              <circle cx={258} cy={82} r={1.3} />
              <circle cx={230} cy={64} r={1.2} />
            </g>
            <g clipPath={`url(#${topClip})`} fill="none" stroke={P.outline} strokeWidth={STROKE}>
              <circle cx={284} cy={62} r={9} />
              <circle cx={285} cy={78} r={8} />
            </g>
          </g>
          {/* crumbs of the crime */}
          <g fill={P.pizzaCrust} stroke={P.outline} strokeWidth={1.4} strokeLinejoin="round">
            <path d="M290 98l4 -1l1 4l-4 1Z" />
            <path d="M284 108l3 0l0 3l-3 0Z" />
          </g>
          {/* toothpick with olive */}
          <path d="M240 56L240 30" stroke={P.outline} strokeWidth={5} strokeLinecap="round" />
          <path d="M240 56L240 30" stroke={P.parchmentDark} strokeWidth={2} strokeLinecap="round" />
          <circle cx={240} cy={34} r={6} fill={P.frogGreen} {...ol} strokeWidth={2.5} />
          <circle cx={240} cy={34} r={2} fill={P.crimson} />
        </g>

        {/* EXHIBIT A tag, tied to the stand */}
        <g className="chr-tag" style={{ transformBox: "view-box", transformOrigin: "222px 150px" }}>
          <path d="M222 150Q216 160 216 170" stroke={P.outline} strokeWidth={1.5} fill="none" />
          <g transform="rotate(-7 240 178)">
            <path d="M214 170H270V188H214L207 179Z" fill={P.goldLight} {...ol} strokeWidth={2.5} />
            <circle cx={215} cy={179} r={2} fill={P.outline} />
            <text x={243} y={183} textAnchor="middle" fontFamily='"Special Elite", "Courier New", monospace' fontSize={9} fill={P.burgundyDark}>
              EXHIBIT A
            </text>
          </g>
        </g>

        {/* ---------- bulldog ---------- */}
        <g className="chr-bob" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
          {/* stubby legs + shoes */}
          <path d="M70 196L72 234H96L98 196Z" fill={P.charcoal} {...ol} />
          <path d="M104 196L106 234H130L132 196Z" fill={P.charcoal} {...ol} />
          <path d="M62 246C62 236 70 232 84 232C96 232 100 238 100 246Z" fill={P.black} {...ol} />
          <path d="M102 246C102 238 106 232 118 232C132 232 140 236 140 246Z" fill={P.black} {...ol} />
          <path d="M70 238q6 -3 12 -2M110 237q6 -2 12 0" stroke={P.charcoal} strokeWidth={2} strokeLinecap="round" fill="none" />

          {/* massive V-shaped torso */}
          <path d="M28 98C40 80 70 72 100 72C130 72 160 80 172 98C176 130 156 170 136 200H64C44 170 24 130 28 98Z" fill={P.teal} {...ol} />
          <path d="M150 84C166 92 172 104 170 120C166 148 152 176 136 200H120C142 170 156 130 150 84Z" fill={SHADE} />
          {/* belt */}
          <path d="M62 190H138L134 204H66Z" fill={P.black} {...ol} />
          <rect x={92} y={189} width={16} height={14} rx={2} fill={P.gold} {...ol} strokeWidth={2.5} />
          {/* shoulder epaulettes */}
          <path d="M30 96C36 84 50 80 62 82L58 94C48 94 38 96 30 96Z" fill={P.gold} {...ol} strokeWidth={2.5} />
          <path d="M170 96C164 84 150 80 138 82L142 94C152 94 162 96 170 96Z" fill={P.gold} {...ol} strokeWidth={2.5} />

          {/* tiny head */}
          <g className="chr-head" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
            {/* neck collar */}
            <path d="M80 80Q100 92 120 80L118 72H82Z" fill={P.tealLight} {...ol} />
            <path d="M100 86L94 76H106Z" fill={P.ivory} {...ol} strokeWidth={2} />
            {/* rose ears */}
            <path d="M76 42C66 36 60 44 64 52L76 52Z" fill={P.bulldogDark} {...ol} />
            <path d="M124 42C134 36 140 44 136 52L124 52Z" fill={P.bulldogDark} {...ol} />
            {/* wide head with drooping jowls */}
            <path d="M72 46C72 34 86 28 100 28C114 28 128 34 128 46C134 54 136 70 130 78C126 84 118 84 113 79C108 83 92 83 87 79C82 84 74 84 70 78C64 70 66 54 72 46Z" fill={P.bulldog} {...ol} />
            <path d="M118 34C128 42 132 58 130 74C128 80 122 82 116 80C124 70 124 50 118 34Z" fill={SHADE} />
            {/* forehead wrinkles */}
            <path d="M90 40Q100 37 110 40M93 44Q100 42 107 44" stroke={P.bulldogDark} strokeWidth={2} strokeLinecap="round" fill="none" />
            {/* muzzle */}
            <path d="M82 62C82 54 92 52 100 55C108 52 118 54 118 62C120 72 112 79 100 79C88 79 80 72 82 62Z" fill={P.parchment} {...ol} strokeWidth={2.5} />
            <path d="M86 64Q82 72 88 78M114 64Q118 72 112 78" stroke={P.bulldogDark} strokeWidth={2} strokeLinecap="round" fill="none" />
            {/* underbite */}
            <path d="M89 74Q100 66 111 74" stroke={P.outline} strokeWidth={2.5} strokeLinecap="round" fill="none" />
            <path d="M92 73L94 66L97 71ZM103 71L106 66L108 73Z" fill={P.ivory} stroke={P.outline} strokeWidth={1.5} strokeLinejoin="round" />
            {/* big flat nose */}
            <path d="M91 58Q100 52 109 58Q107 64 100 65Q93 64 91 58Z" fill={P.black} {...ol} strokeWidth={2} />
            <path d="M95 57q3 -2 6 -1" stroke={P.charcoal} strokeWidth={2} strokeLinecap="round" fill="none" />
            {/* squinty, unimpressed eyes */}
            <g className="chr-blink" style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
              <path d="M82 51Q88 48 93 51Q88 55 82 51Z" fill={P.black} />
              <path d="M107 51Q112 48 118 51Q112 55 107 51Z" fill={P.black} />
            </g>
            <path d="M80 46L94 49M120 46L106 49" stroke={P.outline} strokeWidth={3.5} strokeLinecap="round" />
            {/* bailiff cap */}
            <path d="M76 36C76 24 86 18 100 18C114 18 124 24 124 36Z" fill={P.charcoal} {...ol} />
            <path d="M72 38Q100 30 128 38L126 42Q100 36 74 42Z" fill={P.black} {...ol} strokeWidth={2.5} />
            <path d="M100 22L105 26L103 32H97L95 26Z" fill={P.gold} stroke={P.outline} strokeWidth={1.8} strokeLinejoin="round" />
          </g>

          {/* chest badge + name bar */}
          <path d="M64 98L73 94L82 98L80 110L73 116L66 110Z" fill={P.gold} {...ol} strokeWidth={2.5} />
          <path d="M73 99L75 103H79L76 106L77 110L73 108L69 110L70 106L67 103H71Z" fill={P.goldDark} />
          <rect x={116} y={100} width={22} height={6} rx={2} fill={P.goldLight} stroke={P.outline} strokeWidth={2} />

          {/* arms, crossed with great authority */}
          <g className="chr-flex" style={{ transformBox: "fill-box", transformOrigin: "50% 60%" }}>
            {/* right upper arm */}
            <path d="M148 92C170 86 194 104 194 130C194 150 184 166 168 166C154 166 148 150 150 136C144 120 142 104 148 92Z" fill={P.bulldog} {...ol} />
            <path d="M180 120C190 132 190 150 178 162C186 146 186 134 180 120Z" fill={SHADE} />
            <path d="M162 138Q174 128 186 138" stroke={P.outline} strokeWidth={2} strokeLinecap="round" fill="none" />
            <path d="M148 92C170 86 192 100 193 118L150 125C144 112 142 100 148 92Z" fill={P.teal} {...ol} />
            <path d="M152 121L192 115" stroke={P.tealLight} strokeWidth={3} strokeLinecap="round" />
            {/* left forearm (behind), hand clamped on the right bicep */}
            <path d="M24 148C60 136 112 124 150 118L156 140C112 146 64 160 34 168C22 166 18 156 24 148Z" fill={P.bulldog} {...ol} />
            <path d="M148 116C158 108 172 110 176 118C180 128 174 138 164 140L150 142Z" fill={P.bulldog} {...ol} />
            <path d="M160 114Q166 124 160 138M168 114Q174 124 168 138" stroke={P.outline} strokeWidth={2} strokeLinecap="round" fill="none" />
            {/* right forearm (front), hand tucked under the left bicep */}
            <path d="M176 148C140 136 88 128 44 126L42 152C88 152 140 162 166 170C180 168 184 156 176 148Z" fill={P.bulldog} {...ol} />
            <path d="M166 170C140 162 88 152 44 152L45 145C90 145 140 155 176 161C176 166 172 169 166 170Z" fill={SHADE} />
            <path d="M70 134Q110 136 150 144" stroke={P.parchment} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.55} />
            <path d="M118 146C118 142 124 142 124 146C124 142 130 142 130 146C130 150 124 154 124 154C124 154 118 150 118 146Z" fill={P.crimson} stroke={P.outline} strokeWidth={1.5} />
            {/* left upper arm */}
            <path d="M52 92C30 86 6 104 6 130C6 150 16 166 32 166C46 166 52 150 50 136C56 120 58 104 52 92Z" fill={P.bulldog} {...ol} />
            <path d="M14 140C16 154 24 162 34 164C24 158 18 150 14 140Z" fill={SHADE} />
            <path d="M14 138Q26 128 38 138" stroke={P.outline} strokeWidth={2} strokeLinecap="round" fill="none" />
            <path d="M52 92C30 86 8 100 7 118L50 125C56 112 58 100 52 92Z" fill={P.teal} {...ol} />
            <path d="M8 115L48 121" stroke={P.tealLight} strokeWidth={3} strokeLinecap="round" />
          </g>
        </g>
      </g>
    </svg>
  );
}
