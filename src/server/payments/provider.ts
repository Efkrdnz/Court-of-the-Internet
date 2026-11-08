import "server-only";
import { db } from "../db";
import { CourtError } from "../errors";

/**
 * Payment abstraction. Payments only ever create cosmetic Entitlements or set a
 * Patron membership: they must never touch votes, claims, verdicts, XP or rankings.
 * (Enforced by tests/unit/fairness.test.ts, which checks the gameplay services never
 * import this module or the cosmetics catalog.)
 */
export interface CheckoutRequest {
  userId: string;
  product: { kind: "membership"; tier: "PATRON"; months: number } | { kind: "cosmetic"; itemKey: string };
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly enabled: boolean;
  /** Returns a hosted-checkout URL. */
  createCheckout(req: CheckoutRequest): Promise<{ url: string }>;
  /** Verifies a provider webhook and returns the fulfilment it describes, if any. */
  parseWebhook(rawBody: string, signature: string | null): Promise<CheckoutRequest["product"] & { userId: string } | null>;
}

/** Default provider: payments are not live yet, so nothing can be purchased. */
export class DisabledPaymentProvider implements PaymentProvider {
  readonly name = "disabled";
  readonly enabled = false;
  async createCheckout(): Promise<{ url: string }> {
    throw new CourtError("FORBIDDEN", "Patron memberships aren't on sale yet.");
  }
  async parseWebhook() {
    return null;
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new DisabledPaymentProvider();
}

/** Fulfilment used by a future webhook route: cosmetic or membership only. */
export async function fulfil(order: CheckoutRequest["product"] & { userId: string }) {
  if (order.kind === "cosmetic") {
    await db.entitlement.upsert({
      where: { userId_itemKey: { userId: order.userId, itemKey: order.itemKey } },
      create: { userId: order.userId, itemKey: order.itemKey, source: "PURCHASED" },
      update: {},
    });
    return;
  }
  const user = await db.user.findUniqueOrThrow({ where: { id: order.userId }, select: { membershipExpiresAt: true } });
  const base = user.membershipExpiresAt && user.membershipExpiresAt > new Date() ? user.membershipExpiresAt : new Date();
  const expires = new Date(base);
  expires.setMonth(expires.getMonth() + order.months);
  await db.user.update({ where: { id: order.userId }, data: { membershipTier: "PATRON", membershipExpiresAt: expires } });
}
