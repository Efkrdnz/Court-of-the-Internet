-- Claims ended by the court (a seal, a ban, a deleted account) are told apart from claims the
-- holder released, so they don't count toward the per-case claim limit.
ALTER TYPE "ClaimOutcome" ADD VALUE 'VOIDED';
