/**
 * Achievement definitions. Unlock logic lives in src/server/services/achievements.ts;
 * this file is isomorphic so the UI can render names, descriptions and art.
 */

export type AchievementTier = "bronze" | "silver" | "gold" | "legendary";

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  /** Short courtroom-flavoured quip shown on unlock. */
  quip: string;
  tier: AchievementTier;
  /** Art id rendered by <AchievementBadge>. */
  icon:
    | "quill"
    | "handcuffs"
    | "skull-wig"
    | "halo"
    | "wanted"
    | "briefcase"
    | "pinocchio"
    | "rocket"
    | "megaphone"
    | "gavel"
    | "stamp"
    | "raccoon"
    | "scales"
    | "cat"
    | "coin"
    | "rope"
    | "trident"
    | "stopwatch"
    | "crown"
    | "pizza";
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "opening-statement",
    name: "Opening Statement",
    description: "Confess your first crime.",
    quip: "The first step to justice is admitting you ate it.",
    tier: "bronze",
    icon: "quill",
  },
  {
    key: "serial-defendant",
    name: "Serial Defendant",
    description: "Publicly confess to 5 crimes.",
    quip: "The bailiff knows your coffee order.",
    tier: "silver",
    icon: "handcuffs",
  },
  {
    key: "certified-menace",
    name: "Certified Menace",
    description: "Be found guilty 3 times.",
    quip: "Your mugshot has a frame now.",
    tier: "gold",
    icon: "skull-wig",
  },
  {
    key: "clean-record",
    name: "Clean Record",
    description: "Be found not guilty.",
    quip: "Innocent! (Allegedly.)",
    tier: "bronze",
    icon: "halo",
  },
  {
    key: "public-enemy",
    name: "Public Enemy Number One",
    description: "Be convicted with at least 90% of the jury voting guilty.",
    quip: "The jury didn't even need to deliberate.",
    tier: "gold",
    icon: "wanted",
  },
  {
    key: "goodman-apprentice",
    name: "Saul Goodman's Apprentice",
    description: "Win your first case as a defense attorney.",
    quip: "Better call... you, apparently.",
    tier: "bronze",
    icon: "briefcase",
  },
  {
    key: "professional-liar",
    name: "Professional Liar",
    description: "Win 5 cases as a defense attorney.",
    quip: "Your nose grows only when you're honest.",
    tier: "silver",
    icon: "pinocchio",
  },
  {
    key: "unstoppable-attorney",
    name: "Unstoppable Attorney",
    description: "Win 5 defense cases in a row.",
    quip: "Opposing counsel has filed for emotional damages.",
    tier: "legendary",
    icon: "rocket",
  },
  {
    key: "peoples-champion",
    name: "The People's Champion",
    description: "Win a defense with at least 80% of the jury voting not guilty.",
    quip: "The gallery is chanting your name. Security is concerned.",
    tier: "gold",
    icon: "megaphone",
  },
  {
    key: "first-conviction",
    name: "First Conviction",
    description: "Win your first case as a prosecutor.",
    quip: "Justice tastes like stolen pizza.",
    tier: "bronze",
    icon: "gavel",
  },
  {
    key: "objection-overruled",
    name: "Objection Overruled",
    description: "Win a prosecution with at least 75% of the jury voting guilty.",
    quip: "The defense's objection has been noted, laminated, and ignored.",
    tier: "silver",
    icon: "stamp",
  },
  {
    key: "silver-tongued-raccoon",
    name: "Silver-Tongued Raccoon",
    description: "Win 3 prosecutions in a row.",
    quip: "You point at evidence like it owes you money.",
    tier: "gold",
    icon: "raccoon",
  },
  {
    key: "justice-served",
    name: "Justice Has Been Served",
    description: "Cast 10 jury votes.",
    quip: "Ten verdicts. Zero naps. Mostly.",
    tier: "bronze",
    icon: "scales",
  },
  {
    key: "cat-herder",
    name: "Cat Herder",
    description: "Cast 50 jury votes.",
    quip: "The cats on the jury now acknowledge you. Barely.",
    tier: "gold",
    icon: "cat",
  },
  {
    key: "swing-vote",
    name: "The Swing Vote",
    description: "Vote with the majority on a case decided by exactly one vote.",
    quip: "Democracy hung on your thumb.",
    tier: "silver",
    icon: "coin",
  },
  {
    key: "hung-out-to-dry",
    name: "Hung Out to Dry",
    description: "Argue a case that ends in a mistrial.",
    quip: "The jury split like a bill nobody wants to pay.",
    tier: "bronze",
    icon: "rope",
  },
  {
    key: "triple-threat",
    name: "Triple Threat",
    description: "Be the accused, the attorney, the prosecutor and a juror at least once.",
    quip: "You've seen the court from every bench. And the snack machine.",
    tier: "silver",
    icon: "trident",
  },
  {
    key: "speed-lawyer",
    name: "Speed Lawyer",
    description: "File an argument within 3 minutes of claiming a case.",
    quip: "Billable hours: 0.05.",
    tier: "bronze",
    icon: "stopwatch",
  },
  {
    key: "legendary-litigator",
    name: "Legendary Litigator",
    description: "Take part in a case that receives 10 Legendary reactions.",
    quip: "They'll teach this one in law school. A bad one.",
    tier: "legendary",
    icon: "crown",
  },
  {
    key: "snack-attack",
    name: "Snack Attack",
    description: "Confess to a Food Crime.",
    quip: "The pizza will remember this.",
    tier: "bronze",
    icon: "pizza",
  },
];

const byKey = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

export function getAchievement(key: string): AchievementDef | undefined {
  return byKey.get(key);
}

export const TIER_STYLE: Record<AchievementTier, { label: string; ring: string; fill: string }> = {
  bronze: { label: "Bronze", ring: "#a8693a", fill: "#5a3420" },
  silver: { label: "Silver", ring: "#c9ccd1", fill: "#4a4f57" },
  gold: { label: "Gold", ring: "#e8c766", fill: "#6b4f12" },
  legendary: { label: "Legendary", ring: "#d59cf0", fill: "#3e1a52" },
};
