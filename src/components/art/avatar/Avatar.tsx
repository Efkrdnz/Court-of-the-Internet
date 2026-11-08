import { useId, type ReactNode } from "react";
import type { Accessory, AvatarConfig, Headwear, Species } from "@/lib/avatar";
import { BACKDROP_COLORS } from "@/lib/avatar";
import { P, STROKE } from "../palette";

export interface AvatarProps {
  config: AvatarConfig;
  className?: string;
  title?: string;
}

/* ------------------------------------------------------------------ */
/*  Per-species anchor points                                          */
/* ------------------------------------------------------------------ */

interface Anchor {
  /** y where headwear sits (just under the visible head top). */
  top: number;
  /** Half-width of the head at hat level; hats are designed for 26. */
  hw: number;
  /** Horizontal nudge for hats (asymmetric heads). */
  hx: number;
  eyeY: number;
  eyeDx: number;
  /** Radius a lens should have to cover this species' eye. */
  lensR: number;
  /** Half-width of the face at the eye line (where glasses' arms end). */
  faceW: number;
  /** y of the upper lip, where a mustache sits. */
  mouthY: number;
  /** Mustache scale. */
  mScale: number;
}

const ANCHORS: Record<Species, Anchor> = {
  pigeon: { top: 43, hw: 21, hx: 0, eyeY: 59, eyeDx: 10, lensR: 7.5, faceW: 22, mouthY: 78, mScale: 0.85 },
  raccoon: { top: 46, hw: 24, hx: 0, eyeY: 62, eyeDx: 12, lensR: 7.5, faceW: 28, mouthY: 75, mScale: 1 },
  hamster: { top: 47, hw: 23, hx: 0, eyeY: 64, eyeDx: 11, lensR: 7, faceW: 25, mouthY: 75.5, mScale: 0.95 },
  cat: { top: 48, hw: 23, hx: 0, eyeY: 65, eyeDx: 11, lensR: 7.5, faceW: 26, mouthY: 75, mScale: 0.95 },
  owl: { top: 45, hw: 25, hx: 0, eyeY: 63, eyeDx: 11.5, lensR: 9.6, faceW: 27, mouthY: 81, mScale: 0.95 },
  frog: { top: 41.5, hw: 26, hx: 0, eyeY: 53, eyeDx: 15, lensR: 8.8, faceW: 26, mouthY: 73.5, mScale: 1.1 },
  bulldog: { top: 48, hw: 25, hx: 0, eyeY: 62, eyeDx: 12, lensR: 7.5, faceW: 29, mouthY: 78.5, mScale: 1.05 },
  goose: { top: 35, hw: 18.5, hx: 0, eyeY: 47, eyeDx: 8.6, lensR: 6, faceW: 19, mouthY: 71, mScale: 0.75 },
};

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

const S = STROKE * 0.85;
const ink = { stroke: P.outline, strokeWidth: S, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const inkLine = { ...ink, fill: "none" } as const;
const thinLine = { ...inkLine, strokeWidth: 1.6 } as const;

function Eye({ x, y, r, iris, irisR, look = 0, lid, lidColor }: { x: number; y: number; r: number; iris?: string; irisR?: number; look?: number; lid?: number; lidColor?: string }) {
  const ir = irisR ?? r * 0.62;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={P.white} {...ink} strokeWidth={2.2} />
      {iris ? <circle cx={x + look} cy={y + 0.4} r={ir} fill={iris} /> : null}
      <circle cx={x + look} cy={y + 0.4} r={iris ? ir * 0.55 : ir} fill={P.black} />
      <circle cx={x + look + ir * 0.35} cy={y - ir * 0.35} r={Math.max(1, ir * 0.3)} fill={P.white} />
      {lid !== undefined && lidColor ? (
        <path d={`M${x - r - 1} ${y - r * lid}H${x + r + 1}V${y - r - 2}H${x - r - 1}Z`} fill={lidColor} />
      ) : null}
      {lid !== undefined ? <path d={`M${x - r - 0.5} ${y - r * lid}H${x + r + 0.5}`} {...inkLine} strokeWidth={2.4} /> : null}
    </g>
  );
}

function Blush({ x, y, r = 3.4 }: { x: number; y: number; r?: number }) {
  return <ellipse cx={x} cy={y} rx={r} ry={r * 0.6} fill={P.blush} opacity={0.75} />;
}

/* ------------------------------------------------------------------ */
/*  Species heads (head + neck, centred on x = 64)                     */
/* ------------------------------------------------------------------ */

