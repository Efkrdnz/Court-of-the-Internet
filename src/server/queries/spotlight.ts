import type { Prisma } from "@prisma/client";

/**
 * Cases that may be put in the spotlight: the featured case of the day, the home page's
 * highlights and the "Most entertaining" board.
 * - A public case follows its confessor's current featuring setting (audit 44 #4) and leaves the
 *   spotlight while they're held in contempt.
 * - An anonymous case follows the setting as it was when it was filed (`featurable`): if it moved
 *   with later changes, it would come and go together with the player's public cases and link
 *   them (audit 46 D3). For the same reason a ban doesn't touch it.
 */
export const SPOTLIGHT_OK = {
  OR: [
    { anonymous: true, featurable: true },
    { anonymous: false, accused: { allowFeaturing: true, bannedAt: null } },
  ],
} satisfies Prisma.CaseWhereInput;
