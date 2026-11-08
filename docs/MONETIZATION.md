# Monetization architecture (designed, payments not live)

**The golden rule: money buys looks, never justice.** No purchase may affect claims, votes, verdicts, XP, reputation, achievements or leaderboards.

## What exists today

| Piece | Where | Status |
| --- | --- | --- |
| Cosmetic catalog: profile themes and avatar items, each with an unlock rule (`free`, `level:N`, `achievement:KEY`, `premium`) | `src/lib/cosmetics.ts` | Live. Level- and achievement-locked items unlock through play |
| Entitlements table (`EARNED`, `GRANTED`, `PURCHASED`) | `prisma/schema.prisma` → `Entitlement` | Live. Admins can grant items from `/moderation` |
| Membership fields (`User.membershipTier`: `FREE`/`PATRON`, `membershipExpiresAt`) | schema | Live. Patrons unlock `premium` cosmetics |
| Server-side unlock checks on profile save | `src/server/services/accounts.ts#updateProfile` | Live. Locked items are rejected even if the client is tampered with |
| `PaymentProvider` interface + `DisabledPaymentProvider` + `fulfil()` | `src/server/payments/provider.ts` | Interface only. Checkout throws "not on sale yet" |
| Patron section in Settings | `/settings#patron` | Explains perks. **No buy buttons** |
| Fairness test | `tests/unit/fairness.test.ts` | Fails if gameplay services import payments or cosmetics |

## Turning on payments (e.g. Stripe)

1. Implement `PaymentProvider` (`createCheckout` → Stripe Checkout Session; `parseWebhook` → verify the signature with `STRIPE_WEBHOOK_SECRET`).
2. Return it from `getPaymentProvider()` when keys are present.
3. Add `src/app/api/payments/webhook/route.ts`. It parses the raw body, calls `provider.parseWebhook`, then `fulfil(order)`.
4. Add a "Become a Patron" server action that calls `createCheckout` and redirects. Only then add buy buttons in `/settings#patron`.

## Designed but not built

- **Private courtrooms for friend groups.** The plan:
  - Add a `Courtroom` model (`id`, `name`, `ownerId`, `inviteCode`, `visibility`).
  - Add a nullable `Case.courtroomId`.
  - Add a `CourtroomMember` join table.
  - Every query in `src/server/queries/*` would add `courtroomId: null` for public listings, plus a membership check for private ones.
  - Verdict and stats logic stays identical.
  - Creating private courtrooms could be a Patron perk; *playing* in one never requires payment.
- **Advanced statistics:**
  - Most of what would go here is already derivable from `XpEvent`, `Vote` and `Argument`: win rate by category, average writing time, jury agreement over time.
  - It would be a read-only `/u/[username]/stats` page.
  - It must stay viewing-only. Purchases may never change the numbers.
- **Special courtroom appearances:** additional `ProfileTheme` entries and avatar items use the same unlock rules, so new cosmetics are a catalog change, not a code change.
