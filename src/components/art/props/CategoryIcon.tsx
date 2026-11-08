import { useId, type ReactNode } from "react";
import { getCategory } from "../../../lib/categories";
import { P } from "../palette";

const CREAM = P.ivory;
const LINE = { stroke: P.outline, strokeWidth: 2.2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Glyphs are drawn on a 64×64 grid centred at (32, 32); `c` is the disc colour for accents. */
const GLYPHS: Record<string, (c: string) => ReactNode> = {
  "food-crimes": (c) => (
    <g {...LINE}>
      {/* slice with a bite out of its right edge */}
      <path
        d="M19 22L45 22L42.6 27.3A3.6 3.6 0 0 0 39.6 33.9A3.6 3.6 0 0 0 36.6 40.5L32 50.5Z"
        fill={CREAM}
      />
      <path d="M16.5 21.5Q32 13 47.5 21.5L46 25.5Q32 18 18 25.5Z" fill={P.pizzaCrust} />
      <circle cx="27.5" cy="29" r="3" fill={c} strokeWidth="1.6" />
      <circle cx="32" cy="39.5" r="2.4" fill={c} strokeWidth="1.6" />
      <circle cx="37" cy="27.5" r="1.6" fill={c} stroke="none" />
      <path d="M24.5 34.5Q25.5 38 24 40" fill="none" stroke={CREAM} strokeWidth="2.4" />
    </g>
  ),
  "gaming-offenses": (c) => (
    <g {...LINE}>
      {/* cord, yanked out of its socket */}
      <path d="M32 32C32 25 37 25 38 20" fill="none" strokeWidth="2.2" />
      <rect x="37" y="13.5" width="7" height="6" rx="1.5" fill={CREAM} transform="rotate(25 40.5 16.5)" />
      <path d="M43 11.5L45 9M45.5 13.5L48.5 12" fill="none" strokeWidth="1.8" />
      <path d="M48 18l3 1M47 21l2.5 2" fill="none" stroke={CREAM} strokeWidth="1.8" />
      <path
        d="M21.5 31H42.5C48 31 51 37 51.5 43C52 47.5 49 49.5 46 47.5L41.5 43.5H22.5L18 47.5C15 49.5 12 47.5 12.5 43C13 37 16 31 21.5 31Z"
        fill={CREAM}
      />
      <path d="M22 35.5V41.5M19 38.5H25" fill="none" strokeWidth="2.4" />
      <circle cx="41.5" cy="36.2" r="1.9" fill={c} strokeWidth="1.4" />
      <circle cx="45" cy="39.6" r="1.9" fill={c} strokeWidth="1.4" />
    </g>
  ),
  "roommate-disputes": (c) => (
    <g {...LINE}>
      {/* stink lines */}
      <path d="M24 20Q21 16.5 24 13M32 19Q29 15.5 32 12M40 20Q37 16.5 40 13" fill="none" stroke={CREAM} strokeWidth="2" />
      <path d="M44 34L50 18" fill="none" strokeWidth="2.2" />
      <path d="M48 17.5L49 14.5M50.5 18.3L51.5 15.3M52.6 19L53.6 16" fill="none" strokeWidth="1.5" />
      <ellipse cx="32" cy="45" rx="17" ry="4.5" fill={CREAM} />
      <ellipse cx="31" cy="38.5" rx="15.5" ry="4.2" fill={CREAM} />
      <ellipse cx="33" cy="32" rx="14" ry="4" fill={CREAM} />
      <ellipse cx="33" cy="31.4" rx="8" ry="2" fill="none" strokeWidth="1.3" opacity="0.6" />
      <circle cx="29" cy="31.5" r="1.6" fill={c} stroke="none" />
      <circle cx="35.5" cy="31" r="1.1" fill={c} stroke="none" />
      <path d="M22 40.5Q24 44 23 47.5" fill="none" stroke={c} strokeWidth="2" />
    </g>
  ),
  "group-chat-treason": (c) => (
    <g {...LINE}>
      {/* back bubble */}
      <path d="M30 14H48A5 5 0 0 1 53 19V28A5 5 0 0 1 48 33H46L47 37L41 33H30A5 5 0 0 1 25 28V19A5 5 0 0 1 30 14Z" fill={c} stroke={P.outline} />
      <path d="M31 22H47M31 27H41" fill="none" stroke={CREAM} strokeWidth="2" opacity="0.8" />
      {/* front bubble, left on read */}
      <path d="M16 25H38A5 5 0 0 1 43 30V41A5 5 0 0 1 38 46H23L16 51L18 46H16A5 5 0 0 1 11 41V30A5 5 0 0 1 16 25Z" fill={CREAM} />
      <path d="M17 36L20 39L25.5 32.5M24 39L29.5 32.5" fill="none" stroke={c} strokeWidth="2.4" />
      {/* the dagger */}
      <path d="M50 42L39 33.5L41 31.5L51.5 40.5Z" fill={P.pigeonGrey} strokeWidth="1.8" />
      <path d="M48 44.5L54 37.5" fill="none" strokeWidth="3.6" stroke={P.outline} />
      <path d="M48 44.5L54 37.5" fill="none" strokeWidth="1.6" stroke={P.gold} />
      <path d="M52 42.5L55.5 46" fill="none" strokeWidth="3.6" />
    </g>
  ),
  "spoilers-hot-takes": (c) => (
    <g {...LINE}>
      {/* flames licking the top of the reel */}
      <path
        d="M20 30C17 24 20 19 23 16C23 20 25 21 26.5 21C26 16 29 12 33 10C32 15 35 17 37 18C38 16 38 14 37.5 12C41.5 15 45 21 43 30Z"
        fill={P.pizzaCheese}
      />
      <path d="M25 30C24 26.5 26 24.5 28 23C28 25.5 29.5 26 31 26C31 23.5 33 21.5 35 20.5C35.5 23 38 24.5 38 30Z" fill={P.pepperoni} strokeWidth="1.4" />
      <circle cx="32" cy="38" r="13" fill={CREAM} />
      <circle cx="32" cy="38" r="2.6" fill={P.outline} stroke="none" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle
          key={a}
          cx={32 + 7.2 * Math.cos(((a - 90) * Math.PI) / 180)}
          cy={38 + 7.2 * Math.sin(((a - 90) * Math.PI) / 180)}
          r="2.9"
          fill={c}
          strokeWidth="1.5"
        />
      ))}
      <path d="M44 43Q50 47 54 44" fill="none" strokeWidth="5" stroke={P.outline} />
      <path d="M44 43Q50 47 54 44" fill="none" strokeWidth="2.4" stroke={CREAM} />
    </g>
  ),
  "petty-theft": (c) => (
    <g {...LINE}>
      {/* the single stolen fry */}
      <path d="M31 31L35.5 9.5L42 11L38 32Z" fill={P.pizzaCheese} strokeWidth="2" />
      <path d="M35.2 12.2L41.6 13.6" stroke={P.pizzaCrust} strokeWidth="1.6" />
      <path d="M37.6 17.5L37 20.5M35.8 22.5L35.4 24.5" stroke={P.ivory} strokeWidth="1.4" />
      <path
        d="M24 27Q32 31 40 27L42 30Q48 36 48.5 43C49 50 42 53 32 53C22 53 15 50 15.5 43C16 36 20 32 22 30Z"
        fill={CREAM}
      />
      <path d="M22 29.5Q32 34 42 29.5" fill="none" stroke={c} strokeWidth="3" />
      <path d="M22 29.5Q32 34 42 29.5" fill="none" strokeWidth="1.2" />
      <text
        x="32"
        y="48"
        textAnchor="middle"
        fill={c}
        stroke="none"
        fontFamily='"Playfair Display", Georgia, serif'
        fontWeight="900"
        fontSize="15"
      >
        $
      </text>
    </g>
  ),
  "social-misconduct": (c) => (
    <g {...LINE}>
      {/* party hat perched on a phone sending a very fake "omw" */}
      <rect x="20" y="20" width="22" height="34" rx="4" fill={CREAM} transform="rotate(-10 31 37)" />
      <rect x="23.5" y="25" width="15" height="22" rx="1.5" fill={c} strokeWidth="1.4" transform="rotate(-10 31 37)" />
      <g transform="rotate(-10 31 37)">
        <rect x="24" y="30" width="14.5" height="7" rx="3" fill={CREAM} strokeWidth="1.2" />
        <text
          x="31.2"
          y="35.6"
          textAnchor="middle"
          fill={P.outline}
          stroke="none"
          fontFamily='"Bricolage Grotesque", sans-serif'
          fontWeight="800"
          fontSize="5"
        >
          omw!
        </text>
        <path d="M27 42H35" stroke={CREAM} strokeWidth="1.6" opacity="0.7" />
      </g>
      <g transform="translate(-4 5)">
        <path d="M36 21L44 6L48.5 22Z" fill={P.pizzaCheese} transform="rotate(14 42 16)" strokeWidth="2" />
        <path d="M41.8 9.5L44.6 18.5M45.3 8.8L47.4 15.8" stroke={c} strokeWidth="1.6" transform="rotate(14 42 16)" />
        <circle cx="47.2" cy="5.8" r="2.4" fill={CREAM} strokeWidth="1.6" />
      </g>
    </g>
  ),
  "workplace-shenanigans": (c) => (
    <g {...LINE}>
      {/* reply-all envelope */}
      <rect x="28" y="12" width="26" height="18" rx="2.5" fill={CREAM} transform="rotate(12 41 21)" />
      <path d="M29 13.5L41 23.5L53 13.5" fill="none" transform="rotate(12 41 21)" strokeWidth="1.8" />
      <circle cx="51" cy="14" r="5" fill={P.crimson} strokeWidth="1.6" />
      <path d="M51 11.2V14.8M51 16.8V17" stroke={CREAM} strokeWidth="1.8" />
      {/* steaming mug */}
      <path d="M17 32Q16 28 18.5 26M24 31Q23 27 25.5 25" fill="none" stroke={CREAM} strokeWidth="2" />
      <path d="M35 39H38.5A5 5 0 0 1 38.5 49H34.5" fill="none" strokeWidth="5" />
      <path d="M35 39H38.5A5 5 0 0 1 38.5 49H34.5" fill="none" stroke={CREAM} strokeWidth="2" />
      <path d="M12 34H37V48Q37 54 31 54H18Q12 54 12 48Z" fill={CREAM} />
      <path d="M12 39H37" stroke={c} strokeWidth="2.8" />
      <path d="M12 39H37" strokeWidth="1" />
      <ellipse cx="24.5" cy="34" rx="12.5" ry="2" fill={P.ink} strokeWidth="1.6" />
    </g>
  ),
  "pet-related": (c) => (
    <g {...LINE}>
      <path
        d="M32 33C26 33 20 38.5 20 44C20 48 23 49.5 26 48.8C29 48 30 47.5 32 47.5C34 47.5 35 48 38 48.8C41 49.5 44 48 44 44C44 38.5 38 33 32 33Z"
        fill={CREAM}
      />
      <ellipse cx="18.5" cy="30.5" rx="4" ry="5.2" fill={CREAM} transform="rotate(-25 18.5 30.5)" />
      <ellipse cx="26.5" cy="21.5" rx="4.2" ry="5.6" fill={CREAM} transform="rotate(-8 26.5 21.5)" />
      <ellipse cx="37.5" cy="21.5" rx="4.2" ry="5.6" fill={CREAM} transform="rotate(8 37.5 21.5)" />
      <ellipse cx="45.5" cy="30.5" rx="4" ry="5.2" fill={CREAM} transform="rotate(25 45.5 30.5)" />
      {/* mud */}
      <path d="M27 41Q30 37 34 40Q37 39 38 42Q36 45 32 44Q28 46 27 41Z" fill={P.raccoonDark} stroke="none" opacity="0.85" />
      <path d="M36 18.5Q38 17 40 19L39.5 21Q37.5 22 36 18.5Z" fill={P.raccoonDark} stroke="none" opacity="0.85" />
      <circle cx="49" cy="43" r="2" fill={P.raccoonDark} stroke="none" />
      <circle cx="46.5" cy="50" r="1.4" fill={P.raccoonDark} stroke="none" />
      <circle cx="14.5" cy="44" r="1.6" fill={c} stroke="none" />
    </g>
  ),
  "fashion-crimes": (c) => (
    <g {...LINE}>
      {/* sock */}
      <path d="M22 11H35V33Q35 36 37.5 37.5L46 41.5Q50.5 44 48.5 48H22Z" fill={CREAM} />
      <path d="M22 17H35M22 22.5H35M22 28H35" stroke={c} strokeWidth="2.6" />
      <path d="M22 11H35" strokeWidth="2.2" />
      {/* sandal sole and straps */}
      <path d="M17 48.5H51Q53 48.5 53 51Q53 53 51 53H19Q16 53 16 51Q16 48.5 17 48.5Z" fill={P.owlBrown} />
      <path d="M33 39.5L28 48.5M44 41.5L41 48.5" fill="none" strokeWidth="5" />
      <path d="M33 39.5L28 48.5M44 41.5L41 48.5" fill="none" stroke={P.owlLight} strokeWidth="2.2" />
      <path d="M20.5 38H36.5" strokeWidth="5" />
      <path d="M20.5 38H36.5" stroke={P.owlLight} strokeWidth="2.2" />
    </g>
  ),
  "romance-blunders": (c) => (
    <g {...LINE}>
      <path d="M30.5 49L17 36C11.5 30.5 13.5 20 21.5 19C26 18.5 29 21 30.5 24L28 31L32 35L28.5 41Z" fill={CREAM} />
      <path d="M35 49L47.5 36C53 30.5 51 20 43 19C38.5 18.5 35.5 21 34 24L31.5 31L35.5 35L32 41Z" fill={CREAM} transform="translate(1.5 0)" />
      {/* band-aid holding it together */}
      <g transform="rotate(-32 33 33)">
        <rect x="21" y="29" width="25" height="8.5" rx="4.25" fill={P.hamsterLight} strokeWidth="1.8" />
        <rect x="29" y="29" width="9" height="8.5" fill={P.hamster} strokeWidth="1.4" />
        <circle cx="25" cy="33.2" r="0.8" fill={P.outline} stroke="none" />
        <circle cx="42" cy="33.2" r="0.8" fill={P.outline} stroke="none" />
      </g>
      <path d="M18 25Q19 22.5 22 22.5" fill="none" stroke={c} strokeWidth="2" opacity="0.6" />
    </g>
  ),
  "miscellaneous-mischief": () => (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 25C22 17 27 13 33 13C39 13 43.5 17 43.5 23C43.5 29 37 30.5 34 34C32.8 35.5 32.5 37 32.5 40" fill="none" stroke={P.outline} strokeWidth="10" />
      <path d="M22 25C22 17 27 13 33 13C39 13 43.5 17 43.5 23C43.5 29 37 30.5 34 34C32.8 35.5 32.5 37 32.5 40" fill="none" stroke={CREAM} strokeWidth="5.6" />
      <circle cx="32.5" cy="49" r="4.6" fill={CREAM} stroke={P.outline} strokeWidth="2.2" />
      {/* googly eyes */}
      <circle cx="27" cy="21.5" r="5" fill={P.white} stroke={P.outline} strokeWidth="1.8" />
      <circle cx="38.5" cy="20" r="5.6" fill={P.white} stroke={P.outline} strokeWidth="1.8" />
      <circle cx="28.4" cy="23.6" r="2.3" fill={P.outline} />
      <circle cx="36.6" cy="22.5" r="2.6" fill={P.outline} />
      <circle cx="25.8" cy="19.8" r="0.9" fill={P.white} />
    </g>
  ),
};

