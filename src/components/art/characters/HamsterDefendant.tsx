import { P, STROKE } from "../palette";

const ol = {
  stroke: P.outline,
  strokeWidth: STROKE,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;
const SHADE = "rgba(26,15,18,0.18)";

function Drop({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M${x} ${y}C${x - 5 * s} ${y + 8 * s} ${x - 6 * s} ${y + 12 * s} ${x - 6 * s} ${y + 14 * s}A${6 * s} ${6 * s} 0 0 0 ${x + 6 * s} ${y + 14 * s}C${x + 6 * s} ${y + 12 * s} ${x + 5 * s} ${y + 8 * s} ${x} ${y}Z`}
      fill={P.tear}
      stroke={P.outline}
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
  );
}

export function HamsterDefendant({
  className,
  title,
  nervous = false,
}: {
  className?: string;
  title?: string;
  nervous?: boolean;
}) {
  const label =
    title ?? "Suspicious hamster defendant with suspiciously stuffed cheeks, holding a booking placard";

  return (
    <svg
      viewBox="0 0 240 260"
      role="img"
      aria-label={label}
      className={["chr-root chr-hamster", nervous && "chr-nervous", className].filter(Boolean).join(" ")}
      width="100%"
      overflow="visible"
    >
      <title>{label}</title>
      <ellipse cx={120} cy={248} rx={74} ry={8} fill={P.shadow} />
      <g className="chr-figure">

        <g className={nervous ? "chr-shake" : "chr-bob"} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
          {/* a single french fry, very badly hidden behind its back */}
          <g transform="rotate(-40 66 196)">
            <path d="M54 138L66 136L68 198L56 200Z" fill={P.pizzaCheese} {...ol} />
            <path d="M54 138L66 136L66.4 146L54.4 148Z" fill={P.pizzaCrust} />
            <path d="M54 138L66 136L68 198L56 200Z" fill="none" {...ol} />
            <path d="M60 150V182" stroke={P.goldLight} strokeWidth={2.5} strokeLinecap="round" />
            <g fill={P.white}>
              <circle cx={58} cy={156} r={1} />
              <circle cx={63} cy={164} r={1} />
              <circle cx={59} cy={172} r={1} />
            </g>
          </g>
          <path d="M14 150l-6 -6M22 144l-2 -8M10 162h-7" stroke={P.outline} strokeWidth={5.5} strokeLinecap="round" />
          <path d="M14 150l-6 -6M22 144l-2 -8M10 162h-7" stroke={P.goldLight} strokeWidth={2.5} strokeLinecap="round" />
          {/* tail nub + feet */}
          {[98, 142].map((fx) => (
            <path
              key={fx}
              d={`M${fx - 16} 244C${fx - 16} 232 ${fx - 8} 228 ${fx} 228C${fx + 8} 228 ${fx + 16} 232 ${fx + 16} 244Z`}
              fill={P.blush}
              {...ol}
            />
          ))}
          <path d="M88 244v-5M96 244v-6M134 244v-6M142 244v-5" stroke={P.outline} strokeWidth={2} strokeLinecap="round" />

          {/* body */}
          <path d="M62 150C58 96 86 60 120 60C154 60 182 96 178 150C176 204 152 236 120 236C88 236 64 204 62 150Z" fill={P.hamster} {...ol} />
          <path d="M152 76C172 96 180 126 176 158C172 196 156 224 130 234C154 214 166 186 166 152C166 120 162 94 152 76Z" fill={SHADE} />
          <path d="M84 150C82 126 98 116 120 116C142 116 158 126 156 150C156 190 142 222 120 222C98 222 84 190 84 150Z" fill={P.hamsterLight} />
          {/* crumbs of evidence */}
          <g fill={P.pizzaCrust} stroke={P.outline} strokeWidth={1.5} strokeLinejoin="round">
            <path d="M98 136l5 -2l2 4l-4 3Z" />
            <path d="M132 130l4 1l-1 4l-4 -1Z" />
            <path d="M112 142l3 2l-2 3l-3 -2Z" />
            <path d="M144 214l4 -1l1 4l-4 1Z" />
          </g>

          {/* ears */}
          <path d="M80 82C68 74 68 54 82 50C94 48 102 60 98 70Z" fill={P.hamster} {...ol} />
          <path d="M82 72C76 66 78 58 84 58C90 58 92 64 90 68Z" fill={P.blush} />
          <path d="M160 82C172 74 172 54 158 50C146 48 138 60 142 70Z" fill={P.hamster} {...ol} />
          <path d="M158 72C164 66 162 58 156 58C150 58 148 64 150 68Z" fill={P.blush} />

          {/* face patch */}
          <path d="M100 84C108 76 132 76 140 84C150 96 146 118 120 122C94 118 90 96 100 84Z" fill={P.hamsterLight} />

          {/* the STUFFED cheeks */}
          <g className="chr-cheeks" style={{ transformBox: "fill-box", transformOrigin: "50% 40%" }}>
            <path d="M100 96C80 84 52 92 52 118C52 140 76 150 96 140C110 132 112 108 100 96Z" fill={P.hamsterLight} {...ol} />
            <path d="M140 96C160 84 188 92 188 118C188 140 164 150 144 140C130 132 128 108 140 96Z" fill={P.hamsterLight} {...ol} />
            <path d="M60 124C64 136 78 142 92 138C80 136 68 132 60 124Z" fill={SHADE} />
            <path d="M180 124C176 136 162 142 148 138C160 136 172 132 180 124Z" fill={SHADE} />
            <ellipse cx={74} cy={120} rx={9} ry={5} fill={P.blush} />
            <ellipse cx={166} cy={120} rx={9} ry={5} fill={P.blush} />
            <path d="M62 104Q68 98 76 98M178 104Q172 98 164 98" stroke={P.white} strokeWidth={3} strokeLinecap="round" fill="none" />
            {/* lumps of contraband visible through the cheek */}
            <path d="M66 112q4 -3 8 0M168 110q4 -3 8 1" stroke={P.hamster} strokeWidth={2.5} strokeLinecap="round" fill="none" />
          </g>

          {/* shifty eyes, looking anywhere but at the jury */}
          <g className="chr-blink chr-shifty" style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
            <ellipse cx={104} cy={92} rx={10} ry={11} fill={P.ivory} {...ol} strokeWidth={2.5} />
            <ellipse cx={136} cy={92} rx={10} ry={11} fill={P.ivory} {...ol} strokeWidth={2.5} />
            <g className="chr-pupils" style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
              <circle cx={109} cy={93} r={nervous ? 3.5 : 5.5} fill={P.black} />
              <circle cx={141} cy={93} r={nervous ? 3.5 : 5.5} fill={P.black} />
              <circle cx={110.5} cy={90.5} r={1.6} fill={P.white} />
              <circle cx={142.5} cy={90.5} r={1.6} fill={P.white} />
            </g>
            {/* heavy guilty lids */}
            <path d="M94 88Q104 80 114 88Q104 85 94 88Z" fill={P.hamster} {...ol} strokeWidth={2.5} />
            <path d="M126 88Q136 80 146 88Q136 85 126 88Z" fill={P.hamster} {...ol} strokeWidth={2.5} />
          </g>
          {/* worried brows */}
          <path d="M94 74Q102 72 110 78M146 74Q138 72 130 78" stroke={P.outline} strokeWidth={3.5} strokeLinecap="round" fill="none" />

          {/* nose, mouth (pressed shut), whiskers */}
          <path d="M116 104Q120 101 124 104Q122 108 120 108Q118 108 116 104Z" fill={P.blush} {...ol} strokeWidth={2} />
          <path d={nervous ? "M110 114Q113 111 116 114Q119 117 122 114Q125 111 128 114Q131 117 132 114" : "M112 114Q116 117 120 113Q124 117 128 114"} stroke={P.outline} strokeWidth={2.5} strokeLinecap="round" fill="none" />
          <path d="M128 115Q133 114 133 118Q132 121 129 119Z" fill={P.crimson} stroke={P.outline} strokeWidth={1.2} />
          <path d="M98 106l-18 -4M98 110l-16 4M142 106l18 -4M142 110l16 4" stroke={P.outline} strokeWidth={1.6} strokeLinecap="round" />

          {/* booking placard */}
          <path d="M100 150L120 128L140 150" stroke={P.outline} strokeWidth={1.8} fill="none" />
          <g transform="rotate(-4 120 172)">
            <rect x={82} y={150} width={76} height={42} rx={3} fill={P.charcoal} {...ol} />
            <rect x={86} y={154} width={68} height={34} rx={2} fill="none" stroke={P.parchmentDark} strokeWidth={1.2} />
            <text x={120} y={167} textAnchor="middle" fontFamily='"Special Elite", "Courier New", monospace' fontSize={10} fill={P.parchment}>
              COUNTY CAGE
            </text>
            <text x={120} y={183} textAnchor="middle" fontFamily='"Special Elite", "Courier New", monospace' fontSize={13} fill={P.ivory}>
              No 00451
            </text>
          </g>
          {/* paws gripping the placard */}
          <path d="M78 186C72 180 76 170 86 172C94 174 94 186 86 190C82 191 80 189 78 186Z" fill={P.blush} {...ol} />
          <path d="M162 182C168 176 164 166 154 168C146 170 146 182 154 186C158 187 160 185 162 182Z" fill={P.blush} {...ol} />

          {/* sweat */}
          <g className="chr-sweat">
            <Drop x={158} y={62} />
            {nervous && (
              <>
                <Drop x={74} y={66} s={0.8} />
                <Drop x={172} y={88} s={0.7} />
              </>
            )}
          </g>
          {nervous && (
            <g strokeLinecap="round" fill="none">
              <path d="M40 80l-8 -4M38 94h-9M200 80l8 -4M202 94h9" stroke={P.outline} strokeWidth={5.5} />
              <path d="M40 80l-8 -4M38 94h-9M200 80l8 -4M202 94h9" stroke={P.ivory} strokeWidth={2.5} />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