const HEADS: Record<Species, () => ReactNode> = {
  pigeon: () => (
    <>
      <path d="M44 104C44 88 47 78 51 72H77C81 78 84 88 84 104Z" fill={P.pigeonGrey} {...ink} />
      <path d="M46 86C52 82 76 82 82 86L83 96C76 92 52 92 45 96Z" fill={P.teal} opacity={0.85} />
      <path d="M45.5 92C52 88 76 88 82.5 92L83.5 100C76 96 52 96 44.5 100Z" fill={P.plum} opacity={0.85} />
      <ellipse cx={64} cy={63} rx={22} ry={23} fill={P.pigeonGrey} {...ink} />
      <path d="M80 50C88 62 84 80 66 86C78 78 82 64 80 50Z" fill={P.pigeonDark} opacity={0.6} />
      <path d="M52 46Q60 41 70 43" stroke={P.white} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.5} />
      <Eye x={54} y={59} r={6.6} iris={P.beak} irisR={4.4} look={-1.4} />
      <Eye x={74} y={59} r={6.6} iris={P.beak} irisR={4.4} look={1.6} />
      <path d="M59.5 67.5L68.5 67.5L64 78.5Z" fill={P.pigeonDark} {...ink} strokeWidth={2} />
      <ellipse cx={64} cy={67.5} rx={5} ry={2.6} fill={P.ivory} {...ink} strokeWidth={1.8} />
    </>
  ),
  raccoon: () => (
    <>
      <path d="M50 104V82H78V104Z" fill={P.raccoonGrey} {...ink} />
      <circle cx={42} cy={45} r={9} fill={P.raccoonGrey} {...ink} />
      <circle cx={86} cy={45} r={9} fill={P.raccoonGrey} {...ink} />
      <circle cx={42.5} cy={45.5} r={4.6} fill={P.raccoonDark} />
      <circle cx={85.5} cy={45.5} r={4.6} fill={P.raccoonDark} />
      <path d="M36 66C36 50 48 42 64 42S92 50 92 66L97 71L91 73.5C87 84 77 88 64 88S41 84 37 73.5L31 71Z" fill={P.raccoonGrey} {...ink} />
      <path d="M64 43C61 47 61 54 64 59C67 54 67 47 64 43Z" fill={P.raccoonDark} opacity={0.8} />
      <path d="M37.5 62C41 52 54 53 64 59.5C74 53 87 52 90.5 62C88 70 76 72 64 66C52 72 40 70 37.5 62Z" fill={P.raccoonDark} />
      <ellipse cx={52} cy={53} rx={6} ry={2.4} fill={P.ivory} />
      <ellipse cx={76} cy={53} rx={6} ry={2.4} fill={P.ivory} />
      <Eye x={52} y={62} r={5.2} irisR={3} look={1} />
      <Eye x={76} y={62} r={5.2} irisR={3} look={1} />
      <path d="M50 74C50 68 56 66 64 66S78 68 78 74C78 81 72 85 64 85S50 81 50 74Z" fill={P.ivory} {...ink} strokeWidth={2} />
      <ellipse cx={64} cy={71} rx={4.4} ry={3} fill={P.black} />
      <ellipse cx={62.6} cy={70} rx={1.4} ry={0.8} fill={P.white} opacity={0.8} />
      <path d="M58.5 79Q64 82.5 70 78" {...thinLine} />
    </>
  ),
  hamster: () => (
    <>
      <circle cx={44} cy={49} r={7} fill={P.hamster} {...ink} />
      <circle cx={84} cy={49} r={7} fill={P.hamster} {...ink} />
      <circle cx={44.5} cy={49.5} r={3.6} fill={P.blush} />
      <circle cx={83.5} cy={49.5} r={3.6} fill={P.blush} />
      <path d="M40 66C38 52 50 44 64 44S90 52 88 66C96 72 96 87 85 92C77 98 51 98 43 92C32 87 32 72 40 66Z" fill={P.hamster} {...ink} />
      <path d="M64 45C61 50 61 56 64 60C67 56 67 50 64 45Z" fill={P.hamsterLight} />
      <path d="M38 76C40 66 52 66 56 72C60 68 68 68 72 72C76 66 88 66 90 76C90 88 80 95 64 95S38 88 38 76Z" fill={P.hamsterLight} />
      <path d="M86 70C93 76 92 88 84 92C78 96 66 97 60 96C76 92 86 84 86 70Z" fill={P.hamster} opacity={0.6} />
      <Eye x={53} y={64} r={4.8} irisR={4.2} look={0} />
      <Eye x={75} y={64} r={4.8} irisR={4.2} look={0} />
      <Blush x={45} y={76} r={4} />
      <Blush x={83} y={76} r={4} />
      <path d="M61.5 71.5H66.5L64 74.5Z" fill={P.blush} {...ink} strokeWidth={1.6} />
      <path d="M64 74.5V77M59 77Q61.5 79.5 64 77Q66.5 79.5 69 77" {...thinLine} />
      <path d="M61.5 78.4H66.5V82Q66.5 83 65.5 83H62.5Q61.5 83 61.5 82Z" fill={P.white} {...ink} strokeWidth={1.4} />
      <path d="M64 78.4V83" stroke={P.outline} strokeWidth={1} />
    </>
  ),
  cat: () => (
    <>
      <path d="M52 104V82H76V104Z" fill={P.catOrange} {...ink} />
      <path d="M40 60L39 31L59 46Z" fill={P.catOrange} {...ink} />
      <path d="M88 60L89 31L69 46Z" fill={P.catOrange} {...ink} />
      <path d="M42.5 53L42 37L53.5 46Z" fill={P.blush} />
      <path d="M85.5 53L86 37L74.5 46Z" fill={P.blush} />
      <path d="M38 67C38 53 49 45 64 45S90 53 90 67L95 71L90.5 73C88 82 77 88 64 88S40 82 37.5 73L33 71Z" fill={P.catOrange} {...ink} />
      <path d="M58 46.5L59.5 53M64 46V53.5M70 46.5L68.5 53M38.5 64L44 65M89.5 64L84 65" stroke={P.pizzaCrust} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M58 46.5L59.5 53M64 46V53.5M70 46.5L68.5 53" stroke={P.outline} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
      <path d="M52 78C52 71 57 69 64 69S76 71 76 78C76 84 71 87 64 87S52 84 52 78Z" fill={P.catCream} />
      <path d="M47.5 65Q53 71 58.5 65Z" fill={P.goldLight} {...ink} strokeWidth={1.8} />
      <path d="M69.5 65Q75 71 80.5 65Z" fill={P.goldLight} {...ink} strokeWidth={1.8} />
      <ellipse cx={55.5} cy={66.6} rx={1.1} ry={1.8} fill={P.black} />
      <ellipse cx={77.5} cy={66.6} rx={1.1} ry={1.8} fill={P.black} />
      <path d="M46.5 64.6H59.5M68.5 64.6H81.5" {...inkLine} strokeWidth={2.8} />
      <path d="M47 60.5L58 62M81 60.5L70 62" {...inkLine} strokeWidth={2} />
      <path d="M61 72H67L64 75Z" fill={P.blush} {...ink} strokeWidth={1.6} />
      <path d="M64 75V76.5M58.5 77.5Q61.5 80 64 76.5Q67 80 71 76" {...thinLine} />
      <path d="M50 74L36 72M50 77L37 79M78 74L92 72M78 77L91 79" stroke={P.outline} strokeWidth={1.1} strokeLinecap="round" />
    </>
  ),
  owl: () => (
    <>
      <path d="M44 104C44 92 48 84 52 80H76C80 84 84 92 84 104Z" fill={P.owlBrown} {...ink} />
      <path d="M41 52L34 31L54 44Z" fill={P.owlBrown} {...ink} />
      <path d="M87 52L94 31L74 44Z" fill={P.owlBrown} {...ink} />
      <path d="M36 67C36 51 47 41 64 41S92 51 92 67C92 83 80 93 64 93S36 83 36 67Z" fill={P.owlBrown} {...ink} />
      <path d="M56 86q2 3 4 0M62 89q2 3 4 0M68 86q2 3 4 0" stroke={P.owlLight} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <path d="M64 56C58 48 40 50 41 64C42 76 56 78 64 72C72 78 86 76 87 64C88 50 70 48 64 56Z" fill={P.owlLight} {...ink} strokeWidth={2} />
      <Eye x={53} y={63} r={8.6} iris={P.goldLight} irisR={6} look={0.6} />
      <Eye x={75} y={63} r={8.6} iris={P.goldLight} irisR={6} look={-0.6} />
      <path d="M42 53L58 58M86 53L70 58" stroke={P.owlBrown} strokeWidth={5} strokeLinecap="round" />
      <path d="M42 53L58 58M86 53L70 58" {...inkLine} strokeWidth={1.6} />
      <path d="M60 71H68L64 81Z" fill={P.goldDark} {...ink} strokeWidth={2} />
    </>
  ),
  frog: () => (
    <>
      <path d="M44 104C44 92 46 86 50 84H78C82 86 84 92 84 104Z" fill={P.frogGreen} {...ink} />
      <circle cx={49} cy={54} r={11} fill={P.frogGreen} {...ink} />
      <circle cx={79} cy={54} r={11} fill={P.frogGreen} {...ink} />
      <ellipse cx={64} cy={72} rx={30} ry={18} fill={P.frogGreen} {...ink} />
      <circle cx={49} cy={54} r={9.4} fill={P.frogGreen} />
      <circle cx={79} cy={54} r={9.4} fill={P.frogGreen} />
      <path d="M40 78C46 88 82 88 88 78C82 84 46 84 40 78Z" fill={P.white} opacity={0.3} />
      <g>
        <circle cx={49} cy={53} r={7.4} fill={P.goldLight} {...ink} strokeWidth={2.2} />
        <ellipse cx={49.6} cy={53.6} rx={4} ry={2.4} fill={P.black} />
        <circle cx={51.4} cy={51} r={1.3} fill={P.white} />
        <path d="M41 51H57V45H41Z" fill={P.frogGreen} />
        <path d="M41.4 51H56.6" {...inkLine} strokeWidth={2.4} />
      </g>
      <g>
        <circle cx={79} cy={53} r={7.4} fill={P.goldLight} {...ink} strokeWidth={2.2} />
        <ellipse cx={79.6} cy={53.6} rx={4} ry={2.4} fill={P.black} />
        <circle cx={81.4} cy={51} r={1.3} fill={P.white} />
        <path d="M71 51H87V45H71Z" fill={P.frogGreen} />
        <path d="M71.4 51H86.6" {...inkLine} strokeWidth={2.4} />
      </g>
      <circle cx={60.5} cy={69} r={1.2} fill={P.outline} />
      <circle cx={67.5} cy={69} r={1.2} fill={P.outline} />
      <path d="M42 76C52 82 76 82 86 74" {...inkLine} strokeWidth={2.4} />
      <Blush x={42} y={70} r={4} />
      <Blush x={86} y={70} r={4} />
    </>
  ),
  bulldog: () => (
    <>
      <path d="M46 104V84H82V104Z" fill={P.bulldog} {...ink} />
      <path d="M38 64C38 50 49 45 64 45S90 50 90 64C93 74 92 84 84 90C76 96 52 96 44 90C36 84 35 74 38 64Z" fill={P.bulldog} {...ink} />
      <path d="M42 51C32 44 24 52 30 61C34 59 38 57 42 58Z" fill={P.bulldogDark} {...ink} />
      <path d="M86 51C96 44 104 52 98 61C94 59 90 57 86 58Z" fill={P.bulldogDark} {...ink} />
      <path d="M55 51q9-4 18 0M57 55.5q7-3 14 0" stroke={P.bulldogDark} strokeWidth={2} strokeLinecap="round" fill="none" />
      <path d="M86 66C90 76 88 86 80 90C74 93 62 94 56 93C74 90 84 82 86 66Z" fill={P.bulldogDark} opacity={0.45} />
      <Eye x={52} y={63} r={5} irisR={3} />
      <Eye x={76} y={63} r={5} irisR={3} />
      <path d="M46.5 61.6Q52 58 57.5 61.6V57H46.5Z" fill={P.bulldog} />
      <path d="M70.5 61.6Q76 58 81.5 61.6V57H70.5Z" fill={P.bulldog} />
      <path d="M46.5 61.6Q52 58.4 57.5 61.6M70.5 61.6Q76 58.4 81.5 61.6" {...inkLine} strokeWidth={2.2} />
      <path d="M57 86C58 92 70 92 71 86Z" fill={P.burgundyDark} {...ink} strokeWidth={2} />
      <path d="M46 76C44 87 60 91 64 82C68 91 84 87 82 76C80 70 72 68 64 70C56 68 48 70 46 76Z" fill={P.parchment} {...ink} strokeWidth={2.2} />
      <path d="M57.5 87.5L59 82.5L61 87.5ZM67 87.5L69 82.5L70.5 87.5Z" fill={P.white} {...ink} strokeWidth={1.4} />
      <path d="M56.5 72C56.5 68 71.5 68 71.5 72C71.5 76 66.5 78 64 78S56.5 76 56.5 72Z" fill={P.black} {...ink} strokeWidth={1.6} />
      <ellipse cx={61} cy={71} rx={2} ry={1} fill={P.white} opacity={0.7} />
    </>
  ),
  goose: () => (
    <>
      <path d="M54 104C55 88 57 74 57 62H71C71 74 73 88 74 104Z" fill={P.gooseWhite} {...ink} />
      <path d="M68 66C69 78 71 90 72 104H74C73 88 71 74 71 62Z" fill={P.wigShade} />
      <ellipse cx={64} cy={50.5} rx={19} ry={20} fill={P.gooseWhite} {...ink} />
      <path d="M78 39C85 50 82 63 70 69C77 61 80 50 78 39Z" fill={P.wigShade} />
      <Eye x={55.4} y={47} r={4.8} irisR={3} look={0.8} />
      <Eye x={72.6} y={47} r={4.8} irisR={3} look={-0.8} />
      <path d="M49 40.5L60 44M79 40.5L68 44" {...inkLine} strokeWidth={3} />
      <path d="M55 56.5C55 51.5 73 51.5 73 56.5L69 67.5C67 71 61 71 59 67.5Z" fill={P.beak} {...ink} strokeWidth={2.2} />
      <path d="M59 67.5C61 71 67 71 69 67.5L68 65.5H60Z" fill={P.pizzaCrust} />
      <path d="M56.6 61Q64 63.4 71.4 61" {...inkLine} strokeWidth={1.8} />
      <path d="M61 56.5h.4M66.6 56.5h.4" {...inkLine} strokeWidth={1.8} />
    </>
  ),
};

