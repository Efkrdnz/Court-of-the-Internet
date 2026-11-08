import { useId } from "react";
import { P, STROKE } from "../palette";

/** A polished wooden gavel with gold bands resting on its sound block. */
export function Gavel({ className, slam }: { className?: string; slam?: boolean }) {
  const uid = "prp" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const label = slam ? "A gavel slamming down on its sound block" : "A wooden gavel on its sound block";
  const wood = `url(#${uid}-wood)`;
  const gold = `url(#${uid}-gold)`;
  const o = { stroke: P.outline, strokeWidth: STROKE, strokeLinejoin: "round" as const };

  return (
    <svg viewBox="0 0 260 200" role="img" aria-label={label} className={className} overflow="visible">
      <title>{label}</title>
      <defs>
        {/* cylindrical shading: light band left of centre, dark at the far edge */}
        <linearGradient id={`${uid}-wood`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={P.owlBrown} />
          <stop offset="0.28" stopColor={P.owlLight} />
          <stop offset="0.55" stopColor={P.owlBrown} />
          <stop offset="1" stopColor={P.raccoonDark} />
        </linearGradient>
        <linearGradient id={`${uid}-woodH`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={P.owlLight} />
          <stop offset="0.35" stopColor={P.owlBrown} />
          <stop offset="1" stopColor={P.raccoonDark} />
        </linearGradient>
        <linearGradient id={`${uid}-gold`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={P.goldDark} />
          <stop offset="0.3" stopColor={P.goldLight} />
          <stop offset="0.6" stopColor={P.gold} />
          <stop offset="1" stopColor={P.goldDark} />
        </linearGradient>
        <linearGradient id={`${uid}-goldV`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={P.goldLight} />
          <stop offset="0.5" stopColor={P.gold} />
          <stop offset="1" stopColor={P.goldDark} />
        </linearGradient>
      </defs>

      {/* floor shadow */}
      <ellipse cx="96" cy="184" rx="88" ry="9" fill={P.shadow} />

      {/* sound block */}
      <g>
        <path d="M18 150V168A62 14 0 0 0 142 168V150Z" fill={P.owlBrown} {...o} />
        <path d="M18 150V168A62 14 0 0 0 142 168V150A62 14 0 0 1 18 150Z" fill={P.raccoonDark} opacity="0.35" />
        <path d="M18 157A62 14 0 0 0 142 157V163A62 14 0 0 1 18 163Z" fill={gold} stroke={P.outline} strokeWidth="2" />
        <ellipse cx="80" cy="150" rx="62" ry="14" fill={P.bulldogDark} {...o} />
        <ellipse cx="80" cy="150" rx="46" ry="9.5" fill="none" stroke={P.raccoonDark} strokeWidth="2" opacity="0.45" />
        <path d="M36 146Q60 139 92 139" fill="none" stroke={P.owlLight} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      </g>

      {/* impact lines */}
      {slam && (
        <g
          className="prp-impact"
          strokeLinecap="round"
          fill="none"
          style={{ transformBox: "fill-box", transformOrigin: "50% 80%" }}
        >
          {["M40 128L24 116", "M32 142L12 140", "M120 128L136 116", "M128 142L148 140", "M80 112L80 100"].map((d) => (
            <g key={d}>
              <path d={d} stroke={P.outline} strokeWidth="6.5" />
              <path d={d} stroke={P.goldLight} strokeWidth="3" />
            </g>
          ))}
        </g>
      )}

      {/* the gavel itself; pivots at the end of the handle */}
      <g
        className={slam ? "prp-gavel-slam" : undefined}
        style={{ transformBox: "fill-box", transformOrigin: "93.6% 46%" }}
      >
        {/* handle */}
        <path d="M104 93L214 95.5V104.5L104 107Z" fill={`url(#${uid}-woodH)`} {...o} />
        <path d="M110 96.5L210 98" stroke={P.owlLight} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <rect x="106" y="90" width="14" height="20" rx="3" fill={`url(#${uid}-goldV)`} {...o} strokeWidth="2.5" />
        <rect x="208" y="92" width="9" height="16" rx="2.5" fill={`url(#${uid}-goldV)`} {...o} strokeWidth="2.5" />
        <ellipse cx="228" cy="100" rx="12" ry="10.5" fill={`url(#${uid}-woodH)`} {...o} />
        <ellipse cx="224" cy="96" rx="4" ry="2.4" fill="#fff" opacity="0.35" />

        {/* head: a vertical barrel, struck end down */}
        <path d="M52 70V136A28 7 0 0 0 108 136V70Z" fill={wood} {...o} />
        <path d="M52 82A28 7 0 0 0 108 82V90A28 7 0 0 1 52 90Z" fill={gold} stroke={P.outline} strokeWidth="2.2" />
        <path d="M52 116A28 7 0 0 0 108 116V124A28 7 0 0 1 52 124Z" fill={gold} stroke={P.outline} strokeWidth="2.2" />
        <path d="M52 103A28 7 0 0 0 108 103" fill="none" stroke={P.raccoonDark} strokeWidth="2" opacity="0.6" />
        <ellipse cx="80" cy="70" rx="28" ry="7" fill={P.owlLight} {...o} />
        <ellipse cx="80" cy="70" rx="17" ry="3.6" fill="none" stroke={P.owlBrown} strokeWidth="1.6" opacity="0.8" />
        <path d="M62 78V132" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
        <path d="M62 85V87M62 119V121" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
}
