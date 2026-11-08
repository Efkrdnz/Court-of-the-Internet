import { useId } from "react";
import { P, STROKE } from "../palette";

const ol = {
  stroke: P.outline,
  strokeWidth: STROKE,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;
const SHADE = "rgba(26,15,18,0.2)";

const JACKET =
  "M70 112C64 138 66 162 76 180L112 188L150 180C162 160 166 130 156 106C140 98 98 98 70 112Z";

export function PigeonAttorney({ className, title }: { className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const label = title ?? "Pigeon attorney in a too-small pinstripe suit, clutching a battered briefcase";
  const sheen = `${uid}-sheen`;
  const suit = `${uid}-suit`;

  return (
    <svg
      viewBox="0 0 240 260"
      role="img"
      aria-label={label}
      className={["chr-root chr-pigeon", className].filter(Boolean).join(" ")}
      width="100%"
      overflow="visible"
    >
      <title>{label}</title>
      <defs>
        <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={P.tealLight} />
          <stop offset="0.5" stopColor={P.teal} />
          <stop offset="1" stopColor={P.plum} />
        </linearGradient>
        <clipPath id={suit}>
          <path d={JACKET} />
        </clipPath>
      </defs>

      <ellipse cx={122} cy={248} rx={86} ry={8} fill={P.shadow} />
      <g className="chr-figure">

        <g className="chr-bob" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
          {/* tail fan */}
          <path d="M150 188L214 214L210 232L142 212Z" fill={P.pigeonGrey} {...ol} />
          <path d="M194 206L214 214L210 232L190 225Z" fill={P.charcoal} {...ol} />
          <path d="M160 200L200 220M156 208L196 228" stroke={P.pigeonDark} strokeWidth={2} strokeLinecap="round" />

          {/* legs and feet */}
          {[102, 132].map((lx) => (
            <g key={lx}>
              <path d={`M${lx} 212L${lx - 2} 238`} stroke={P.outline} strokeWidth={9} strokeLinecap="round" />
              <path d={`M${lx} 212L${lx - 2} 238`} stroke={P.blush} strokeWidth={4} strokeLinecap="round" />
              <path
                d={`M${lx - 2} 238L${lx - 16} 244M${lx - 2} 238L${lx - 6} 246M${lx - 2} 238L${lx + 8} 244M${lx - 2} 238L${lx + 4} 232`}
                stroke={P.outline}
                strokeWidth={7}
                strokeLinecap="round"
              />
              <path
                d={`M${lx - 2} 238L${lx - 16} 244M${lx - 2} 238L${lx - 6} 246M${lx - 2} 238L${lx + 8} 244M${lx - 2} 238L${lx + 4} 232`}
                stroke={P.blush}
                strokeWidth={3}
                strokeLinecap="round"
              />
            </g>
          ))}

          <g className="chr-chest" style={{ transformBox: "fill-box", transformOrigin: "50% 80%" }}>
            {/* body */}
            <path d="M58 140C54 96 84 76 112 78C150 80 178 108 178 150C178 196 148 220 116 220C82 220 60 186 58 140Z" fill={P.pigeonGrey} {...ol} />
            <path d="M150 100C168 116 176 140 172 166C168 192 150 212 124 218C150 200 162 176 162 150C162 130 158 114 150 100Z" fill={SHADE} />
            {/* belly fluff escaping under the jacket */}
            <path d="M84 186Q92 196 100 188Q108 198 116 190Q124 198 132 188Q140 196 146 184" fill="none" stroke={P.outline} strokeWidth={2} strokeLinecap="round" />
            <path d="M98 204Q104 210 110 204M120 206Q126 212 132 205" fill="none" stroke={P.pigeonDark} strokeWidth={2} strokeLinecap="round" />

            {/* iridescent neck */}
            <path d="M78 70C72 88 70 102 72 118L150 110C144 92 132 78 120 70Z" fill={`url(#${sheen})`} {...ol} />
            <path d="M84 80C88 92 96 100 108 104" stroke={P.pigeonIris} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.8} />
            <path d="M122 84C128 92 132 100 134 108" stroke={P.plum} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.8} />

            {/* jacket, a size too small */}
            <path d={JACKET} fill={P.charcoal} {...ol} />
            <g clipPath={`url(#${suit})`}>
              {Array.from({ length: 13 }, (_, i) => (
                <path key={i} d={`M${66 + i * 8} 96L${64 + i * 8} 192`} stroke={P.pigeonGrey} strokeWidth={1} opacity={0.55} />
              ))}
              <path d="M138 104C156 116 162 150 150 182L170 182L170 100Z" fill={P.black} opacity={0.45} />
            </g>
            {/* straining shirt front */}
            <path d="M96 104L132 104L118 162L112 162Z" fill={P.ivory} {...ol} />
            <path d="M106 106Q112 118 110 132M124 106Q120 120 122 132" stroke={P.wigShade} strokeWidth={1.5} fill="none" />
            {/* tie */}
            <path d="M108 104L122 104L119 113L111 113Z" fill={P.burgundyDark} {...ol} strokeWidth={2.5} />
            <path d="M111 113L119 113L124 146L115 154L106 146Z" fill={P.crimson} {...ol} strokeWidth={2.5} />
            <path d="M110 122L121 118M108 134L122 128M108 145L123 139" stroke={P.burgundyDark} strokeWidth={2} strokeLinecap="round" />
            {/* lapels */}
            <path d="M96 104L84 112L94 124L88 132L114 164L102 116Z" fill={P.black} {...ol} />
            <path d="M132 104L146 110L136 124L142 132L116 164L128 116Z" fill={P.black} {...ol} />
            {/* pocket square */}
            <path d="M132 140L144 138L142 146Z" fill={P.ivory} {...ol} strokeWidth={2} />
            {/* hem with buttons hanging on for dear life */}
            <path d="M112 164L112 188" stroke={P.outline} strokeWidth={2} />
            <path d="M104 170l-6-3M104 176l-6 1M120 170l6-3M120 176l6 1" stroke={P.ivory} strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
            <circle cx={112} cy={172} r={4} fill={P.gold} {...ol} strokeWidth={2} />
            <g className="chr-pop-button" style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
              <circle cx={112} cy={182} r={4} fill={P.gold} {...ol} strokeWidth={2} />
            </g>
            {/* tiny sleeve stubs on the shoulders */}
            <path d="M72 112C60 124 58 142 64 156L78 154C76 140 78 128 84 118Z" fill={P.charcoal} {...ol} />
            <path d="M60 152C56 160 60 170 70 170C78 170 82 162 78 152Z" fill={P.pigeonGrey} {...ol} />
            <path d="M64 162l-2 6M70 164v6" stroke={P.outline} strokeWidth={2} strokeLinecap="round" />
          </g>

          {/* head */}
          <g transform="translate(-14 -10) scale(1.14)">
          <g className="chr-head" style={{ transformBox: "fill-box", transformOrigin: "60% 90%" }}>
            <path d="M70 58C70 36 86 24 104 26C124 28 134 44 132 62C130 78 118 88 100 88C82 88 70 76 70 58Z" fill={P.pigeonDark} {...ol} />
            <path d="M120 34C130 44 132 60 126 72C120 82 110 86 100 88C114 78 122 62 120 34Z" fill={SHADE} />
            <path d="M80 36Q88 30 96 30" stroke={P.pigeonGrey} strokeWidth={3} strokeLinecap="round" fill="none" />
            {/* beak + cere */}
            <path d="M74 54L48 62L73 66Z" fill={P.charcoal} {...ol} />
            <path d="M52 61L72 61" stroke={P.outline} strokeWidth={2} />
            <path d="M70 50C74 46 82 48 80 54C78 58 70 58 70 50Z" fill={P.ivory} {...ol} strokeWidth={2.5} />
            {/* smug little beak-corner smirk */}
            <path d="M74 66Q80 70 86 66" stroke={P.outline} strokeWidth={2.5} strokeLinecap="round" fill="none" />
            {/* side-eye */}
            <g className="chr-blink" style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
              <circle cx={96} cy={52} r={11} fill={P.beak} {...ol} />
              <circle cx={96} cy={52} r={7} fill={P.ivory} stroke={P.crimson} strokeWidth={2} />
              <circle cx={100} cy={53} r={4} fill={P.black} />
              <circle cx={98.5} cy={51} r={1.4} fill={P.white} />
              <path d="M84.6 49.5A11.5 11.5 0 0 1 107.4 48.5Z" fill={P.pigeonDark} {...ol} strokeWidth={2.5} />
            </g>
            {/* one confidently raised brow-feather */}
            <path d="M84 38Q96 30 108 36" stroke={P.outline} strokeWidth={4} strokeLinecap="round" fill="none" />
          </g>
          </g>

          {/* briefcase arm */}
          <path d="M152 110C168 120 176 140 176 162L162 166C160 150 156 136 146 126Z" fill={P.charcoal} {...ol} />
          <g className="chr-briefcase" style={{ transformBox: "view-box", transformOrigin: "176px 170px" }}>
            {/* handle */}
            <path d="M184 186V176Q184 170 190 170H202Q208 170 208 176V186" fill="none" stroke={P.outline} strokeWidth={8} strokeLinecap="round" />
            <path d="M184 186V176Q184 170 190 170H202Q208 170 208 176V186" fill="none" stroke={P.goldDark} strokeWidth={3.5} strokeLinecap="round" />
            {/* case */}
            <path d="M160 188Q160 182 166 182H226Q232 182 232 188V222Q232 228 226 228H166Q160 228 160 222Z" fill={P.owlBrown} {...ol} />
            <path d="M162 222V214Q196 220 230 212V222Q230 226 226 226H166Q162 226 162 222Z" fill={SHADE} />
            <path d="M160 196H232" stroke={P.outline} strokeWidth={2.5} />
            <path d="M166 188H200" stroke={P.owlLight} strokeWidth={2.5} strokeLinecap="round" />
            {/* clasps */}
            <rect x={170} y={192} width={10} height={9} rx={2} fill={P.gold} {...ol} strokeWidth={2} />
            <rect x={212} y={192} width={10} height={9} rx={2} fill={P.gold} {...ol} strokeWidth={2} />
            {/* duct-tape repair and a scuff */}
            <path d="M196 204L214 222M214 204L196 222" stroke={P.outline} strokeWidth={8} strokeLinecap="round" />
            <path d="M196 204L214 222M214 204L196 222" stroke={P.parchmentDark} strokeWidth={5} strokeLinecap="round" />
            <path d="M170 210q4 -2 8 1M174 216q3 -1 6 1" stroke={P.owlLight} strokeWidth={2} strokeLinecap="round" fill="none" />
            {/* a stray legal paper sticking out */}
            <path d="M224 182L230 168L238 172L232 184Z" fill={P.ivory} {...ol} strokeWidth={2} />
            <path d="M229 174l5 2" stroke={P.outline} strokeWidth={1.5} strokeLinecap="round" />
          </g>
          {/* wing-hand gripping the handle */}
          <path d="M168 160C164 168 170 178 182 180C194 182 202 176 200 170C196 164 180 160 168 160Z" fill={P.pigeonGrey} {...ol} />
          <path d="M178 168l14 2M176 174l16 2" stroke={P.pigeonDark} strokeWidth={2} strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
