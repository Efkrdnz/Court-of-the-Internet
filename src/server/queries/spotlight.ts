import type { Prisma } from "@prisma/client";

/**
 * Cases that may be put in the spotlight: the featured case of the day, the home page's
 * highlights and the "Most entertaining" board. The confessor must allow featuring (audit 44 #4:
 * the setting only covered the featured slot) and must not be held in contempt. Anonymous cases
 * of a banned player stay eligible, so a ban never reveals who confessed them.
 */
export const SPOTLIGHT_OK = {
  AND: [{ accused: { allowFeaturing: true } }, { OR: [{ anonymous: true }, { accused: { bannedAt: null } }] }],
} satisfies Prisma.CaseWhereInput;