/** A round enamel-badge icon for a case category. Unknown keys fall back to Miscellaneous Mischief. */
export function CategoryIcon({ category, className, title }: { category: string; className?: string; title?: string }) {
  const uid = "prp" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const cat = getCategory(category);
  const glyph = GLYPHS[cat.key] ?? GLYPHS["miscellaneous-mischief"];
  const label = title ?? cat.label;

  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={label} className={className}>
      <title>{label}</title>
      <defs>
        <clipPath id={`${uid}-disc`}>
          <circle cx="32" cy="32" r="29" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="29" fill={cat.color} />
      <g clipPath={`url(#${uid}-disc)`}>
        {/* lower shade crescent and upper sheen */}
        <circle cx="32" cy="32" r="29" fill={P.outline} opacity="0.22" />
        <circle cx="30" cy="29" r="28" fill={cat.color} />
        <path d="M10 24A24 24 0 0 1 28 8.5" fill="none" stroke={P.white} strokeWidth="2.4" strokeLinecap="round" opacity="0.3" />
      </g>
      <circle cx="32" cy="32" r="25" fill="none" stroke={P.ivory} strokeWidth="1" strokeDasharray="1.5 2.5" opacity="0.45" />
      {glyph(cat.color)}
      <circle cx="32" cy="32" r="29" fill="none" stroke={P.outline} strokeWidth="2.6" />
    </svg>
  );
}
