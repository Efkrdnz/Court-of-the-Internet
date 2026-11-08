/**
 * Seeded demo accounts. These exist only when `npm run db:seed` has been run and the
 * one-click demo login is shown only when ENABLE_DEMO_LOGIN is on (default outside production).
 */
export const DEMO_PASSWORD = "objection-sustained";

export const DEMO_ACCOUNTS = [
  { username: "judge_wigsworth", blurb: "Admin & moderator. Has the gavel.", role: "ADMIN" },
  { username: "counselor_coo", blurb: "Pigeon attorney with a winning streak.", role: "PLAYER" },
  { username: "da_rascal", blurb: "Raccoon prosecutor. Points at things.", role: "PLAYER" },
  { username: "hammy_the_accused", blurb: "Serial defendant. Cheeks full.", role: "PLAYER" },
  { username: "juror_whiskers", blurb: "Professional judgmental cat.", role: "PLAYER" },
  { username: "fresh_intern", blurb: "Brand new. No record. Yet.", role: "PLAYER" },
] as const;