/* ------------------------------------------------------------------ */
/*  Headwear: designed for a head of half-width 26, origin at the      */
/*  sitting line, drawn in two layers (behind head / in front).        */
/* ------------------------------------------------------------------ */

interface HatLayer {
  back?: (sw: number, uid: string) => ReactNode;
  front?: (sw: number, uid: string) => ReactNode;
}

function Curl({ x, y, r, sw, fill = P.wig }: { x: number; y: number; r: number; sw: number; fill?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={fill} stroke={P.outline} strokeWidth={sw} />
      <path d={`M${x - r * 0.45} ${y + r * 0.1}a${r * 0.45} ${r * 0.45} 0 1 1 ${r * 0.5} ${r * 0.42}`} fill="none" stroke={P.wigShade} strokeWidth={sw * 0.8} strokeLinecap="round" />
    </g>
  );
}

function Roll({ x, y, w, h, sw, flip = false }: { x: number; y: number; w: number; h: number; sw: number; flip?: boolean }) {
  const cx = flip ? x + w - h / 2 : x + h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={P.wig} stroke={P.outline} strokeWidth={sw} />
      <circle cx={cx} cy={y + h / 2} r={h * 0.22} fill="none" stroke={P.wigShade} strokeWidth={sw * 0.7} />
      <path d={`M${x + h * 0.6} ${y + h - 1.2}H${x + w - h * 0.6}`} stroke={P.wigShade} strokeWidth={sw * 0.7} strokeLinecap="round" />
    </g>
  );
}

