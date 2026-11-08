import { useId } from "react";
import { P, STROKE } from "../palette";
import { laurelBranch } from "./Ornaments";

function useUid() {
  return "prp" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

const SHIELD = "M58 66H182V142C182 188 150 214 120 230C90 214 58 188 58 142Z";
const SHIELD_IN = "M68 76H172V142C172 181 145 203 120 218C95 203 68 181 68 142Z";

/** The Court of the Internet coat of arms. */
export function Crest({ className }: { className?: string }) {
  const uid = useUid();
  const g = `url(#${uid}-g)`;
  const o = { stroke: P.outline, strokeWidth: STROKE, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const label = "Court of the Internet crest";

  return (
    <svg viewBox="0 0 240 280" role="img" aria-label={label} className={className}>
      <title>{label}</title>
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.goldLight} />
          <stop offset="0.45" stopColor={P.gold} />
          <stop offset="1" stopColor={P.goldDark} />
        </linearGradient>
        <linearGradient id={`${uid}-field`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={P.burgundyLight} />
          <stop offset="1" stopColor={P.burgundyDark} />
        </linearGradient>
        <clipPath id={`${uid}-in`}>
          <path d={SHIELD_IN} />
        </clipPath>
        <path id={`${uid}-motto`} d="M44 247Q120 276 196 247" />
      </defs>

      {/* laurels behind the shield */}
      {laurelBranch({ p0: [96, 236], p1: [14, 196], p2: [36, 70], pairs: 8, leafScale: 1.05, fill: g })}
      <g transform="translate(240 0) scale(-1 1)">
        {laurelBranch({ p0: [96, 236], p1: [14, 196], p2: [36, 70], pairs: 8, leafScale: 1.05, fill: g })}
      </g>

      {/* shield */}
      <path d={SHIELD} fill={P.outline} opacity="0.25" transform="translate(3 4)" />
      <path d={SHIELD} fill={g} {...o} />
      <path d={SHIELD_IN} fill={`url(#${uid}-field)`} stroke={P.outline} strokeWidth="2" />
      <g clipPath={`url(#${uid}-in)`}>
        {/* damask lattice */}
        <g stroke={P.burgundyDark} strokeWidth="1.2" opacity="0.6">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M${20 + i * 18} 60L${-60 + i * 18} 240M${-40 + i * 18} 60L${40 + i * 18} 240`} />
          ))}
        </g>
        <path d="M68 76H172V100Q120 88 68 104Z" fill={P.white} opacity="0.06" />
      </g>
      {/* rivets */}
      {[
        [63, 71],
        [177, 71],
        [63, 140],
        [177, 140],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="2.2" fill={P.goldLight} stroke={P.outline} strokeWidth="1.2" />
      ))}

      {/* scales of justice: pizza vs controller */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="116.5" y="100" width="7" height="88" rx="2.5" fill={g} stroke={P.outline} strokeWidth="2" />
        <path d="M100 196H140L134 186H106Z" fill={g} stroke={P.outline} strokeWidth="2" />
        <path d="M80 104Q120 98 160 104" fill="none" stroke={P.outline} strokeWidth="7" />
        <path d="M80 104Q120 98 160 104" fill="none" stroke={P.gold} strokeWidth="3.4" />
        <circle cx="120" cy="100" r="6" fill={g} stroke={P.outline} strokeWidth="2" />
        <circle cx="120" cy="91" r="3.4" fill={g} stroke={P.outline} strokeWidth="1.6" />
        <path d="M82 105L68 147M82 105L96 147M158 105L144 147M158 105L172 147" fill="none" stroke={P.goldLight} strokeWidth="1.4" />

        {/* pizza in the left pan */}
        <g stroke={P.outline} strokeWidth="1.6">
          <path d="M70 129Q82 124 94 129L82 147Z" fill={P.pizzaCheese} />
          <path d="M69 128.5Q82 122 95 128.5L94 132Q82 126 70 132Z" fill={P.pizzaCrust} />
          <circle cx="78.5" cy="135" r="2.1" fill={P.pepperoni} />
          <circle cx="85" cy="137" r="1.7" fill={P.pepperoni} />
        </g>
        {/* game controller in the right pan */}
        <g stroke={P.outline} strokeWidth="1.6">
          <path d="M140 134H156C160 134 162 138 162.5 143C163 146 161 147.5 159 146L155.5 143H140.5L137 146C135 147.5 133 146 133.5 143C134 138 136 134 140 134Z" fill={P.ivory} />
          <path d="M140.5 137V141M138.5 139H142.5" fill="none" strokeWidth="1.4" />
          <circle cx="154" cy="138" r="1.2" fill={P.crimson} strokeWidth="0.8" />
          <circle cx="156.6" cy="140.6" r="1.2" fill={P.teal} strokeWidth="0.8" />
        </g>
        <path d="M64 147H100C98 156 91 160 82 160C73 160 66 156 64 147Z" fill={g} stroke={P.outline} strokeWidth="2" />
        <path d="M140 147H176C174 156 167 160 158 160C149 160 142 156 140 147Z" fill={g} stroke={P.outline} strokeWidth="2" />
      </g>

      {/* tiny powdered wig */}
      <g stroke={P.outline} strokeWidth="2" strokeLinejoin="round">
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={83 - i * 0.5} y={44 + i * 8} width="20" height="9" rx="4.5" fill={P.wig} />
            <rect x={137 + i * 0.5} y={44 + i * 8} width="20" height="9" rx="4.5" fill={P.wig} />
            <path d={`M${88 - i * 0.5} ${50.5 + i * 8}h9M${143 + i * 0.5} ${50.5 + i * 8}h9`} stroke={P.wigShade} strokeWidth="1.6" strokeLinecap="round" />
          </g>
        ))}
        <path d="M93 62C90 44 102 33 120 33C138 33 150 44 147 62C139 57.5 130 56 120 56C110 56 101 57.5 93 62Z" fill={P.wig} />
        <path d="M98 52C105 47.5 112 46.5 120 46.5C128 46.5 135 47.5 142 52M103 42.5C109 39.5 114 39 120 39C126 39 131 39.5 137 42.5" fill="none" stroke={P.wigShade} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M105 38.5Q111 35.5 118 35.2" fill="none" stroke={P.white} strokeWidth="2.4" strokeLinecap="round" />
      </g>

      {/* motto ribbon */}
      <g stroke={P.outline} strokeWidth={STROKE} strokeLinejoin="round">
        <path d="M44 240L22 236L32 250L20 264L52 262Z" fill={P.burgundyDark} />
        <path d="M196 240L218 236L208 250L220 264L188 262Z" fill={P.burgundyDark} />
        <path d="M40 236Q120 265 200 236L196 258Q120 287 44 258Z" fill={P.burgundy} />
      </g>
      <path d="M46 241Q120 268 194 241" fill="none" stroke={P.gold} strokeWidth="1.2" />
      <path d="M46 254Q120 281 194 254" fill="none" stroke={P.gold} strokeWidth="1.2" />
      <text
        fill={P.goldLight}
        fontFamily='"Playfair Display", Georgia, serif'
        fontWeight="800"
        fontSize="10.5"
        letterSpacing="1.6"
      >
        <textPath href={`#${uid}-motto`} startOffset="50%" textAnchor="middle">
          IN DUBIO PRO PIZZA
        </textPath>
      </text>
    </svg>
  );
}

/** "Court of the Internet" in blackletter with a small-caps tagline, as scalable SVG text. */
export function Wordmark({ className }: { className?: string }) {
  const uid = useUid();
  const label = "Court of the Internet — Est. 2026 · All Rise";
  return (
    <svg viewBox="0 0 520 124" role="img" aria-label={label} className={className}>
      <title>{label}</title>
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.goldLight} />
          <stop offset="0.5" stopColor={P.gold} />
          <stop offset="1" stopColor={P.goldDark} />
        </linearGradient>
      </defs>
      <text
        x="260"
        y="74"
        textAnchor="middle"
        fontFamily='"UnifrakturCook", serif'
        fontWeight="700"
        fontSize="64"
        textLength="492"
        lengthAdjust="spacingAndGlyphs"
        fill={P.burgundyDark}
        transform="translate(2.5 3)"
      >
        Court of the Internet
      </text>
      <text
        x="260"
        y="74"
        textAnchor="middle"
        fontFamily='"UnifrakturCook", serif'
        fontWeight="700"
        fontSize="64"
        textLength="492"
        lengthAdjust="spacingAndGlyphs"
        fill={`url(#${uid}-g)`}
        stroke={P.outline}
        strokeWidth="1.6"
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        Court of the Internet
      </text>
      <g fill="none" stroke={P.gold} strokeLinecap="round">
        <path d="M74 104H150M370 104H446" strokeWidth="1.6" />
        <path d="M96 108H150M370 108H424" strokeWidth="0.8" />
      </g>
      <path d="M64 104L68 100L72 104L68 108Z M456 104L452 100L448 104L452 108Z" fill={P.gold} />
      <text
        x="260"
        y="109"
        textAnchor="middle"
        fontFamily='"Playfair Display", Georgia, serif'
        fontWeight="800"
        fontSize="13"
        letterSpacing="3.2"
        fill={P.gold}
      >
        EST. 2026 · ALL RISE
      </text>
    </svg>
  );
}
