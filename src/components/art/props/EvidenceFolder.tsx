import { useId } from "react";
import { P, STROKE } from "../palette";

/** A manila case folder stuffed with evidence. `open` folds the front cover down. */
export function EvidenceFolder({
  className,
  label = "CASE No. 404",
  open,
}: {
  className?: string;
  label?: string;
  open?: boolean;
}) {
  const uid = "prp" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const aria = `Evidence folder, ${label}${open ? ", open" : ""}`;
  const o = { stroke: P.outline, strokeWidth: STROKE, strokeLinejoin: "round" as const };
  const classes = [className, open ? "prp-folder-open" : null].filter(Boolean).join(" ") || undefined;
  const typewriter = '"Special Elite", "Courier New", monospace';

  return (
    <svg viewBox="0 0 260 210" role="img" aria-label={aria} className={classes}>
      <title>{aria}</title>
      <defs>
        <filter id={`${uid}-ink`} x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="2" xChannelSelector="R" yChannelSelector="G" result="r" />
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="5" result="s" />
          <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  12 0 0 0 -7.6" result="h" />
          <feComposite in="r" in2="h" operator="out" />
        </filter>
        <linearGradient id={`${uid}-back`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={P.bulldog} />
          <stop offset="1" stopColor={P.bulldogDark} />
        </linearGradient>
        <linearGradient id={`${uid}-cover`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={P.parchmentDark} />
          <stop offset="1" stopColor="#cbb486" />
        </linearGradient>
        <clipPath id={`${uid}-photo`}>
          <rect x="161" y="27" width="50" height="44" />
        </clipPath>
      </defs>

      <ellipse cx="132" cy="200" rx="112" ry="7" fill={P.shadow} />

      {/* back panel with tab */}
      <path
        d="M20 44Q20 36 28 36H30V26Q30 18 38 18H100Q106 18 108 24L112 36H232Q240 36 240 44V188Q240 196 232 196H28Q20 196 20 188Z"
        fill={`url(#${uid}-back)`}
        {...o}
      />
      <rect x="40" y="23" width="62" height="11" rx="2" fill={P.ivory} stroke={P.outline} strokeWidth="1.6" />
      <text
        x="71"
        y="31.6"
        textAnchor="middle"
        fontFamily={typewriter}
        fontSize="8"
        fill={P.ink}
        textLength={Math.min(56, label.length * 5)}
        lengthAdjust="spacingAndGlyphs"
      >
        {label}
      </text>

      {/* the evidence */}
      <g className="prp-folder-papers" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        <g transform="rotate(-4 120 100)">
          <rect x="44" y="30" width="150" height="150" rx="3" fill={P.ivory} {...o} strokeWidth="2.5" />
          <text x="58" y="50" fontFamily={typewriter} fontSize="11" fill={P.crimson} letterSpacing="1">
            CONFIDENTIAL
          </text>
          <path
            d="M58 60H150M58 70H138M58 80H146M58 90H120M58 100H142M58 110H130"
            stroke={P.parchmentDark}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M58 70H96" stroke={P.ink} strokeWidth="5" strokeLinecap="round" opacity="0.85" />
        </g>
        {/* polaroid of the crime scene */}
        <g transform="rotate(7 186 56)">
          <rect x="155" y="21" width="62" height="66" rx="2" fill={P.white} {...o} strokeWidth="2.5" />
          <rect x="161" y="27" width="50" height="44" fill={P.charcoal} />
          <g clipPath={`url(#${uid}-photo)`}>
            <ellipse cx="186" cy="64" rx="22" ry="7" fill={P.ivory} opacity="0.9" />
            <path d="M172 44Q186 38 200 44L186 66Z" fill={P.pizzaCheese} stroke={P.outline} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M171 43Q186 36 201 43L200 47Q186 41 172 47Z" fill={P.pizzaCrust} stroke={P.outline} strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="182" cy="50" r="2.4" fill={P.pepperoni} />
            <circle cx="189" cy="55" r="2" fill={P.pepperoni} />
            <circle cx="198" cy="49" r="4" fill={P.charcoal} />
            <path d="M163 30L171 30M163 30L163 36" stroke={P.goldLight} strokeWidth="1.2" fill="none" />
            <path d="M209 68L201 68M209 68L209 62" stroke={P.goldLight} strokeWidth="1.2" fill="none" />
          </g>
          <text x="186" y="82" textAnchor="middle" fontFamily={typewriter} fontSize="7.5" fill={P.ink}>
            EXHIBIT A
          </text>
        </g>
        {/* paperclip */}
        <path
          d="M168 36V12Q168 6 174 6Q180 6 180 12V40Q180 44 176 44Q172 44 172 40V16"
          fill="none"
          stroke={P.outline}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M168 36V12Q168 6 174 6Q180 6 180 12V40Q180 44 176 44Q172 44 172 40V16"
          fill="none"
          stroke={P.pigeonGrey}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>

      {/* front cover */}
      <g
        className="prp-folder-cover"
        style={{
          transformBox: "fill-box",
          transformOrigin: "50% 100%",
          transform: open ? "skewX(-10deg) scaleY(0.5)" : undefined,
        }}
      >
        <path d="M20 84Q20 76 28 76H232Q240 76 240 84V188Q240 196 232 196H28Q20 196 20 188Z" fill={`url(#${uid}-cover)`} {...o} />
        <path d="M28 82H232" stroke={P.ivory} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <g filter={`url(#${uid}-ink)`} transform="rotate(-7 96 130)" fill="none" stroke={P.crimson}>
          <rect x="44" y="110" width="104" height="38" rx="5" strokeWidth="3.5" />
          <rect x="49" y="115" width="94" height="28" rx="3" strokeWidth="1.3" />
          <text
            x="96"
            y="137"
            textAnchor="middle"
            stroke="none"
            fill={P.crimson}
            fontFamily='"Playfair Display", Georgia, serif'
            fontWeight="900"
            fontSize="20"
            textLength="82"
            lengthAdjust="spacingAndGlyphs"
          >
            EVIDENCE
          </text>
        </g>
        <rect x="168" y="150" width="56" height="30" rx="2" fill={P.ivory} stroke={P.outline} strokeWidth="1.8" />
        <path d="M174 160H218M174 168H210" stroke={P.parchmentDark} strokeWidth="2.4" strokeLinecap="round" />
        <text x="174" y="176" fontFamily={typewriter} fontSize="6.5" fill={P.ink}>
          DO NOT EAT
        </text>
      </g>
    </svg>
  );
}
