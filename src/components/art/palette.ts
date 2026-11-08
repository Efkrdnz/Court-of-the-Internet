/**
 * Shared palette for all original illustrations. Art uses hard-coded hex values
 * (not CSS variables) so it renders identically in pages, OG images and exports.
 */
export const P = {
  outline: "#1a0f12", // the universal ink outline
  ink: "#2a1c16",
  charcoal: "#2a2326",
  black: "#0d0a0b",
  burgundy: "#6b1426",
  burgundyDark: "#3b0a14",
  burgundyLight: "#8c1d2f",
  crimson: "#b3202a",
  gold: "#c9a227",
  goldLight: "#e8c766",
  goldDark: "#8a6d1c",
  parchment: "#efe3c8",
  parchmentDark: "#d9c7a0",
  ivory: "#faf6ec",
  white: "#ffffff",
  wig: "#f4efe4",
  wigShade: "#d8cfbd",
  blush: "#f2a7a0",
  teal: "#1f6f5c",
  tealLight: "#2f8f83",
  plum: "#4b2a5e",
  // creature tones
  pigeonGrey: "#8d93a3",
  pigeonDark: "#5f6577",
  pigeonIris: "#6fbf9a",
  raccoonGrey: "#7b7476",
  raccoonDark: "#3d3537",
  hamster: "#e0a462",
  hamsterLight: "#f7dcb6",
  owlBrown: "#8a5a3b",
  owlLight: "#c9a07a",
  bulldog: "#c8a27a",
  bulldogDark: "#8f6a4a",
  catOrange: "#e08a3c",
  catGrey: "#8a8f99",
  catBlack: "#2b2a30",
  catCream: "#f1e2c6",
  frogGreen: "#6fa84f",
  gooseWhite: "#f3f1ea",
  beak: "#f0a63a",
  pizzaCrust: "#d99a4e",
  pizzaCheese: "#f6c945",
  pepperoni: "#c2412d",
  tear: "#7cc4e8",
  shadow: "rgba(26,15,18,0.18)",
} as const;

export const STROKE = 3;
