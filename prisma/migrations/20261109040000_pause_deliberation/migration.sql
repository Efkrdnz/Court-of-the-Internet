-- Deliberation clock pauses while a case is sealed or under review.
ALTER TABLE "Case" ADD COLUMN "deliberationPausedAt" TIMESTAMP(3);
