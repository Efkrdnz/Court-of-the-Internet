"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginSchema, signupSchema } from "@/lib/validation";
import { assertNotStaffName, authenticate, registerUser } from "@/server/services/accounts";
import { createSession, destroySession } from "@/server/auth/sessions";
import { clearSessionCookie, clientIp, getSessionToken, setSessionCookie } from "@/server/auth/current-user";
import { assertUnderLimit, enforceRateLimit, hitRateLimit } from "@/server/rate-limit";
import { safeNext } from "@/lib/safe-next";
import { screenText } from "@/lib/content-filter";
import { appConfig } from "@/server/config";
import { CourtError } from "@/server/errors";
import { db } from "@/server/db";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";
import { formObject, isBot, toFailure, type ActionResult } from "./_util";


export async function signupAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  let next = "/court";
  try {
    if (isBot(formData)) throw new CourtError("VALIDATION", "The bailiff suspects you are a robot.");
    const input = signupSchema.parse(formObject(formData));
    // Same content rules as Settings, checked (like a taken username) before spending the signup budget.
    for (const [field, value] of [
      ["username", input.username],
      ["displayName", input.displayName],
    ] as const) {
      const screened = screenText(value, { allowSpamCheck: false });
      if (!screened.ok) throw new CourtError("CONTENT_REJECTED", screened.message!, field);
    }
    await assertNotStaffName(input.displayName);
    if (await db.user.findUnique({ where: { username: input.username }, select: { id: true } })) {
      throw new CourtError("CONFLICT", "That username is already taken.", "username");
    }
    const ip = await clientIp();
    if (ip) await enforceRateLimit(`signup:${ip}`, 6, 3600, "Too many new identities from here. Try again later.");
    // Without a client IP, a loose site-wide ceiling still stops a signup flood.
    else await enforceRateLimit("signup:unknown-ip", 60, 3600, "Too many new identities right now. Try again later.");
    next = safeNext(formData.get("next"));
    const user = await registerUser({ username: input.username, displayName: input.displayName, password: input.password });
    const ua = (await headers()).get("user-agent");
    const session = await createSession(user.id, ua);
    await setSessionCookie(session.token);
  } catch (e) {
    return toFailure(e);
  }
  redirect(next === "/court" ? "/court?welcome=1" : next);
}

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  let next = "/court";
  try {
    const ip = await clientIp();
    const input = loginSchema.parse(formObject(formData));
    // Only *failed* logins count (people sharing an office or NAT IP shouldn't lock each other
    // out by logging in successfully). Strict per (account, IP) so one attacker can't lock the
    // owner out from elsewhere; a looser per-account ceiling still slows distributed guessing.
    const limits: [string, number, string][] = [
      ...(ip
        ? ([
            [`login:${ip}`, 20, "Too many failed attempts. The court is in recess for 15 minutes."],
            [`login-user-ip:${input.username}:${ip}`, 8, "Too many failed attempts for that account. Try again in 15 minutes."],
          ] as [string, number, string][])
        : []),
      [`login-user:${input.username}`, 100, "Too many failed attempts for that account. Try again in 15 minutes."],
    ];
    for (const [key, limit, message] of limits) await assertUnderLimit(key, limit, 900, message);
    next = safeNext(formData.get("next"));
    let user;
    try {
      user = await authenticate(input.username, input.password);
    } catch (e) {
      if (process.env.DISABLE_RATE_LIMITS !== "1") for (const [key] of limits) await hitRateLimit(key, 1, 900);
      throw e;
    }
    // A successful login clears this account's failures from this IP.
    if (ip) await db.rateLimit.deleteMany({ where: { key: `login-user-ip:${input.username}:${ip}` } });
    const ua = (await headers()).get("user-agent");
    const session = await createSession(user.id, ua);
    await setSessionCookie(session.token);
  } catch (e) {
    return toFailure(e);
  }
  redirect(next);
}

/** One-click login for seeded demo accounts (development / demo deployments only). */
export async function demoLoginAction(formData: FormData): Promise<void> {
  if (!appConfig.demoLoginEnabled) redirect("/login");
  const username = String(formData.get("username") ?? "");
  // Only the advertised demo accounts, not every seeded player that shares the demo password.
  if (!DEMO_ACCOUNTS.some((a) => a.username === username)) redirect("/login?demo=missing");
  const user = await db.user.findUnique({ where: { username }, select: { id: true, deletedAt: true } });
  if (!user || user.deletedAt) redirect("/login?demo=missing");
  // Demo accounts all share the published demo password; verify it like a normal login.
  try {
    await authenticate(username, DEMO_PASSWORD);
  } catch {
    redirect("/login?demo=missing");
  }
  const session = await createSession(user.id, "demo-login");
  await setSessionCookie(session.token);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await destroySession(await getSessionToken());
  await clearSessionCookie();
  redirect("/");
}
