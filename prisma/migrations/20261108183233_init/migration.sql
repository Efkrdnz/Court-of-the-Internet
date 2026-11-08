-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('FREE', 'PATRON');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('AWAITING_DEFENSE', 'DEFENSE_CLAIMED', 'AWAITING_PROSECUTION', 'PROSECUTION_CLAIMED', 'DELIBERATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('GUILTY', 'NOT_GUILTY', 'MISTRIAL', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ModerationState" AS ENUM ('VISIBLE', 'UNDER_REVIEW', 'REMOVED');

-- CreateEnum
CREATE TYPE "ArgumentRole" AS ENUM ('DEFENSE', 'PROSECUTION');

-- CreateEnum
CREATE TYPE "ClaimOutcome" AS ENUM ('ACTIVE', 'SUBMITTED', 'EXPIRED', 'RELEASED');

-- CreateEnum
CREATE TYPE "VoteChoice" AS ENUM ('GUILTY', 'NOT_GUILTY');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('HILARIOUS', 'OUTRAGEOUS', 'LEGENDARY', 'RELATABLE');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('PERSONAL_INFO', 'REAL_PERSON', 'HARASSMENT', 'HATE', 'VIOLENCE', 'SEXUAL', 'ILLEGAL', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CASE_CLAIMED', 'DEFENSE_FILED', 'PROSECUTION_FILED', 'VERDICT', 'CLAIM_EXPIRED', 'ACHIEVEMENT', 'LEVEL_UP', 'DELIBERATION_EXTENDED', 'MODERATION');

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('EARNED', 'GRANTED', 'PURCHASED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "bio" TEXT NOT NULL DEFAULT '',
    "avatar" JSONB NOT NULL,
    "profileTheme" TEXT NOT NULL DEFAULT 'mahogany',
    "featuredBadge" TEXT,
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "mutedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowFeaturing" BOOLEAN NOT NULL DEFAULT true,
    "membershipTier" "MembershipTier" NOT NULL DEFAULT 'FREE',
    "membershipExpiresAt" TIMESTAMP(3),
    "bannedAt" TIMESTAMP(3),
    "banReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "casesConfessed" INTEGER NOT NULL DEFAULT 0,
    "totalConfessions" INTEGER NOT NULL DEFAULT 0,
    "timesConvicted" INTEGER NOT NULL DEFAULT 0,
    "timesAcquitted" INTEGER NOT NULL DEFAULT 0,
    "defenseWins" INTEGER NOT NULL DEFAULT 0,
    "defenseLosses" INTEGER NOT NULL DEFAULT 0,
    "defenseMistrials" INTEGER NOT NULL DEFAULT 0,
    "prosecutionWins" INTEGER NOT NULL DEFAULT 0,
    "prosecutionLosses" INTEGER NOT NULL DEFAULT 0,
    "prosecutionMistrials" INTEGER NOT NULL DEFAULT 0,
    "currentDefenseStreak" INTEGER NOT NULL DEFAULT 0,
    "longestDefenseStreak" INTEGER NOT NULL DEFAULT 0,
    "currentProsecutionStreak" INTEGER NOT NULL DEFAULT 0,
    "longestProsecutionStreak" INTEGER NOT NULL DEFAULT 0,
    "juryVotes" INTEGER NOT NULL DEFAULT 0,
    "juryMajorityVotes" INTEGER NOT NULL DEFAULT 0,
    "defensesFiled" INTEGER NOT NULL DEFAULT 0,
    "prosecutionsFiled" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "confession" TEXT NOT NULL,
    "context" TEXT,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "aliasSeed" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'AWAITING_DEFENSE',
    "verdict" "Verdict",
    "moderationState" "ModerationState" NOT NULL DEFAULT 'VISIBLE',
    "removalReason" TEXT,
    "accusedId" TEXT NOT NULL,
    "attorneyId" TEXT,
    "prosecutorId" TEXT,
    "claimedById" TEXT,
    "claimExpiresAt" TIMESTAMP(3),
    "deliberationStartsAt" TIMESTAMP(3),
    "deliberationEndsAt" TIMESTAMP(3),
    "extensionsUsed" INTEGER NOT NULL DEFAULT 0,
    "guiltyVotes" INTEGER NOT NULL DEFAULT 0,
    "notGuiltyVotes" INTEGER NOT NULL DEFAULT 0,
    "hilariousCount" INTEGER NOT NULL DEFAULT 0,
    "outrageousCount" INTEGER NOT NULL DEFAULT 0,
    "legendaryCount" INTEGER NOT NULL DEFAULT 0,
    "relatableCount" INTEGER NOT NULL DEFAULT 0,
    "reactionScore" INTEGER NOT NULL DEFAULT 0,
    "controversy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "openReports" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "defenseFiledAt" TIMESTAMP(3),
    "prosecutionFiledAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Argument" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "role" "ArgumentRole" NOT NULL,
    "body" TEXT NOT NULL,
    "stricken" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "writingSeconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Argument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseClaim" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ArgumentRole" NOT NULL,
    "outcome" "ClaimOutcome" NOT NULL DEFAULT 'ACTIVE',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "CaseClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "choice" "VoteChoice" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "caseId" TEXT,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "caseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "toastedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "target" TEXT NOT NULL DEFAULT 'CASE',
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "caseId" TEXT,
    "targetUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedCase" (
    "day" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "pinnedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeaturedCase_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "source" "EntitlementSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "UserStats_xp_idx" ON "UserStats"("xp");

-- CreateIndex
CREATE INDEX "UserStats_reputation_idx" ON "UserStats"("reputation");

-- CreateIndex
CREATE UNIQUE INDEX "Case_number_key" ON "Case"("number");

-- CreateIndex
CREATE INDEX "Case_status_moderationState_createdAt_idx" ON "Case"("status", "moderationState", "createdAt");

-- CreateIndex
CREATE INDEX "Case_status_closedAt_idx" ON "Case"("status", "closedAt");

-- CreateIndex
CREATE INDEX "Case_accusedId_idx" ON "Case"("accusedId");

-- CreateIndex
CREATE INDEX "Case_attorneyId_idx" ON "Case"("attorneyId");

-- CreateIndex
CREATE INDEX "Case_prosecutorId_idx" ON "Case"("prosecutorId");

-- CreateIndex
CREATE INDEX "Case_category_idx" ON "Case"("category");

-- CreateIndex
CREATE INDEX "Case_claimedById_idx" ON "Case"("claimedById");

-- CreateIndex
CREATE INDEX "Argument_authorId_idx" ON "Argument"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Argument_caseId_role_key" ON "Argument"("caseId", "role");

-- CreateIndex
CREATE INDEX "CaseClaim_userId_outcome_idx" ON "CaseClaim"("userId", "outcome");

-- CreateIndex
CREATE INDEX "CaseClaim_caseId_idx" ON "CaseClaim"("caseId");

-- CreateIndex
CREATE INDEX "CaseClaim_outcome_expiresAt_idx" ON "CaseClaim"("outcome", "expiresAt");

-- CreateIndex
CREATE INDEX "Vote_userId_idx" ON "Vote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_caseId_userId_key" ON "Vote"("caseId", "userId");

-- CreateIndex
CREATE INDEX "Reaction_userId_idx" ON "Reaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_caseId_userId_type_key" ON "Reaction"("caseId", "userId", "type");

-- CreateIndex
CREATE INDEX "UserAchievement_key_idx" ON "UserAchievement"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_key_key" ON "UserAchievement"("userId", "key");

-- CreateIndex
CREATE INDEX "XpEvent_userId_createdAt_idx" ON "XpEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Report_caseId_reporterId_target_key" ON "Report"("caseId", "reporterId", "target");

-- CreateIndex
CREATE INDEX "ModerationAction_createdAt_idx" ON "ModerationAction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_userId_itemKey_key" ON "Entitlement"("userId", "itemKey");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_accusedId_fkey" FOREIGN KEY ("accusedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_prosecutorId_fkey" FOREIGN KEY ("prosecutorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Argument" ADD CONSTRAINT "Argument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Argument" ADD CONSTRAINT "Argument_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseClaim" ADD CONSTRAINT "CaseClaim_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseClaim" ADD CONSTRAINT "CaseClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedCase" ADD CONSTRAINT "FeaturedCase_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
