import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { db } from "../db";
import { clock } from "../clock";
import { appConfig } from "../config";

export const SESSION_COOKIE = "coti_session";
export const SESSION_TTL_MS = 30 * 24 * 3_600_000;
const REFRESH_AFTER_MS = 24 * 3_600_000;

/** Only an HMAC of the token is stored, so a DB leak does not leak live sessions. */
export function hashToken(token: string): string {
  return createHmac("sha256", appConfig.sessionSecret).update(token).digest("hex");
}

export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      lastSeenAt: now,
      userAgent: userAgent?.slice(0, 200) ?? null,
    },
  });
  return { token, expiresAt };
}

export const sessionUserSelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  avatar: true,
  bannedAt: true,
  banReason: true,
  deletedAt: true,
  reducedMotion: true,
  mutedCategories: true,
  allowFeaturing: true,
  membershipTier: true,
  membershipExpiresAt: true,
  profileTheme: true,
  featuredBadge: true,
  bio: true,
  createdAt: true,
} as const;

export async function resolveSession(token: string | undefined | null) {
  if (!token || token.length > 200) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, expiresAt: true, lastSeenAt: true, user: { select: sessionUserSelect } },
  });
  const now = clock.now();
  if (!session) return null;
  if (session.expiresAt <= now || session.user.deletedAt) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (now.getTime() - session.lastSeenAt.getTime() > REFRESH_AFTER_MS) {
    await db.session
      .update({
        where: { id: session.id },
        data: { lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) },
      })
      .catch(() => undefined);
  }
  return session.user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof resolveSession>>>;

export async function destroySession(token: string | undefined | null) {
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function destroyAllSessions(userId: string, exceptToken?: string) {
  await db.session.deleteMany({
    where: { userId, ...(exceptToken ? { NOT: { tokenHash: hashToken(exceptToken) } } : {}) },
  });
}
