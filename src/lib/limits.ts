/** Field limits shared by client counters and server validation. */
export const LIMITS = {
  title: { min: 6, max: 90 },
  confession: { min: 30, max: 600 },
  context: { max: 400 },
  argument: { min: 40, max: 750 },
  username: { min: 3, max: 20 },
  displayName: { min: 2, max: 32 },
  password: { min: 8, max: 128 },
  bio: { max: 200 },
  reportDetails: { max: 500 },
} as const;
