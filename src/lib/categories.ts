/**
 * Case categories. Keys are stored in the DB (`Case.category`), so never rename a key:
 * only change labels.
 */
export const CATEGORIES = [
  {
    key: "food-crimes",
    label: "Food Crimes",
    statute: "§ 1-FRY",
    blurb: "Theft, hoarding, or desecration of snacks.",
    color: "#c2412d",
  },
  {
    key: "gaming-offenses",
    label: "Gaming Offenses",
    statute: "§ 2-GG",
    blurb: "Rage quits, unplugged controllers, sabotage.",
    color: "#4a6fa5",
  },
  {
    key: "roommate-disputes",
    label: "Roommate Disputes",
    statute: "§ 3-DISH",
    blurb: "Dishes, thermostats, and mysterious missing oat milk.",
    color: "#7a8b3a",
  },
  {
    key: "group-chat-treason",
    label: "Group Chat Treason",
    statute: "§ 4-SEEN",
    blurb: "Left on read. Screenshots. Muted the chat.",
    color: "#2f8f83",
  },
  {
    key: "spoilers-hot-takes",
    label: "Spoilers & Hot Takes",
    statute: "§ 5-MID",
    blurb: "Endings revealed. Opinions nobody asked for.",
    color: "#9b4dca",
  },
  {
    key: "petty-theft",
    label: "Petty Theft",
    statute: "§ 6-PEN",
    blurb: "Pens, hoodies, chargers, and one (1) fry each.",
    color: "#b8862b",
  },
  {
    key: "social-misconduct",
    label: "Social Misconduct",
    statute: "§ 7-RSVP",
    blurb: "Flaking, fibbing, and fake 'on my way' texts.",
    color: "#c05a86",
  },
  {
    key: "workplace-shenanigans",
    label: "Workplace Shenanigans",
    statute: "§ 8-CC",
    blurb: "Reply-all incidents and fridge-label violations.",
    color: "#5b6b7a",
  },
  {
    key: "pet-related",
    label: "Pet-Related Incidents",
    statute: "§ 9-WOOF",
    blurb: "Crimes committed by, against, or blamed on pets.",
    color: "#8a5a3b",
  },
  {
    key: "fashion-crimes",
    label: "Crimes Against Fashion",
    statute: "§ 10-DRIP",
    blurb: "Socks with sandals. Matching outfits. Crocs at weddings.",
    color: "#d0763a",
  },
  {
    key: "romance-blunders",
    label: "Romance Blunders",
    statute: "§ 11-<3",
    blurb: "Accidental 'love you's and haunted dating apps.",
    color: "#b3263e",
  },
  {
    key: "miscellaneous-mischief",
    label: "Miscellaneous Mischief",
    statute: "§ 99-???",
    blurb: "Defies classification. The court is intrigued.",
    color: "#6e5a8a",
  },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as [CategoryKey, ...CategoryKey[]];

const byKey = new Map<string, Category>(CATEGORIES.map((c) => [c.key, c]));

export function getCategory(key: string): Category {
  return byKey.get(key) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function isCategoryKey(key: string): key is CategoryKey {
  return byKey.has(key);
}
