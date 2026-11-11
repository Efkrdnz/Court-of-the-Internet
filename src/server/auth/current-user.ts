import "server-only";
import { withQuery } from "@/lib/safe-next";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { CourtError } from "../errors";
import { appConfig } from "../config";
import { SESSION_COOKIE, SESSION_TTL_MS, resolveSession, type SessionUser } from "./sessions";

/** The logged-in user for this request (memoised per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  return resolveSession(store.get(SESSION_COOKIE)?.value);
});

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** For pages: redirect to /login when signed out. */
/**
 * For pages: send signed-out visitors to /login and back here afterwards. Pass the page's search
 * params so a deep link ("/moderation?case=42") survives the detour (audit 60 #1).
 */
export async function requireUserOrRedirect(next: string, params?: Record<string, string | string[] | undefined>): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(withQuery(next, params))}`);
  return user;
}


/** For actions: throw a CourtError when signed out or banned. */
export async function requireActiveUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new CourtError("UNAUTHENTICATED", "You need to be signed in to do that.");
  if (user.bannedAt) {
    throw new CourtError("BANNED", "You have been held in contempt of court (banned) and cannot take part.");
  }
  return user;
}

export function isStaff(user: Pick<SessionUser, "role"> | null | undefined): boolean {
  return user?.role === "ADMIN" || user?.role === "MODERATOR";
}

export async function requireStaff(): Promise<SessionUser> {
  const user = await requireActiveUser();
  if (!isStaff(user)) throw new CourtError("FORBIDDEN", "Only officers of the court may do that.");
  return user;
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // In production the cookie is Secure unless SITE_URL explicitly says the site is plain http
    // (a local run); an unset SITE_URL no longer means "not Secure" (audit 67).
    secure: appConfig.isProduction && !(process.env["SITE_URL"] || process.env["NEXT_PUBLIC_SITE_URL"] || "").startsWith("http://"),
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Client IP for rate limiting. The left-most X-Forwarded-For entries are whatever the client
 * claims, so only entries appended by our own proxies are trusted: with TRUST_PROXY_HOPS=N
 * (default 1, a single reverse proxy such as nginx / Vercel / Fly) we take the N-th entry
 * from the right. When the app is exposed directly (no proxy) this cannot be made spoof-proof
 * without the socket address, which Next does not expose to server actions (see README).
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const hops = Math.max(1, Number(process.env.TRUST_PROXY_HOPS ?? 1) || 1);
  const chain = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Unknown (no proxy header): callers skip per-IP limits rather than lumping every such client
  // into one shared bucket, which would let one noisy client lock everyone else out.
  const ip = chain.length ? chain[Math.max(0, chain.length - hops)] : h.get("x-real-ip");
  return ip ? ip.slice(0, 64) : null;
}
