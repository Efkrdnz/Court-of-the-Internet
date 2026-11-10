-- Recusal and stale-console checks look moderation actions up by case (and officer).
CREATE INDEX "ModerationAction_caseId_moderatorId_idx" ON "ModerationAction"("caseId", "moderatorId");