const HATS: Record<Exclude<Headwear, "none">, HatLayer> = {
  "barrister-wig": {
    back: (sw) => <path d="M-28 -4C-33 6 -32 22 -27 31H27C32 22 33 6 28 -4Z" fill={P.wigShade} stroke={P.outline} strokeWidth={sw} strokeLinejoin="round" />,
    front: (sw) => (
      <g>
        <path d="M-28 14C-32 -14 -16 -27 0 -27S32 -14 28 14L21 9C20 -1 11 -5 0 -5S-20 -1 -21 9Z" fill={P.wig} stroke={P.outline} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M-22 -10q6-6 12-6M-6 -20q6-2 12 0M10 -16q6 0 12 6" fill="none" stroke={P.wigShade} strokeWidth={sw * 0.8} strokeLinecap="round" />
        <path d="M-21 2C-14 -7 14 -7 21 2" fill="none" stroke={P.wigShade} strokeWidth={sw} strokeLinecap="round" />
        {[4, 11, 18, 25].map((y) => (
          <g key={y}>
            <Roll x={-33} y={y} w={13} h={7} sw={sw * 0.85} />
            <Roll x={20} y={y} w={13} h={7} sw={sw * 0.85} flip />
          </g>
        ))}
      </g>
    ),
  },
  "judge-wig": {
    back: (sw) => (
      <g>
        <path d="M-30 -8C-46 0 -50 30 -46 62H46C50 30 46 0 30 -8Z" fill={P.wigShade} stroke={P.outline} strokeWidth={sw} strokeLinejoin="round" />
        {[4, 13, 22, 31, 40, 49, 58].map((y, i) => (
          <g key={y}>
            <Curl x={-41 + (i % 2) * 4} y={y} r={7} sw={sw * 0.85} />
            <Curl x={-31 + (i % 2) * -3} y={y + 4.5} r={6.4} sw={sw * 0.85} />
            <Curl x={41 - (i % 2) * 4} y={y} r={7} sw={sw * 0.85} />
            <Curl x={31 + (i % 2) * 3} y={y + 4.5} r={6.4} sw={sw * 0.85} />
          </g>
        ))}
      </g>
    ),
    front: (sw) => (
      <g>
        <path d="M-32 12C-38 -22 -18 -38 0 -38S38 -22 32 12C28 4 24 0 18 -1C12 -6 -12 -6 -18 -1C-24 0 -28 4 -32 12Z" fill={P.wig} stroke={P.outline} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M0 -37V-6" stroke={P.wigShade} strokeWidth={sw * 0.8} strokeLinecap="round" />
        {[
          [-22, -16],
          [-12, -25],
          [12, -25],
          [22, -16],
          [-27, -4],
          [27, -4],
          [-8, -13],
          [8, -13],
        ].map(([x, y]) => (
          <path key={`${x}${y}`} d={`M${x - 4} ${y}a4 4 0 1 1 4 4`} fill="none" stroke={P.wigShade} strokeWidth={sw * 0.8} strokeLinecap="round" />
        ))}
        <path d="M-28 -14Q-24 -26 -12 -32" fill="none" stroke={P.white} strokeWidth={sw * 0.9} strokeLinecap="round" />
      </g>
    ),
  },
  bowler: {
    front: (sw) => (
      <g transform="rotate(-6)">
        <path d="M-22 1C-24 -21 -12 -31 0 -31S24 -21 22 1Z" fill={P.charcoal} stroke={P.outline} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M10 -28C18 -22 21 -12 20 0H22C24 -21 16 -29 10 -28Z" fill={P.black} />
        <path d="M-14 -22Q-8 -28 0 -28" fill="none" stroke={P.white} strokeWidth={sw * 0.9} strokeLinecap="round" opacity={0.35} />
        <path d="M-22.4 -6H22.4L22 1H-22Z" fill={P.burgundy} stroke={P.outline} strokeWidth={sw * 0.7} strokeLinejoin="round" />
        <path d="M-35 1C-34 -4 -28 -2 -22 -1H22C28 -2 34 -4 35 1C34 6 22 7 0 7S-34 6 -35 1Z" fill={P.charcoal} stroke={P.outline} strokeWidth={sw} strokeLinejoin="round" />
      </g>
    ),
  },
  beret: {
    front: (sw) => (
      <g transform="rotate(-10 0 0)">
        <path d="M2 -26L4 -32" stroke={P.outline} strokeWidth={sw * 1.5} strokeLinecap="round" />
        <path d="M-33 -4C-38 -20 -12 -30 6 -28C30 -26 42 -14 36 -6C30 2 -26 6 -33 -4Z" fill={P.burgundy} stroke={P.outline} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M30 -18C38 -12 36 -4 24 -1C10 2 -18 3 -30 -2C-12 -2 24 -6 30 -18Z" fill={P.burgundyDark} opacity={0.7} />
        <path d="M-24 -16Q-12 -24 4 -24" fill="none" stroke={P.burgundyLight} strokeWidth={sw * 1.2} strokeLinecap="round" />
        <path d="M-24 0C-12 4 12 4 24 -1L24 4C12 9 -12 9 -24 5Z" fill={P.burgundyDark} stroke={P.outline} strokeWidth={sw * 0.9} strokeLinejoin="round" />
      </g>
    ),
  },
  crown: {
    front: (sw) => (
      <g transform="translate(2 0) rotate(-8)">
        <path d="M-19 2L-22 -24L-10 -12L0 -30L10 -12L22 -24L19 2Z" fill={P.gold} stroke={P.outline} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M0 -30L10 -12L22 -24L19 2H8C14 -8 10 -20 0 -30Z" fill={P.goldDark} opacity={0.55} />
        <rect x={-20} y={-6} width={40} height={9} rx={2} fill={P.goldLight} stroke={P.outline} strokeWidth={sw} />
        <circle cx={-22} cy={-25} r={3} fill={P.goldLight} stroke={P.outline} strokeWidth={sw * 0.8} />
        <circle cx={0} cy={-31} r={3.2} fill={P.goldLight} stroke={P.outline} strokeWidth={sw * 0.8} />
        <circle cx={22} cy={-25} r={3} fill={P.goldLight} stroke={P.outline} strokeWidth={sw * 0.8} />
        <path d="M0 -5L4 -1.5L0 2L-4 -1.5Z" fill={P.crimson} stroke={P.outline} strokeWidth={sw * 0.6} strokeLinejoin="round" />
        <circle cx={-12} cy={-1.5} r={2.4} fill={P.teal} stroke={P.outline} strokeWidth={sw * 0.6} />
        <circle cx={12} cy={-1.5} r={2.4} fill={P.teal} stroke={P.outline} strokeWidth={sw * 0.6} />
        <path d="M-17 -16L-15 -8" stroke={P.white} strokeWidth={sw * 0.8} strokeLinecap="round" opacity={0.8} />
      </g>
    ),
  },
  "party-hat": {
    front: (sw, uid) => (
      <g transform="rotate(14 0 0)">
        <defs>
          <clipPath id={`av-party-${uid}`}>
            <path d="M-14 2L2 -34L16 2Z" />
          </clipPath>
        </defs>
        <path d="M-14 2L2 -34L16 2Z" fill={P.goldLight} />
        <g clipPath={`url(#av-party-${uid})`}>
          {[-26, -13, 0].map((y) => (
            <path key={y} d={`M-30 ${y + 6}L30 ${y - 10}V${y - 2}L-30 ${y + 14}Z`} fill={P.crimson} />
          ))}
          {[
            [-4, -6],
            [6, -14],
            [1, -21],
            [-6, 3],
            [9, -2],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={1.3} fill={P.ivory} />
          ))}
          <path d="M5 -26L16 2H8Z" fill={P.outline} opacity={0.18} />
        </g>
        <path d="M-14 2L2 -34L16 2Z" fill="none" stroke={P.outline} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M-15 2Q1 7 17 2" fill="none" stroke={P.outline} strokeWidth={sw} strokeLinecap="round" />
        <circle cx={2} cy={-35} r={5} fill={P.ivory} stroke={P.outline} strokeWidth={sw} />
        <path d="M-1 -36l3 3M3 -39l1 5M5 -36l-4 2" stroke={P.wigShade} strokeWidth={sw * 0.6} strokeLinecap="round" />
      </g>
    ),
  },
  detective: {
    front: (sw, uid) => (
      <g>
        <defs>
          <clipPath id={`av-tweed-${uid}`}>
            <path d="M-25 2C-27 -24 -12 -30 0 -30S27 -24 25 2Z" />
          </clipPath>
        </defs>
        <path d="M-25 2C-27 -24 -12 -30 0 -30S27 -24 25 2Z" fill={P.owlLight} />
        <g clipPath={`url(#av-tweed-${uid})`} stroke={P.owlBrown} strokeWidth={sw * 0.7}>
          {[-24, -16, -8, 0, 8, 16, 24].map((x) => (
            <path key={`v${x}`} d={`M${x} -32V4`} />
          ))}
          {[-26, -18, -10, -2].map((y) => (
            <path key={`h${y}`} d={`M-30 ${y}H30`} />
          ))}
          {[-20, 4].map((x) => (
            <path key={`c${x}`} d={`M${x} -32V4`} stroke={P.crimson} strokeWidth={sw * 0.45} />
          ))}
          <path d="M8 -28C20 -22 26 -10 25 4H30V-30Z" fill={P.outline} opacity={0.2} stroke="none" />
        </g>
        <path d="M-25 2C-27 -24 -12 -30 0 -30S27 -24 25 2Z" fill="none" stroke={P.outline} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M-25 -2C-30 4 -30 14 -26 18L-20 14C-22 8 -22 4 -21 1Z" fill={P.owlLight} stroke={P.outline} strokeWidth={sw * 0.9} strokeLinejoin="round" />
        <path d="M25 -2C30 4 30 14 26 18L20 14C22 8 22 4 21 1Z" fill={P.owlLight} stroke={P.outline} strokeWidth={sw * 0.9} strokeLinejoin="round" />
        <path d="M-18 1C-12 10 12 10 18 1C12 4 -12 4 -18 1Z" fill={P.owlBrown} stroke={P.outline} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M0 -29C-6 -36 -12 -34 -10 -30Q-6 -28 0 -29ZM0 -29C6 -36 12 -34 10 -30Q6 -28 0 -29Z" fill={P.owlBrown} stroke={P.outline} strokeWidth={sw * 0.8} strokeLinejoin="round" />
        <circle cx={0} cy={-29} r={2} fill={P.owlBrown} stroke={P.outline} strokeWidth={sw * 0.7} />
      </g>
    ),
  },
};

