import { useId } from "react";
import { P, STROKE } from "../palette";

export interface SceneProps {
  className?: string;
  title?: string;
}

const ink = { stroke: P.outline, strokeWidth: STROKE, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const inkLine = { ...ink, fill: "none" } as const;
const SERIF = "'Playfair Display', Georgia, serif";
const TYPEWRITER = "'Special Elite', 'Courier New', monospace";

function cls(base: string, extra?: string) {
  return [base, extra].filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/*  Shared courtroom bits                                              */
/* ------------------------------------------------------------------ */

function WallAndFloor({ w, h, floorY, uid }: { w: number; h: number; floorY: number; uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`scn-wall-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.parchment} />
          <stop offset="1" stopColor={P.parchmentDark} />
        </linearGradient>
      </defs>
      <rect width={w} height={floorY} fill={`url(#scn-wall-${uid})`} />
      {Array.from({ length: Math.ceil(w / 40) }, (_, i) => (
        <path key={i} d={`M${20 + i * 40} 0V${floorY - 40}`} stroke={P.parchmentDark} strokeWidth={6} opacity={0.5} />
      ))}
      <rect y={floorY - 40} width={w} height={40} fill={P.burgundyDark} />
      {Array.from({ length: Math.ceil(w / 52) }, (_, i) => (
        <rect key={i} x={8 + i * 52} y={floorY - 33} width={40} height={26} rx={2} fill="none" stroke={P.burgundy} strokeWidth={2.4} />
      ))}
      <path d={`M0 ${floorY - 40}H${w}`} stroke={P.goldDark} strokeWidth={3} />
      <rect y={floorY} width={w} height={h - floorY} fill={P.owlBrown} />
      <path d={`M0 ${floorY}H${w}`} {...inkLine} />
      {Array.from({ length: 4 }, (_, i) => (
        <path key={i} d={`M0 ${floorY + 7 + i * 8}H${w}`} stroke={P.bulldogDark} strokeWidth={1.4} opacity={0.6} />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  TumbleweedDocket                                                   */
/* ------------------------------------------------------------------ */

export function TumbleweedDocket({ className, title }: SceneProps) {
  const uid = useId().replace(/:/g, "");
  const label = title ?? "An empty courtroom bench with a NO CASES sign while a tumbleweed rolls past";
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label={label} className={cls("scn scn-tumbleweed-docket", className)} xmlns="http://www.w3.org/2000/svg">
      <title>{label}</title>
      <WallAndFloor w={320} h={200} floorY={172} uid={uid} />

      {/* drapes */}
      <path d="M0 0H60C58 20 40 36 20 40C12 70 8 100 0 132Z" fill={P.burgundy} {...ink} />
      <path d="M320 0H260C262 20 280 36 300 40C308 70 312 100 320 132Z" fill={P.burgundy} {...ink} />
      <path d="M14 8C22 22 18 60 8 110M34 6C38 18 34 28 26 36M306 8C298 22 302 60 312 110M286 6C282 18 286 28 294 36" stroke={P.burgundyDark} strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M0 0H320" stroke={P.goldDark} strokeWidth={6} />

      {/* court seal on the wall */}
      <circle cx={160} cy={34} r={18} fill={P.gold} {...ink} />
      <circle cx={160} cy={34} r={13} fill="none" stroke={P.goldDark} strokeWidth={2} />
      <path d="M160 24V43M150 29H170M150 29L146 37H154ZM170 29L166 37H174Z" stroke={P.outline} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" fill={P.goldLight} />

      {/* the judge's (empty) chair */}
      <path d="M136 98V64C136 50 146 44 160 44S184 50 184 64V98Z" fill={P.burgundyLight} {...ink} />
      <path d="M144 96V66C144 58 150 54 160 54S176 58 176 66V96" fill="none" stroke={P.burgundyDark} strokeWidth={2.4} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = Math.PI + (i / 6) * Math.PI;
        return <circle key={i} cx={160 + Math.cos(a) * 20} cy={66 + Math.sin(a) * 18} r={1.6} fill={P.goldLight} />;
      })}

      {/* bench */}
      <rect x={66} y={98} width={188} height={74} fill={P.owlBrown} {...ink} />
      <rect x={78} y={110} width={74} height={52} rx={2} fill="none" stroke={P.bulldogDark} strokeWidth={3} />
      <rect x={168} y={110} width={74} height={52} rx={2} fill="none" stroke={P.bulldogDark} strokeWidth={3} />
      <path d="M220 98H254V172H238Z" fill={P.bulldogDark} opacity={0.35} />
      <rect x={58} y={90} width={204} height={10} rx={2} fill={P.bulldog} {...ink} />
      <path d="M64 93H120" stroke={P.ivory} strokeWidth={2} strokeLinecap="round" opacity={0.6} />

      {/* cobweb */}
      <path d="M66 100L90 100M66 100L66 124M66 100L86 118M66 100L78 122M66 100L88 108M72 100Q72 106 66 106M80 100Q78 112 66 114M88 100Q84 118 66 122" stroke={P.ivory} strokeWidth={1} fill="none" opacity={0.85} />
      {/* dangling spider */}
      <path d="M232 100V128" stroke={P.ivory} strokeWidth={0.9} />
      <g>
        <path d="M226 128l-4-3M226 131l-5 0M226 134l-4 3M238 128l4-3M238 131l5 0M238 134l4 3" stroke={P.outline} strokeWidth={1.4} strokeLinecap="round" />
        <circle cx={232} cy={131} r={5} fill={P.charcoal} stroke={P.outline} strokeWidth={1.6} />
        <circle cx={230.4} cy={130.4} r={1.4} fill={P.white} />
        <circle cx={233.8} cy={130.4} r={1.4} fill={P.white} />
        <circle cx={230.6} cy={130.8} r={0.6} fill={P.black} />
        <circle cx={234} cy={130.8} r={0.6} fill={P.black} />
      </g>

      {/* idle gavel */}
      <g transform="rotate(-8 228 84)">
        <rect x={214} y={84} width={34} height={4.4} rx={2.2} fill={P.bulldog} stroke={P.outline} strokeWidth={2} />
        <rect x={204} y={76} width={14} height={14} rx={3} fill={P.owlBrown} stroke={P.outline} strokeWidth={2.2} />
        <path d="M207 77V89M215 77V89" stroke={P.gold} strokeWidth={2} />
      </g>

      {/* NO CASES sign */}
      <path d="M122 92L132 116M198 92L188 116" stroke={P.ink} strokeWidth={1.4} />
      <g transform="rotate(-4 160 132)">
        <path d="M102 113H218L215 153H105Z" fill={P.parchment} {...ink} />
        <path d="M105.5 147H215.5L215 153H105Z" fill={P.parchmentDark} />
        <circle cx={132} cy={117} r={2} fill={P.outline} />
        <circle cx={188} cy={117} r={2} fill={P.outline} />
        <text x={160} y={137} textAnchor="middle" fontFamily={SERIF} fontWeight={900} fontSize={18} letterSpacing={0.4} fill={P.crimson}>
          NO CASES
        </text>
        <text x={160} y={148} textAnchor="middle" fontFamily={TYPEWRITER} fontSize={7.5} fill={P.ink}>
          (court is very bored)
        </text>
      </g>

      {/* tumbleweed */}
      <g className="scn-dust">
        <path d="M4 192q4-6 9-2q4-5 9 0q-3 5-9 4q-5 3-9-2Z" fill={P.parchment} opacity={0.75} />
        <path d="M18 176h-12M22 168h-8" stroke={P.parchment} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
      </g>
      <g className="scn-tumbleweed" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <g transform="translate(-14 -40) scale(1.25)">
        <circle cx={48} cy={170} r={17} fill={P.owlLight} opacity={0.55} />
        <g fill="none" strokeLinecap="round">
          <ellipse cx={48} cy={170} rx={17} ry={14} stroke={P.outline} strokeWidth={3.2} transform="rotate(20 48 170)" />
          <ellipse cx={48} cy={170} rx={17} ry={14} stroke={P.bulldogDark} strokeWidth={1.6} transform="rotate(20 48 170)" />
          <ellipse cx={47} cy={170} rx={15} ry={9} stroke={P.bulldogDark} strokeWidth={2} transform="rotate(-35 48 170)" />
          <ellipse cx={49} cy={169} rx={12} ry={15} stroke={P.owlBrown} strokeWidth={1.8} transform="rotate(60 48 170)" />
          <ellipse cx={48} cy={171} rx={9} ry={14} stroke={P.bulldogDark} strokeWidth={1.6} />
          <ellipse cx={48} cy={170} rx={6} ry={10} stroke={P.owlBrown} strokeWidth={1.6} transform="rotate(-70 48 170)" />
          <path d="M34 162q8 4 12-6M58 160q-4 10 6 12M40 182q4-8 14-4M60 178q-8-2-10 8M36 172q6-2 8 4" stroke={P.outline} strokeWidth={1.6} />
          <path d="M31 166l-4-2M65 166l4-3M46 153l-1-4M54 186l2 4M33 178l-4 2" stroke={P.outline} strokeWidth={1.6} />
        </g>
        </g>
      </g>
      <path d="M76 172h14M72 180h20" stroke={P.ivory} strokeWidth={2} strokeLinecap="round" opacity={0.5} className="scn-dust" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  ConfusedPigeon                                                     */
/* ------------------------------------------------------------------ */

function QMark({ x, y, size, rot, color, n }: { x: number; y: number; size: number; rot: number; color: string; n: number }) {
  return (
    <g className={`scn-question scn-question-${n}`} style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
      <text
        x={x}
        y={y}
        transform={`rotate(${rot} ${x} ${y})`}
        textAnchor="middle"
        fontFamily={SERIF}
        fontWeight={900}
        fontSize={size}
        fill={color}
        stroke={P.outline}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        ?
      </text>
    </g>
  );
}

export function ConfusedPigeon({ className, title }: SceneProps) {
  const uid = useId().replace(/:/g, "");
  const label = title ?? "A confused pigeon in a barrister's wig holding a map upside down";
  return (
    <svg viewBox="0 0 240 230" role="img" aria-label={label} className={cls("scn scn-confused-pigeon", className)} xmlns="http://www.w3.org/2000/svg">
      <title>{label}</title>
      <defs>
        <clipPath id={`scn-body-${uid}`}>
          <ellipse cx={120} cy={152} rx={48} ry={54} />
        </clipPath>
      </defs>
      <ellipse cx={120} cy={214} rx={70} ry={9} fill={P.shadow} />

      <QMark x={56} y={70} size={42} rot={-16} color={P.crimson} n={1} />
      <QMark x={186} y={52} size={30} rot={14} color={P.gold} n={2} />
      <QMark x={202} y={104} size={20} rot={24} color={P.burgundyLight} n={3} />

      {/* feet */}
      <path d="M104 198v10M104 208l-7 4M104 208l1 6M104 208l7 3M136 198v10M136 208l-7 3M136 208l-1 6M136 208l7 4" stroke={P.outline} strokeWidth={6} strokeLinecap="round" />
      <path d="M104 198v10M104 208l-7 4M104 208l1 6M104 208l7 3M136 198v10M136 208l-7 3M136 208l-1 6M136 208l7 4" stroke={P.blush} strokeWidth={3} strokeLinecap="round" />

      {/* tail */}
      <path d="M150 180L186 200L180 186L192 188L160 166Z" fill={P.pigeonDark} {...ink} />

      {/* body */}
      <ellipse cx={120} cy={152} rx={48} ry={54} fill={P.pigeonGrey} {...ink} />
      <g clipPath={`url(#scn-body-${uid})`}>
        <path d="M150 110C174 140 170 190 130 210H180V100Z" fill={P.pigeonDark} opacity={0.5} />
        <path d="M78 116C96 106 144 106 162 116L164 132C144 122 96 122 76 132Z" fill={P.teal} opacity={0.9} />
        <path d="M76 128C96 118 144 118 164 128L166 140C144 132 96 132 74 140Z" fill={P.plum} opacity={0.9} />
      </g>
      <ellipse cx={120} cy={152} rx={48} ry={54} fill="none" {...ink} />

      {/* jabot */}
      <path d="M112 116H128C130 124 134 132 138 140Q134 144 130 141Q125 146 120 142Q115 146 110 141Q106 144 102 140C106 132 110 124 112 116Z" fill={P.ivory} {...ink} strokeWidth={2.2} />
      <path d="M116 120Q114 130 111 139M124 120Q126 130 129 139" stroke={P.wigShade} strokeWidth={1.6} fill="none" strokeLinecap="round" />

      {/* head */}
      <circle cx={120} cy={82} r={32} fill={P.pigeonGrey} {...ink} />
      <path d="M142 60C156 78 150 104 126 112C144 100 148 80 142 60Z" fill={P.pigeonDark} opacity={0.55} />

      {/* barrister wig */}
      <path d="M92 62C102 44 138 44 148 62L154 96L144 98C142 80 136 70 120 68C104 70 98 80 96 98L86 96Z" fill={P.wigShade} {...ink} />
      <path d="M86 70C84 46 102 36 120 36S156 46 154 70L144 66C142 58 134 52 120 52S98 58 96 66Z" fill={P.wig} {...ink} />
      <path d="M100 48q8-6 18-6M124 42q10 0 16 6" stroke={P.wigShade} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {[66, 76, 86].map((y) => (
        <g key={y}>
          <rect x={80} y={y} width={18} height={9} rx={4.5} fill={P.wig} {...ink} strokeWidth={2.4} />
          <circle cx={84.5} cy={y + 4.5} r={2} fill="none" stroke={P.wigShade} strokeWidth={1.6} />
          <rect x={142} y={y} width={18} height={9} rx={4.5} fill={P.wig} {...ink} strokeWidth={2.4} />
          <circle cx={155.5} cy={y + 4.5} r={2} fill="none" stroke={P.wigShade} strokeWidth={1.6} />
        </g>
      ))}

      {/* derpy eyes */}
      <circle cx={108} cy={80} r={9} fill={P.white} {...ink} strokeWidth={2.4} />
      <circle cx={133} cy={80} r={9} fill={P.white} {...ink} strokeWidth={2.4} />
      <circle cx={105} cy={76.5} r={5.4} fill={P.beak} />
      <circle cx={105} cy={76.5} r={3} fill={P.black} />
      <circle cx={136.5} cy={83} r={5.4} fill={P.beak} />
      <circle cx={136.5} cy={83} r={3} fill={P.black} />
      <circle cx={106.6} cy={75} r={1.2} fill={P.white} />
      <circle cx={138} cy={81.5} r={1.2} fill={P.white} />
      <path d="M98 68q8-5 16 0M126 70q7-2 15 2" {...inkLine} strokeWidth={2.4} />

      {/* beak */}
      <path d="M114 90H126L120 104Z" fill={P.pigeonDark} {...ink} strokeWidth={2.4} />
      <ellipse cx={120} cy={90.5} rx={6.5} ry={3.2} fill={P.ivory} {...ink} strokeWidth={2} />

      {/* upside-down map */}
      <g transform="rotate(6 120 166)">
        <path d="M70 144L102 150L138 144L170 150V190L138 184L102 190L70 184Z" fill={P.parchment} {...ink} />
        <path d="M102 150V190M138 144V184" stroke={P.parchmentDark} strokeWidth={2.4} />
        <path d="M102 150L138 144V184L102 190Z" fill={P.parchmentDark} opacity={0.45} />
        <g transform="rotate(180 120 167)">
          <path d="M80 182C92 176 96 160 112 164S132 176 150 160" fill="none" stroke={P.crimson} strokeWidth={2} strokeDasharray="4 3" strokeLinecap="round" />
          <path d="M146 156l8 8M154 156l-8 8" stroke={P.crimson} strokeWidth={3} strokeLinecap="round" />
          <path d="M84 162l6-10 6 10ZM92 162l5-7 5 7Z" fill={P.parchmentDark} stroke={P.ink} strokeWidth={1.4} strokeLinejoin="round" />
          <path d="M124 186c4-4 8 2 12-2s8 2 12-2" fill="none" stroke={P.teal} strokeWidth={2} strokeLinecap="round" />
          <text x={120} y={158} textAnchor="middle" fontFamily={SERIF} fontWeight={900} fontSize={9} fill={P.ink}>
            MAP
          </text>
          <g transform="translate(160 176)">
            <circle r={6.5} fill={P.ivory} stroke={P.ink} strokeWidth={1.4} />
            <path d="M0 -5L2 0L0 5L-2 0Z" fill={P.crimson} />
            <text y={-8} textAnchor="middle" fontFamily={SERIF} fontWeight={900} fontSize={7} fill={P.ink}>
              N
            </text>
          </g>
        </g>
      </g>

      {/* wings gripping the map */}
      <path d="M76 128C62 140 60 158 70 168C76 166 80 158 82 150Z" fill={P.pigeonGrey} {...ink} />
      <path d="M164 128C178 140 180 158 170 168C164 166 160 158 158 150Z" fill={P.pigeonGrey} {...ink} />
      <path d="M68 156l8-2M70 162l7-3M172 156l-8-2M170 162l-7-3" stroke={P.pigeonDark} strokeWidth={2.4} strokeLinecap="round" />
      {/* sweat */}
      <path d="M168 56C172 62 172 66 168 66S164 62 168 56Z" fill={P.tear} {...ink} strokeWidth={1.8} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  SleepingBailiff                                                    */
/* ------------------------------------------------------------------ */

export function SleepingBailiff({ className, title }: SceneProps) {
  const uid = useId().replace(/:/g, "");
  const label = title ?? "A bulldog bailiff fast asleep at his desk next to a cold cup of coffee";
  return (
    <svg viewBox="0 0 320 220" role="img" aria-label={label} className={cls("scn scn-sleeping-bailiff", className)} xmlns="http://www.w3.org/2000/svg">
      <title>{label}</title>
      <WallAndFloor w={320} h={220} floorY={196} uid={uid} />

      {/* wall clock */}
      <circle cx={62} cy={48} r={20} fill={P.ivory} {...ink} />
      <circle cx={62} cy={48} r={15} fill="none" stroke={P.parchmentDark} strokeWidth={1.6} />
      <path d="M62 48V36M62 48L72 52" {...inkLine} strokeWidth={2.4} />
      <circle cx={62} cy={48} r={2} fill={P.outline} />
      <path d="M62 31v3M79 48h-3M62 65v-3M45 48h3" stroke={P.outline} strokeWidth={1.6} strokeLinecap="round" />

      {/* Z's */}
      <g fontFamily={SERIF} fontWeight={900} fill={P.ivory} stroke={P.outline} strokeWidth={STROKE} strokeLinejoin="round" paintOrder="stroke">
        <text x={200} y={84} fontSize={16} className="scn-z scn-z-1" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          Z
        </text>
        <text x={218} y={62} fontSize={22} className="scn-z scn-z-2" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          Z
        </text>
        <text x={240} y={36} fontSize={30} className="scn-z scn-z-3" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          Z
        </text>
      </g>

      {/* body in uniform */}
      <path d="M104 152C104 122 128 108 160 108S216 122 216 152Z" fill={P.charcoal} {...ink} />
      <path d="M190 116C206 124 214 136 216 152H200C200 138 196 126 190 116Z" fill={P.black} opacity={0.5} />
      <path d="M136 112L160 128L184 112" fill="none" stroke={P.black} strokeWidth={3} />
      <path d="M196 126l3 6 6.5 1-4.7 4.5 1.1 6.5-5.9-3.1-5.9 3.1 1.1-6.5-4.7-4.5 6.5-1Z" fill={P.gold} stroke={P.outline} strokeWidth={1.8} strokeLinejoin="round" />

      {/* desk top */}
      <rect x={30} y={148} width={260} height={10} rx={2} fill={P.bulldog} {...ink} />

      {/* folded arms */}
      <path d="M98 146C98 136 108 132 124 134L168 138V150H104C100 150 98 148 98 146Z" fill={P.charcoal} {...ink} />
      <path d="M222 146C222 136 212 132 196 134L152 138V150H216C220 150 222 148 222 146Z" fill={P.charcoal} {...ink} />
      <path d="M108 136V149M212 136V149" stroke={P.gold} strokeWidth={3} />
      <ellipse cx={130} cy={144} rx={9} ry={5} fill={P.bulldog} {...ink} strokeWidth={2.2} />
      <ellipse cx={190} cy={144} rx={9} ry={5} fill={P.bulldog} {...ink} strokeWidth={2.2} />

      {/* head, resting */}
      <g transform="rotate(-10 160 116)">
        <path d="M128 98C118 92 110 100 116 110C120 108 124 106 128 107Z" fill={P.bulldogDark} {...ink} />
        <path d="M192 98C202 92 210 100 204 110C200 108 196 106 192 107Z" fill={P.bulldogDark} {...ink} />
        <path d="M122 114C122 98 138 90 160 90S198 98 198 114C200 126 194 138 180 142C170 146 150 146 140 142C126 138 120 126 122 114Z" fill={P.bulldog} {...ink} />
        <path d="M192 116C194 128 188 138 176 141C168 143 156 144 148 143C170 140 186 132 192 116Z" fill={P.bulldogDark} opacity={0.4} />
        <path d="M146 100q14-5 28 0" stroke={P.bulldogDark} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <path d="M136 111q7.5 6 15 0M169 111q7.5 6 15 0" {...inkLine} strokeWidth={3} />
        <path d="M138 115.5l-2 2.6M143.5 117l-.4 3M149 115.5l2 2.6M171 115.5l-2 2.6M176.5 117l-.4 3M182 115.5l2 2.6" {...inkLine} strokeWidth={1.6} />
        <path d="M136 125C134 138 154 142 160 132C166 142 186 138 184 125C180 118 170 117 160 119C150 117 140 118 136 125Z" fill={P.parchment} {...ink} strokeWidth={2.4} />
        <path d="M152 122C152 118 168 118 168 122C168 126 163 128 160 128S152 126 152 122Z" fill={P.black} {...ink} strokeWidth={1.8} />
        <ellipse cx={156.5} cy={121.2} rx={2} ry={1} fill={P.white} opacity={0.7} />
        <path d="M176 133C178 137 178 141 177 146" stroke={P.tear} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.85} />
        <g className="scn-bubble" style={{ transformBox: "fill-box", transformOrigin: "100% 50%" }}>
          <circle cx={147} cy={130} r={6.5} fill={P.tear} fillOpacity={0.45} stroke={P.outline} strokeWidth={1.8} />
          <path d="M143.5 127.5a3 3 0 0 1 3-2" stroke={P.white} strokeWidth={1.5} strokeLinecap="round" fill="none" />
        </g>
        {/* bailiff cap slipping off */}
        <g transform="translate(0 -7) rotate(9 160 92)">
          <path d="M132 92C130 76 144 68 160 68S190 76 188 92Z" fill={P.charcoal} {...ink} />
          <path d="M132 92H188L190 98H130Z" fill={P.black} {...ink} strokeWidth={2.4} />
          <path d="M136 98C146 106 174 106 184 98" fill={P.black} {...ink} strokeWidth={2.4} />
          <path d="M160 74l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8Z" fill={P.gold} stroke={P.outline} strokeWidth={1.4} strokeLinejoin="round" />
          <path d="M140 80q6-7 14-8" stroke={P.white} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.3} />
        </g>
      </g>

      {/* desk front */}
      <rect x={38} y={158} width={244} height={38} fill={P.owlBrown} {...ink} />
      <path d="M240 158H282V196H262Z" fill={P.bulldogDark} opacity={0.35} />
      <rect x={124} y={166} width={72} height={20} rx={3} fill={P.gold} {...ink} strokeWidth={2.4} />
      <rect x={128} y={169} width={64} height={14} rx={2} fill="none" stroke={P.goldDark} strokeWidth={1.4} />
      <text x={160} y={180.5} textAnchor="middle" fontFamily={SERIF} fontWeight={900} fontSize={10.5} letterSpacing={1.5} fill={P.burgundyDark}>
        BAILIFF
      </text>

      {/* paperwork + donut */}
      <path d="M48 148L54 128L100 130L96 148Z" fill={P.ivory} {...ink} strokeWidth={2.4} />
      <path d="M46 148L50 134L96 136L94 148Z" fill={P.parchment} {...ink} strokeWidth={2.4} />
      <text x={70} y={145} transform="rotate(4 70 145)" textAnchor="middle" fontFamily={TYPEWRITER} fontSize={7} fill={P.crimson}>
        URGENT
      </text>
      <g transform="translate(80 128)">
        <ellipse cx={0} cy={0} rx={12} ry={5.5} fill={P.pizzaCrust} {...ink} strokeWidth={2.2} />
        <path d="M-10 -1C-8 -5 8 -5 10 -1C6 1 -6 1 -10 -1Z" fill={P.blush} />
        <ellipse cx={0} cy={-1} rx={3.6} ry={1.4} fill={P.bulldogDark} />
        <path d="M-3 -3.4l1 -.6M3 -3l1 .4M6 -1.6l.8 .6" stroke={P.ivory} strokeWidth={1.2} strokeLinecap="round" />
        <circle cx={10} cy={-2} r={3.4} fill={P.parchment} />
      </g>

      {/* coffee */}
      <g className="scn-steam" style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
        <path d="M240 118c-4-6 4-8 0-14M250 116c-4-6 4-8 0-14" stroke={P.ivory} strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={0.9} />
      </g>
      <path d="M260 128a7 7 0 0 1 0 14" fill="none" stroke={P.outline} strokeWidth={7} />
      <path d="M260 128a7 7 0 0 1 0 14" fill="none" stroke={P.ivory} strokeWidth={3} />
      <path d="M230 122H262L259 148H233Z" fill={P.ivory} {...ink} />
      <path d="M231 131H261L260.2 138H231.8Z" fill={P.burgundy} />
      <path d="M254 124L251 146" stroke={P.parchmentDark} strokeWidth={3} />
      <ellipse cx={246} cy={122} rx={16} ry={2.6} fill={P.ink} {...ink} strokeWidth={2} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  SealedCase                                                         */
/* ------------------------------------------------------------------ */

function Chain({ x1, y1, x2, y2, n }: { x1: number; y1: number; x2: number; y2: number; n: number }) {
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        const edge = i % 2 === 1;
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})`}>
            {edge ? (
              <rect x={-9} y={-2} width={18} height={4} rx={2} fill={P.pigeonDark} stroke={P.outline} strokeWidth={2} />
            ) : (
              <>
                <rect x={-9.5} y={-6} width={19} height={12} rx={6} fill="none" stroke={P.outline} strokeWidth={6} />
                <rect x={-9.5} y={-6} width={19} height={12} rx={6} fill="none" stroke={P.pigeonGrey} strokeWidth={2.6} />
                <path d="M-6 -6H4" stroke={P.white} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

export function SealedCase({ className, title }: SceneProps) {
  const label = title ?? "A case file wrapped in red tape and chains, sealed by order of the court";
  return (
    <svg viewBox="0 0 300 230" role="img" aria-label={label} className={cls("scn scn-sealed-case", className)} xmlns="http://www.w3.org/2000/svg">
      <title>{label}</title>
      <ellipse cx={150} cy={196} rx={120} ry={10} fill={P.shadow} />

      <g transform="rotate(-4 150 110)">
        {/* folder back + tab */}
        <path d="M54 34H110L118 26H54Z" fill={P.parchmentDark} {...ink} />
        <rect x={50} y={32} width={200} height={152} rx={4} fill={P.parchmentDark} {...ink} />
        {/* papers peeking */}
        <path d="M66 22L232 30L230 70L64 62Z" fill={P.ivory} {...ink} strokeWidth={2.4} />
        <path d="M74 32L150 36M74 40L210 46M74 48L190 53" stroke={P.parchmentDark} strokeWidth={2} strokeLinecap="round" />
        <path d="M60 40L226 36L228 70L60 74Z" fill={P.white} {...ink} strokeWidth={2.4} />
        <path d="M70 50L130 49M70 58L200 55" stroke={P.parchmentDark} strokeWidth={2} strokeLinecap="round" />
        {/* front cover */}
        <path d="M46 58H254L250 188H50Z" fill={P.parchment} {...ink} />
        <path d="M230 58H254L250 188H222C232 150 234 100 230 58Z" fill={P.parchmentDark} opacity={0.6} />
        {/* label */}
        <rect x={66} y={70} width={104} height={34} rx={2} fill={P.ivory} stroke={P.outline} strokeWidth={2} />
        <text x={72} y={82} fontFamily={TYPEWRITER} fontSize={8} fill={P.ink}>
          CASE No. 404-B
        </text>
        <rect x={72} y={87} width={70} height={5} fill={P.black} />
        <rect x={72} y={95} width={46} height={5} fill={P.black} />
        <rect x={122} y={95} width={30} height={5} fill={P.black} />

        {/* red tape */}
        <path d="M46 120H254L253.4 136H46.6Z" fill={P.crimson} {...ink} strokeWidth={2.4} />
        <path d="M180 58H196L196 188H180Z" fill={P.crimson} {...ink} strokeWidth={2.4} />
        <path d="M54 128H174M202 128H246" stroke={P.ivory} strokeWidth={1.6} strokeDasharray="10 5" opacity={0.75} />
        <path d="M188 66V114M188 142V180" stroke={P.ivory} strokeWidth={1.6} strokeDasharray="10 5" opacity={0.75} />
        <path d="M46 123H254M180 58V188" stroke={P.burgundyDark} strokeWidth={1.4} opacity={0.6} />
      </g>

      {/* chains */}
      <Chain x1={14} y1={80} x2={286} y2={150} n={17} />
      <Chain x1={14} y1={150} x2={286} y2={80} n={17} />

      {/* padlock */}
      <g transform="translate(150 115)">
        <path d="M-9 -2V-10C-9 -22 9 -22 9 -10V-2" fill="none" stroke={P.outline} strokeWidth={8.6} strokeLinecap="round" />
        <path d="M-9 -2V-10C-9 -22 9 -22 9 -10V-2" fill="none" stroke={P.pigeonGrey} strokeWidth={4} strokeLinecap="round" />
        <rect x={-15} y={-4} width={30} height={24} rx={5} fill={P.gold} {...ink} />
        <path d="M-12 14H12V16Q12 17.5 10.5 17.5H-10.5Q-12 17.5 -12 16Z" fill={P.goldDark} />
        <circle cx={0} cy={5} r={3.4} fill={P.outline} />
        <path d="M-1.5 6.5L-2.4 12.5H2.4L1.5 6.5Z" fill={P.outline} />
        <path d="M-11 0h8" stroke={P.goldLight} strokeWidth={2} strokeLinecap="round" />
      </g>

      {/* wax seal with ribbon tails */}
      <g transform="translate(222 150)">
        <path d="M-8 14L-22 50L-14 45L-10 54L2 18Z" fill={P.burgundy} {...ink} strokeWidth={2.4} />
        <path d="M8 14L18 50L23 42L30 48L14 12Z" fill={P.burgundy} {...ink} strokeWidth={2.4} />
        <path
          d="M0 -30C8 -32 12 -26 18 -24C26 -22 28 -14 30 -8C33 0 30 6 30 12C28 20 20 22 16 27C10 32 2 30 -4 31C-12 32 -16 26 -22 23C-28 18 -30 12 -31 4C-32 -4 -27 -10 -25 -16C-22 -24 -14 -26 -8 -28C-5 -29 -3 -29.6 0 -30Z"
          fill={P.crimson}
          {...ink}
        />
        <circle cx={0} cy={0} r={20} fill={P.burgundyLight} stroke={P.burgundyDark} strokeWidth={2.6} />
        <circle cx={0} cy={0} r={15.5} fill="none" stroke={P.burgundyDark} strokeWidth={1.2} strokeDasharray="2 2" />
        <g transform="rotate(-30)" stroke={P.burgundyDark} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <rect x={-10} y={-8} width={16} height={8} rx={2} fill={P.crimson} />
          <path d="M-2 0V12" />
        </g>
        <path d="M-9 10H7" stroke={P.burgundyDark} strokeWidth={2.4} strokeLinecap="round" />
        <path d="M-20 -14Q-14 -24 -2 -26" stroke={P.blush} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.7} />
      </g>

      {/* banner */}
      <g>
        <path d="M20 196L36 196L36 210L42 216L14 216L20 206Z" fill={P.burgundyDark} {...ink} strokeWidth={2.4} />
        <path d="M280 196L264 196L264 210L258 216L286 216L280 206Z" fill={P.burgundyDark} {...ink} strokeWidth={2.4} />
        <path d="M32 190H268V210H32Z" fill={P.burgundy} {...ink} />
        <path d="M32 193.5H268" stroke={P.goldDark} strokeWidth={1.2} />
        <path d="M32 206.5H268" stroke={P.goldDark} strokeWidth={1.2} />
        <text x={150} y={204} textAnchor="middle" fontFamily={SERIF} fontWeight={900} fontSize={10.5} letterSpacing={0.9} fill={P.goldLight}>
          SEALED BY ORDER OF THE COURT
        </text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  GavelLoading                                                       */
/* ------------------------------------------------------------------ */

export function GavelLoading({ className, title }: SceneProps) {
  const label = title ?? "Loading";
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className={cls("scn scn-loading", className)} xmlns="http://www.w3.org/2000/svg">
      <title>{label}</title>
      <ellipse cx={52} cy={106} rx={34} ry={5} fill={P.shadow} />

      {/* sound block */}
      <g className="scn-loading-block" style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
        <path d="M22 92V100C22 104 82 104 82 100V92Z" fill={P.owlBrown} {...ink} />
        <ellipse cx={52} cy={92} rx={30} ry={6} fill={P.bulldog} {...ink} />
        <path d="M34 90q6-2 14-2.4" stroke={P.parchment} strokeWidth={2} strokeLinecap="round" fill="none" />
      </g>

      {/* impact */}
      <g className="scn-loading-impact" stroke={P.outline} strokeWidth={STROKE} strokeLinecap="round" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <path d="M14 82l-6-4M12 90H4M70 82l6-5M74 90h8" />
      </g>

      {/* gavel (pivots at the handle end) */}
      <g className="scn-loading-gavel" style={{ transformBox: "fill-box", transformOrigin: "96% 30%" }}>
        <path d="M50 66L110 56" stroke={P.outline} strokeWidth={10} strokeLinecap="round" />
        <path d="M50 66L110 56" stroke={P.bulldog} strokeWidth={5} strokeLinecap="round" />
        <path d="M60 63L108 55" stroke={P.ivory} strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
        <rect x={38} y={50} width={26} height={36} rx={5} fill={P.owlBrown} {...ink} transform="rotate(-9 51 68)" />
        <g transform="rotate(-9 51 68)">
          <path d="M56 52H62V84H56Z" fill={P.bulldogDark} opacity={0.5} />
          <rect x={35.5} y={56} width={31} height={6} rx={2} fill={P.gold} stroke={P.outline} strokeWidth={2.2} />
          <rect x={35.5} y={74} width={31} height={6} rx={2} fill={P.gold} stroke={P.outline} strokeWidth={2.2} />
          <path d="M43 53V83" stroke={P.owlLight} strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />
        </g>
      </g>
    </svg>
  );
}
