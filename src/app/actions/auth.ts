"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { COURT_TITLE_MESSAGE, hasCourtTitle, loginSchema, signupSchema } from "@/lib/validation";
import { assertNotStaffName, authenticate, registerUser } from "@/server/services/accounts";
import { createSession, destroySession } from "@/server/auth/sessions";
import { clearSessionCookie, clientIp, getSessionToken, setSessionCookie } from "@/server/auth/current-user";
import { enforceRateLimit } from "@/server/rate-limit";
import { loginWithLimits } from "@/server/services/login";
import { safeNext } from "@/lib/safe-next";
import { screenText } from "@/lib/content-filter";
import { appConfig } from "@/server/config";
import { CourtError } from "@/server/errors";
import { db } from "@/server/db";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";
import { assertForm, formObject, isBot, toFailure, type ActionResult } from "./_util";


export async function signupAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  let next = "/court";
  try {
    assertForm(formData);
    if (isBot(formData)) throw new CourtError("VALIDATION", "The bailiff suspects you are a robot.");
    const input = signupSchema.parse(formObject(formData));
    // Same content rules as Settings, checked (like a taken username) before spending the signup
    // budget. Every problem is reported at once, per field, so a player doesn't fix one only to
    // meet the next (audit 54 D5).
    const problems: Partial<Record<"username" | "displayName", string>> = {};
    const check = async (field: "username" | "displayName", run: () => Promise<void> | void) => {
      if (problems[field]) return;
      try {
        await run();
      } catch (e) {
        if (e instanceof CourtError) problems[field] = e.message;
        else throw e;
      }
    };
    for (const [field, value] of [
      ["username", input.username],
      ["displayName", input.displayName],
    ] as const) {
      const screened = screenText(value, { allowSpamCheck: false });
      if (!screened.ok) problems[field] = screened.message!;
    }
    await check("displayName", () => {
      if (hasCourtTitle(input.displayName)) throw new CourtError("VALIDATION", COURT_TITLE_MESSAGE, "displayName");
    });
    await check("displayName", () => assertNotStaffName(input.displayName));
    // Usernames show on profiles, case chips and leaderboards too: no "judge_wigsworth_" or
    // "court_moderator" (audit 45 D1).
    await check("username", () => {
      if (hasCourtTitle(input.username)) throw new CourtError("VALIDATION", "That username is reserved: it reads as a court title, the site itself or a system account. Pick your own.", "username");
    });
    await check("username", () => assertNotStaffName(input.username.replace(/_/g, " "), undefined, "username"));
    await check("username", async () => {
      if (await db.user.findUnique({ where: { username: input.username }, select: { id: true } })) {
        throw new CourtError("CONFLICT", "That username is already taken.", "username");
      }
    });
    const fields = Object.entries(problems) as ["username" | "displayName", string][];
    if (fields.length === 1) throw new CourtError("VALIDATION", fields[0][1], fields[0][0]);
    if (fields.length > 1) {
      return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: Object.fromEntries(fields.map(([f, m]) => [f, [m]])) };
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
    assertForm(formData);
    const ip = await clientIp();
    const input = loginSchema.parse(formObject(formData));
    next = safeNext(formData.get("next"));
    const user = await loginWithLimits(input.username, input.password, ip);
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
  // A crafted call without a form body gets the same answer as an unknown account, not a 500.
  if (!(formData instanceof FormData)) redirect("/login?demo=missing");
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
