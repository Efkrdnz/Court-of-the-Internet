/**
 * Preview gallery for badges, avatars and empty-state scenes.
 *   npx tsx scripts/art-preview.tsx scripts/art-galleries/badges.tsx /tmp/out.png 1400 [--dark]
 */
import { AchievementBadge } from "../../src/components/art/badges";
import { Avatar } from "../../src/components/art/avatar";
import { ConfusedPigeon, GavelLoading, SealedCase, SleepingBailiff, TumbleweedDocket } from "../../src/components/art/scenes";
import { ACHIEVEMENTS, type AchievementTier } from "../../src/lib/achievements";
import { ACCESSORIES, BACKDROPS, HEADWEAR, SPECIES, type AvatarConfig } from "../../src/lib/avatar";

const TIERS: AchievementTier[] = ["bronze", "silver", "gold", "legendary"];
const LOCKED = new Set([3, 10, 17]);

const avatars: AvatarConfig[] = [
  // judge-wig + sunglasses on every species
  ...SPECIES.map((species, i): AvatarConfig => ({ species, headwear: "judge-wig", accessory: "sunglasses", backdrop: BACKDROPS[i % BACKDROPS.length] })),
  // every species x every other headwear, cycling accessories
  ...SPECIES.flatMap((species, si) =>
    HEADWEAR.filter((h) => h !== "judge-wig").map(
      (headwear, hi): AvatarConfig => ({
        species,
        headwear,
        accessory: ACCESSORIES[(si + hi) % ACCESSORIES.length],
        backdrop: BACKDROPS[(si * 2 + hi) % BACKDROPS.length],
      }),
    ),
  ),
];

const h3 = { margin: "28px 0 12px", fontFamily: "Playfair Display" } as const;

export default function Gallery() {
  return (
    <div>
      <style>{"*{animation:none!important}"}</style>
      <h3 style={h3}>Achievement badges (110px) — every icon, rotating tiers, 3 locked</h3>
      <div className="gallery">
        {ACHIEVEMENTS.map((a, i) => (
          <figure key={a.key} style={{ width: 110 }}>
            <AchievementBadge icon={a.icon} tier={TIERS[i % 4]} locked={LOCKED.has(i)} />
            <figcaption>{a.icon}</figcaption>
          </figure>
        ))}
      </div>
      <h3 style={h3}>At 56px (real tiers)</h3>
      <div className="gallery" style={{ gap: 12 }}>
        {ACHIEVEMENTS.map((a) => (
          <div key={a.key} style={{ width: 56 }}>
            <AchievementBadge icon={a.icon} tier={a.tier} />
          </div>
        ))}
      </div>
      <h3 style={h3}>Avatars ({avatars.length}) — row 1: judge-wig + sunglasses on every species</h3>
      <div className="gallery" style={{ gap: 14 }}>
        {avatars.map((c, i) => (
          <figure key={i} style={{ width: 96 }}>
            <Avatar config={c} />
            <figcaption style={{ fontSize: 9 }}>
              {c.species}/{c.headwear}/{c.accessory}
            </figcaption>
          </figure>
        ))}
      </div>
      <h3 style={h3}>Avatars at 40px</h3>
      <div className="gallery" style={{ gap: 8 }}>
        {avatars.slice(0, 24).map((c, i) => (
          <div key={i} style={{ width: 40 }}>
            <Avatar config={c} />
          </div>
        ))}
      </div>
      <h3 style={h3}>Empty states</h3>
      <div className="gallery">
        <figure style={{ width: 420 }}><TumbleweedDocket /><figcaption>TumbleweedDocket</figcaption></figure>
        <figure style={{ width: 320 }}><ConfusedPigeon /><figcaption>ConfusedPigeon</figcaption></figure>
        <figure style={{ width: 420 }}><SleepingBailiff /><figcaption>SleepingBailiff</figcaption></figure>
        <figure style={{ width: 400 }}><SealedCase /><figcaption>SealedCase</figcaption></figure>
        <figure style={{ width: 120 }}><GavelLoading /><figcaption>GavelLoading</figcaption></figure>
        <figure style={{ width: 48 }}><GavelLoading /><figcaption>48px</figcaption></figure>
      </div>
    </div>
  );
}
