import "server-only";
import { db } from "../db";
import { reserveAttempt, type LimitSpec } from "../rate-limit";
import { authenticate } from "./accounts";

const WINDOW = 900; // 15 minutes

/**
 * Password login with brute-force limits. Only *failed* logins count, so people sharing an
 * office or NAT IP don't lock each other out by signing in: strict per (account, IP), so one
 * attacker can't lock the owner out from elsewhere, plus a per-IP limit and a looser
 * per-account ceiling that slows distributed guessing.
 *
 * Every attempt is counted *before* the password is checked (and refunded if it succeeds), so
 * a burst of concurrent guesses gets no more checks than the limits allow.
 */
export async function loginWithLimits(username: string, password: string, ip: string | null) {
  // Most specific first: a burst against one account is stopped (and refunded) at its own
  // per-IP limit before it can briefly use up the shared per-IP allowance of other people
  // behind the same address.
  const accountMessage = "Too many failed attempts for that account. Try again within 15 minutes (the pause counts from the first failed attempt).";
  const limits: LimitSpec[] = [
    ...(ip ? [{ key: `login-user-ip:${username}:${ip}`, limit: 8, windowSeconds: WINDOW, message: accountMessage }] : []),
    { key: `login-user:${username}`, limit: 100, windowSeconds: WINDOW, message: accountMessage },
    ...(ip ? [{ key: `login:${ip}`, limit: 20, windowSeconds: WINDOW, message: "Too many failed attempts. The court is in recess for up to 15 minutes." }] : []),
  ];
  const refund = await reserveAttempt(limits);
  const user = await authenticate(username, password); // a failure keeps the attempt counted
  await refund();
  // A successful login also clears this account's earlier failures from this IP.
  if (ip) await db.rateLimit.deleteMany({ where: { key: `login-user-ip:${username}:${ip}` } });
  return user;
}