/* ------------------------------------------------------------------ */
/*  Accessories                                                        */
/* ------------------------------------------------------------------ */

function AccessoryArt({ kind, a }: { kind: Exclude<Accessory, "none">; a: Anchor }) {
  const lx = 64 - a.eyeDx;
  const rx = 64 + a.eyeDx;
  const y = a.eyeY;
  switch (kind) {
    case "sunglasses": {
      const w = Math.min(a.lensR * 1.12, a.eyeDx - 1.6);
      const h = a.lensR * 0.86;
      const lens = (cx: number) => `M${cx - w} ${y - h}H${cx + w}Q${cx + w + 1} ${y + h * 0.4} ${cx + w * 0.4} ${y + h}H${cx - w * 0.4}Q${cx - w - 1} ${y + h * 0.4} ${cx - w} ${y - h}Z`;
      return (
        <g>
          <path d={`M${lx - w} ${y - h + 1}L${64 - a.faceW} ${y - h - 1}M${rx + w} ${y - h + 1}L${64 + a.faceW} ${y - h - 1}`} {...inkLine} strokeWidth={2.4} />
          <path d={`M${lx + w} ${y - h + 1.5}Q64 ${y - h - 2} ${rx - w} ${y - h + 1.5}`} {...inkLine} strokeWidth={2.6} />
          <path d={lens(lx)} fill={P.black} {...ink} strokeWidth={2.2} />
          <path d={lens(rx)} fill={P.black} {...ink} strokeWidth={2.2} />
          <path d={`M${lx - w * 0.6} ${y - h * 0.5}L${lx - w * 0.1} ${y - h * 0.5}M${rx - w * 0.6} ${y - h * 0.5}L${rx - w * 0.1} ${y - h * 0.5}`} stroke={P.white} strokeWidth={1.8} strokeLinecap="round" opacity={0.8} />
          <path d={`M${lx + w * 0.1} ${y + h * 0.45}L${lx + w * 0.5} ${y + h * 0.1}M${rx + w * 0.1} ${y + h * 0.45}L${rx + w * 0.5} ${y + h * 0.1}`} stroke={P.tear} strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
        </g>
      );
    }
    case "monocle": {
      const r = a.lensR + 0.8;
      return (
        <g>
          <path d={`M${rx + r * 0.6} ${y + r * 0.8}C${rx + r + 2} ${y + 18} ${rx + 4} ${y + 26} ${rx + 10} 110`} fill="none" stroke={P.goldDark} strokeWidth={1.4} strokeDasharray="2 1.4" />
          <circle cx={rx} cy={y} r={r} fill={P.tear} fillOpacity={0.22} stroke={P.outline} strokeWidth={4.6} />
          <circle cx={rx} cy={y} r={r} fill="none" stroke={P.gold} strokeWidth={2.2} />
          <path d={`M${rx - r * 0.55} ${y - r * 0.2}A${r * 0.6} ${r * 0.6} 0 0 1 ${rx - r * 0.1} ${y - r * 0.6}`} stroke={P.white} strokeWidth={1.6} strokeLinecap="round" fill="none" />
          <path d={`M${lx - a.lensR + 1} ${y - a.lensR - 1.5}L${lx + a.lensR - 1} ${y - a.lensR + 1}`} {...inkLine} strokeWidth={2.2} />
        </g>
      );
    }
    case "reading-glasses": {
      const r = a.lensR * 0.95;
      const cy = y + r * 0.25;
      const lens = (cx: number) => `M${cx - r} ${cy}H${cx + r}A${r} ${r * 0.85} 0 0 1 ${cx - r} ${cy}Z`;
      return (
        <g>
          <path d={`M${lx - r} ${cy}L${64 - a.faceW} ${cy - 2}M${rx + r} ${cy}L${64 + a.faceW} ${cy - 2}`} {...inkLine} strokeWidth={1.8} />
          <path d={`M${lx + r} ${cy}Q64 ${cy - 4} ${rx - r} ${cy}`} {...inkLine} strokeWidth={3} />
          <path d={`M${lx + r} ${cy}Q64 ${cy - 4} ${rx - r} ${cy}`} fill="none" stroke={P.gold} strokeWidth={1.2} />
          <path d={lens(lx)} fill={P.white} fillOpacity={0.3} stroke={P.outline} strokeWidth={3.2} strokeLinejoin="round" />
          <path d={lens(rx)} fill={P.white} fillOpacity={0.3} stroke={P.outline} strokeWidth={3.2} strokeLinejoin="round" />
          <path d={lens(lx)} fill="none" stroke={P.gold} strokeWidth={1.3} strokeLinejoin="round" />
          <path d={lens(rx)} fill="none" stroke={P.gold} strokeWidth={1.3} strokeLinejoin="round" />
        </g>
      );
    }
    case "mustache":
      return (
        <g transform={`translate(64 ${a.mouthY}) scale(${a.mScale})`}>
          <path
            d="M0 -2.5C-3 -5.5 -9 -6 -13 -3C-16 -1 -19 -0.5 -21 -3.5C-22.5 -6 -21 -9 -18.5 -8.5C-20.5 -7 -19.5 -4.5 -17.5 -5C-19 -1 -19 3 -13 3.5C-8 4 -3 2 0 0.5C3 2 8 4 13 3.5C19 3 19 -1 17.5 -5C19.5 -4.5 20.5 -7 18.5 -8.5C21 -9 22.5 -6 21 -3.5C19 -0.5 16 -1 13 -3C9 -6 3 -5.5 0 -2.5Z"
            fill={P.ink}
            {...ink}
            strokeWidth={1.6}
          />
          <path d="M-12 -2.5Q-7 -4 -3 -1.5M12 -2.5Q7 -4 3 -1.5" stroke={P.owlBrown} strokeWidth={1.2} strokeLinecap="round" fill="none" />
        </g>
      );
    case "bowtie":
      return (
        <g transform="translate(64 101)">
          <path d="M-2 -2L-14 -8C-17 -4 -17 4 -14 8L-2 2ZM2 -2L14 -8C17 -4 17 4 14 8L2 2Z" fill={P.crimson} {...ink} strokeWidth={2} />
          <path d="M-13 5L-3 1.5V2L-14 8ZM13 5L3 1.5V2L14 8Z" fill={P.burgundyDark} opacity={0.6} />
          <circle cx={-10} cy={-2} r={1.1} fill={P.ivory} />
          <circle cx={-12} cy={3} r={1.1} fill={P.ivory} />
          <circle cx={-6} cy={1.5} r={1.1} fill={P.ivory} />
          <circle cx={10} cy={-2} r={1.1} fill={P.ivory} />
          <circle cx={12} cy={3} r={1.1} fill={P.ivory} />
          <circle cx={6} cy={1.5} r={1.1} fill={P.ivory} />
          <rect x={-3.6} y={-3.6} width={7.2} height={7.2} rx={2} fill={P.burgundyLight} {...ink} strokeWidth={1.8} />
        </g>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Robe + jabot                                                       */
/* ------------------------------------------------------------------ */

function Robe() {
  return (
    <g>
      <path d="M0 130C2 108 20 96 46 93H82C108 96 126 108 128 130Z" fill={P.black} {...ink} />
      <path d="M104 102C116 108 122 118 124 130H110C110 120 108 110 104 102ZM24 102C12 108 6 118 4 130H18C18 120 20 110 24 102Z" fill={P.charcoal} />
      <path d="M50 93L64 124L78 93Z" fill={P.ivory} {...ink} strokeWidth={1.6} />
      <path d="M45 93C52 102 58 116 60 130H38C37 116 39 102 45 93Z" fill={P.charcoal} {...ink} strokeWidth={2} />
      <path d="M83 93C76 102 70 116 68 130H90C91 116 89 102 83 93Z" fill={P.charcoal} {...ink} strokeWidth={2} />
      <path d="M47 99C51 106 54 114 56 122" stroke={P.pigeonDark} strokeWidth={1.4} strokeLinecap="round" fill="none" opacity={0.7} />
      <circle cx={46} cy={111} r={2.6} fill={P.gold} {...ink} strokeWidth={1.4} />
      <circle cx={45.4} cy={110.4} r={0.8} fill={P.goldLight} />
    </g>
  );
}

function Jabot() {
  return (
    <g>
      <path d="M53 93.5L63 96L57 102.5Z" fill={P.white} {...ink} strokeWidth={1.8} />
      <path d="M75 93.5L65 96L71 102.5Z" fill={P.white} {...ink} strokeWidth={1.8} />
      <path
        d="M59 97H69C70.5 103 73.5 109 76 115Q73.5 118 71 115.5Q67.5 119 64 116Q60.5 119 57 115.5Q54.5 118 52 115C54.5 109 57.5 103 59 97Z"
        fill={P.ivory}
        {...ink}
        strokeWidth={1.8}
      />
      <path d="M61 101Q59.5 108 57.5 114.5M67 101Q68.5 108 70.5 114.5M64 100.5V115" stroke={P.wigShade} strokeWidth={1.3} strokeLinecap="round" fill="none" />
      <path d="M58.5 96H69.5L72 103.5Q70 106 68 103.8Q66 106 64 103.8Q62 106 60 103.8Q58 106 56 103.5Z" fill={P.white} {...ink} strokeWidth={1.7} />
      <path d="M62 98V102M66 98V102" stroke={P.wigShade} strokeWidth={1.1} strokeLinecap="round" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Avatar                                                             */
/* ------------------------------------------------------------------ */

const SPECIES_LABEL: Record<Species, string> = {
  pigeon: "pigeon",
  raccoon: "raccoon",
  hamster: "hamster",
  cat: "cat",
  owl: "owl",
  frog: "frog",
  bulldog: "bulldog",
  goose: "goose",
};

const HEADWEAR_LABEL: Record<Headwear, string> = {
  none: "",
  "barrister-wig": "a barrister's wig",
  "judge-wig": "a full-bottom judge's wig",
  bowler: "a bowler hat",
  beret: "a beret",
  crown: "a crown",
  "party-hat": "a party hat",
  detective: "a deerstalker",
};

const ACCESSORY_LABEL: Record<Accessory, string> = {
  none: "",
  monocle: "a monocle",
  sunglasses: "sunglasses",
  bowtie: "a bow tie",
  mustache: "a mustache",
  "reading-glasses": "reading glasses",
};

function describe(c: AvatarConfig): string {
  const extras = [HEADWEAR_LABEL[c.headwear], ACCESSORY_LABEL[c.accessory]].filter(Boolean);
  return `Lawyer ${SPECIES_LABEL[c.species]} avatar${extras.length ? ` wearing ${extras.join(" and ")}` : ""}`;
}

export function Avatar({ config, className, title }: AvatarProps) {
  const uid = useId().replace(/:/g, "");
  const label = title ?? describe(config);
  const a = ANCHORS[config.species] ?? ANCHORS.pigeon;
  const backdrop = BACKDROP_COLORS[config.backdrop] ?? BACKDROP_COLORS.burgundy;
  const light = config.backdrop === "gold" || config.backdrop === "ivory";
  const hat = config.headwear !== "none" ? HATS[config.headwear] : undefined;
  const scale = a.hw / 26;
  const hatSw = (STROKE * 0.85) / scale;
  const hatTransform = `translate(${64 + a.hx} ${a.top}) scale(${scale})`;
  const Head = HEADS[config.species] ?? HEADS.pigeon;
  const clipId = `av-clip-${uid}`;
  const glowId = `av-glow-${uid}`;

  const rays = Array.from({ length: 12 }, (_, i) => {
    const a0 = (i / 12) * Math.PI * 2;
    const a1 = a0 + Math.PI / 24;
    const R = 90;
    return `M64 64L${(64 + Math.cos(a0) * R).toFixed(1)} ${(64 + Math.sin(a0) * R).toFixed(1)}L${(64 + Math.cos(a1) * R).toFixed(1)} ${(64 + Math.sin(a1) * R).toFixed(1)}Z`;
  }).join("");

  return (
    <svg viewBox="0 0 128 128" role="img" aria-label={label} className={["av", className].filter(Boolean).join(" ")} xmlns="http://www.w3.org/2000/svg">
      <title>{label}</title>
      <defs>
        <clipPath id={clipId}>
          <circle cx={64} cy={64} r={57} />
        </clipPath>
        <radialGradient id={glowId} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor={P.white} stopOpacity={light ? 0.35 : 0.16} />
          <stop offset="0.7" stopColor={P.white} stopOpacity={0} />
          <stop offset="1" stopColor={P.outline} stopOpacity={0.3} />
        </radialGradient>
      </defs>

      <circle cx={64} cy={64} r={62} fill={P.outline} />
      <g clipPath={`url(#${clipId})`}>
        <rect width={128} height={128} fill={backdrop.bg} />
        <path d={rays} fill={light ? P.outline : P.white} opacity={light ? 0.05 : 0.06} />
        <rect width={128} height={128} fill={`url(#${glowId})`} />
        <ellipse cx={64} cy={104} rx={50} ry={10} fill={P.shadow} />

        <Robe />
        {hat?.back ? <g transform={hatTransform}>{hat.back(hatSw, uid)}</g> : null}
        <Head />
        <Jabot />
        {config.accessory !== "none" ? <AccessoryArt kind={config.accessory} a={a} /> : null}
        {hat?.front ? <g transform={hatTransform}>{hat.front(hatSw, uid)}</g> : null}
      </g>
      <circle cx={64} cy={64} r={59.5} fill="none" stroke={backdrop.ring} strokeWidth={5} />
      <circle cx={64} cy={64} r={59.5} fill="none" stroke={P.white} strokeWidth={5} strokeDasharray="1 7" opacity={0.25} />
      <circle cx={64} cy={64} r={57} fill="none" stroke={P.outline} strokeWidth={1.6} />
      <circle cx={64} cy={64} r={62} fill="none" stroke={P.outline} strokeWidth={1.4} />
    </svg>
  );
}
