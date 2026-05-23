-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "control";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "general";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "system";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "users";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "users_log";

-- CreateEnum
CREATE TYPE "users"."Role" AS ENUM ('superadmin', 'admin', 'moderator', 'tester', 'advertiser', 'sponsor', 'user');

-- CreateEnum
CREATE TYPE "users"."ClaimStatus" AS ENUM ('pending', 'completed', 'flagged', 'rejected');

-- CreateEnum
CREATE TYPE "users"."PayoutStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "users"."TransactionType" AS ENUM ('mine', 'claim', 'referral_reward', 'bonus', 'daily_bonus', 'monthly_bonus', 'cashback', 'withdrawal', 'adjustment');

-- CreateEnum
CREATE TYPE "users"."MiningStatus" AS ENUM ('active', 'completed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "users"."ShortlinkStatus" AS ENUM ('pending', 'completed', 'expired', 'flagged');

-- CreateEnum
CREATE TYPE "users"."SubscriptionStatus" AS ENUM ('active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "control"."ControlRole" AS ENUM ('superadmin', 'admin', 'moderator', 'tester');

-- CreateEnum
CREATE TYPE "users"."BonusStatus" AS ENUM ('pending', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "general"."EarlyAccessStatus" AS ENUM ('disallowed', 'allowed', 'used');

-- CreateTable
CREATE TABLE "users_log"."AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT,
    "teamMemberId" BIGINT,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "targetType" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."DailyBonus" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "status" "users"."BonusStatus" NOT NULL DEFAULT 'pending',
    "slToken" TEXT,
    "nextClaim" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyBonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."MonthlyBonus" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "status" "users"."BonusStatus" NOT NULL DEFAULT 'pending',
    "slToken" TEXT,
    "nextClaim" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyBonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."Cashback" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "status" "users"."BonusStatus" NOT NULL DEFAULT 'pending',
    "slToken" TEXT,
    "nextClaim" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cashback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."BoostPurchased" (
    "sessionId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "title" TEXT,
    "bonusPercent" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "price" DECIMAL(18,8),
    "coinsBefore" DECIMAL(18,8),
    "coinsAfter" DECIMAL(18,8),
    "usable" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoostPurchased_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "users"."History" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "source" TEXT,
    "sourceId" TEXT,
    "timestamp" TIMESTAMP(3),
    "coinName" TEXT,
    "amount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "status" TEXT,
    "expiryTime" TIMESTAMP(3),
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."TeamMember" (
    "id" BIGSERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "role" "control"."ControlRole" NOT NULL DEFAULT 'admin',
    "password" TEXT,
    "adminPin" TEXT,
    "ip" INET,
    "profileImg" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."ControlLoginHistory" (
    "id" BIGSERIAL NOT NULL,
    "teamMemberId" BIGINT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "loginSession" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "loginStatus" TEXT NOT NULL DEFAULT 'failed',
    "ip" INET,
    "failureReason" TEXT,
    "expiryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlLoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general"."WithdrawPool" (
    "id" BIGSERIAL NOT NULL,
    "coinName" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '',
    "minWithdraw" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "poolBalance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "poolCapacity" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WithdrawPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."WithdrawRequest" (
    "requestNo" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "coinName" TEXT NOT NULL,
    "coinAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "type" TEXT,
    "walletAddress" TEXT NOT NULL,
    "feePercentage" DECIMAL(9,6) NOT NULL DEFAULT 0,
    "feeAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "estimatedAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "status" "users"."PayoutStatus" NOT NULL DEFAULT 'pending',
    "txid" TEXT,
    "processedById" BIGINT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawRequest_pkey" PRIMARY KEY ("requestNo")
);

-- CreateTable
CREATE TABLE "general"."PowerBoost" (
    "id" BIGSERIAL NOT NULL,
    "tierName" TEXT NOT NULL,
    "bonusPercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "durationHours" INTEGER NOT NULL DEFAULT 0,
    "rate" DECIMAL(18,8),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PowerBoost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general"."Banner" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "imgUrl" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "deviceType" TEXT,
    "position" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "controlId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general"."LatestUpdate" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "publishedDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "controlId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LatestUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general"."Video" (
    "id" BIGSERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general"."Link" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general"."ReferralLevel" (
    "id" BIGSERIAL NOT NULL,
    "levelName" TEXT NOT NULL,
    "progressPercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "description" TEXT,
    "iconName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ReferralLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general"."EarlyAccess" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "status" "general"."EarlyAccessStatus" NOT NULL DEFAULT 'disallowed',
    "inviteCode" TEXT,
    "inviteCodeExpiresAt" TIMESTAMP(3),
    "allowedAt" TIMESTAMP(3),
    "allowedById" BIGINT,
    "disallowedAt" TIMESTAMP(3),
    "disallowedById" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EarlyAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."ActiveMining" (
    "miningSessionId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "coinName" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "stopTime" TIMESTAMP(3),
    "expiryTime" TIMESTAMP(3),
    "durationLeft" INTEGER,
    "amountMined" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "socialTaskId" TEXT,
    "powerBoostId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveMining_pkey" PRIMARY KEY ("miningSessionId")
);

-- CreateTable
CREATE TABLE "users"."MiningHistory" (
    "id" BIGSERIAL NOT NULL,
    "miningSessionId" TEXT,
    "userId" BIGINT NOT NULL,
    "coinName" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "stopTime" TIMESTAMP(3),
    "expiryTime" TIMESTAMP(3),
    "amountMined" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "bonusAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "bonusPercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "status" "users"."MiningStatus" NOT NULL DEFAULT 'active',
    "claimableExpiryTime" TIMESTAMP(3),
    "slToken" TEXT,
    "balanceBefore" DECIMAL(18,8),
    "balanceAfter" DECIMAL(18,8),
    "socialTaskId" TEXT,
    "powerBoostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiningHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."ReferralUserData" (
    "id" BIGSERIAL NOT NULL,
    "referrerId" BIGINT NOT NULL,
    "referredId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralUserData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."ReferralLevelHistory" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "level" INTEGER NOT NULL,
    "referredPercentage" DECIMAL(7,4),
    "referralReward" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "status" "users"."BonusStatus" NOT NULL DEFAULT 'pending',
    "slToken" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralLevelHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."ReferralRewardHistory" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "level" INTEGER,
    "referredPercentage" DECIMAL(7,4),
    "referralRoot" TEXT,
    "miningSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralRewardHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."Shortlink" (
    "slSessionId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "source" TEXT,
    "sourceId" TEXT,
    "amount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "claimToken" TEXT,
    "slUrl" TEXT,
    "generatedAt" TIMESTAMP(3),
    "status" "users"."ShortlinkStatus" NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shortlink_pkey" PRIMARY KEY ("slSessionId")
);

-- CreateTable
CREATE TABLE "users"."Turnstile" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),

    CONSTRAINT "Turnstile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."SocialTask" (
    "sessionId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "url" TEXT,
    "duration" INTEGER,
    "usable" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "bonus" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialTask_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "general"."Subscription" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(18,8),
    "annualPrice" DECIMAL(18,8),
    "description" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general"."SubscriptionFeature" (
    "id" BIGSERIAL NOT NULL,
    "subscriptionSlug" TEXT NOT NULL,
    "featureText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SubscriptionFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."SubscriptionPurchased" (
    "sessionId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "subscriptionName" TEXT,
    "depositId" TEXT,
    "address" TEXT,
    "coinName" TEXT,
    "type" TEXT,
    "network" TEXT,
    "rate" DECIMAL(18,8),
    "cryptoValue" DECIMAL(18,8),
    "usdAmount" DECIMAL(18,8),
    "createdDate" TIMESTAMP(3),
    "expectedDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "expireAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txid" TEXT,
    "verifiedTxid" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SubscriptionPurchased_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "users"."ActiveSubscription" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "subscriptionName" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "users"."SubscriptionStatus" NOT NULL DEFAULT 'active',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expireAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ActiveSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."MiningConfig" (
    "id" BIGSERIAL NOT NULL,
    "subscriptionName" TEXT NOT NULL,
    "miningDurationSec" INTEGER NOT NULL,
    "miningAmountSec" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MiningConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."WithdrawRequirement" (
    "id" BIGSERIAL NOT NULL,
    "subscriptionName" TEXT NOT NULL,
    "minimumWithdrawAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "withdrawalFeePercentage" DECIMAL(9,6) NOT NULL DEFAULT 0,
    "processingTime" TEXT,
    "withdrawalLimitations" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WithdrawRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."ReferralRewardConfig" (
    "id" BIGSERIAL NOT NULL,
    "subscriptionName" TEXT NOT NULL,
    "level1" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "level2" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "level3" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ReferralRewardConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."DailyBonusConfig" (
    "id" BIGSERIAL NOT NULL,
    "subscriptionName" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DailyBonusConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."MonthlyBonusConfig" (
    "id" BIGSERIAL NOT NULL,
    "subscriptionName" TEXT NOT NULL,
    "minAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "maxAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MonthlyBonusConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."CashbackConfig" (
    "id" BIGSERIAL NOT NULL,
    "subscriptionName" TEXT NOT NULL,
    "minAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "maxAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CashbackConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."Deposit" (
    "id" BIGSERIAL NOT NULL,
    "coinName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "depositId" TEXT,
    "address" TEXT,
    "network" TEXT,
    "minAmount" DECIMAL(18,8),
    "maxAmount" DECIMAL(18,8),
    "rate" DECIMAL(18,8),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."User" (
    "id" BIGSERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" "users"."Role" NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "referralCode" TEXT,
    "createdIp" INET,
    "createdCountry" TEXT,
    "browser" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "lastUsernameChangeAt" TIMESTAMP(3),
    "lastEmailChangeAt" TIMESTAMP(3),
    "lastPasswordChangeAt" TIMESTAMP(3),
    "recoveryToken" TEXT,
    "recoveryTokenVersion" INTEGER NOT NULL DEFAULT 0,
    "recoveryTokenCreatedAt" TIMESTAMP(3),
    "recoveryTokenUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."LoginHistory" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT,
    "identifier" TEXT NOT NULL DEFAULT 'test',
    "success" BOOLEAN NOT NULL DEFAULT false,
    "failureReason" TEXT,
    "loginIp" INET,
    "loginCountry" TEXT,
    "browser" TEXT,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."Wallet" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "balance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "pendingWithdrawal" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "totalMined" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "totalClaimed" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."TransactionLog" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "walletId" BIGINT NOT NULL,
    "type" "users"."TransactionType" NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "balanceBefore" DECIMAL(18,8) NOT NULL,
    "balanceAfter" DECIMAL(18,8) NOT NULL,
    "sourceId" TEXT,
    "sourceType" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "users_log"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_teamMemberId_idx" ON "users_log"."AuditLog"("teamMemberId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "users_log"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "users_log"."AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "DailyBonus_userId_idx" ON "users"."DailyBonus"("userId");

-- CreateIndex
CREATE INDEX "MonthlyBonus_userId_idx" ON "users"."MonthlyBonus"("userId");

-- CreateIndex
CREATE INDEX "Cashback_userId_idx" ON "users"."Cashback"("userId");

-- CreateIndex
CREATE INDEX "BoostPurchased_userId_idx" ON "users"."BoostPurchased"("userId");

-- CreateIndex
CREATE INDEX "History_userId_idx" ON "users"."History"("userId");

-- CreateIndex
CREATE INDEX "History_source_sourceId_idx" ON "users"."History"("source", "sourceId");

-- CreateIndex
CREATE INDEX "History_coinName_idx" ON "users"."History"("coinName");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_username_key" ON "control"."TeamMember"("username");

-- CreateIndex
CREATE INDEX "TeamMember_username_idx" ON "control"."TeamMember"("username");

-- CreateIndex
CREATE INDEX "ControlLoginHistory_teamMemberId_idx" ON "control"."ControlLoginHistory"("teamMemberId");

-- CreateIndex
CREATE INDEX "ControlLoginHistory_sessionId_idx" ON "control"."ControlLoginHistory"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawPool_symbol_key" ON "general"."WithdrawPool"("symbol");

-- CreateIndex
CREATE INDEX "WithdrawRequest_userId_idx" ON "users"."WithdrawRequest"("userId");

-- CreateIndex
CREATE INDEX "WithdrawRequest_coinName_idx" ON "users"."WithdrawRequest"("coinName");

-- CreateIndex
CREATE INDEX "Banner_active_idx" ON "general"."Banner"("active");

-- CreateIndex
CREATE INDEX "Banner_position_idx" ON "general"."Banner"("position");

-- CreateIndex
CREATE UNIQUE INDEX "Video_url_key" ON "general"."Video"("url");

-- CreateIndex
CREATE INDEX "Link_title_idx" ON "general"."Link"("title");

-- CreateIndex
CREATE UNIQUE INDEX "EarlyAccess_email_key" ON "general"."EarlyAccess"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EarlyAccess_inviteCode_key" ON "general"."EarlyAccess"("inviteCode");

-- CreateIndex
CREATE INDEX "EarlyAccess_inviteCode_idx" ON "general"."EarlyAccess"("inviteCode");

-- CreateIndex
CREATE INDEX "EarlyAccess_email_idx" ON "general"."EarlyAccess"("email");

-- CreateIndex
CREATE INDEX "ActiveMining_userId_idx" ON "users"."ActiveMining"("userId");

-- CreateIndex
CREATE INDEX "ActiveMining_coinName_idx" ON "users"."ActiveMining"("coinName");

-- CreateIndex
CREATE INDEX "MiningHistory_userId_idx" ON "users"."MiningHistory"("userId");

-- CreateIndex
CREATE INDEX "MiningHistory_miningSessionId_idx" ON "users"."MiningHistory"("miningSessionId");

-- CreateIndex
CREATE INDEX "MiningHistory_coinName_idx" ON "users"."MiningHistory"("coinName");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralUserData_referredId_key" ON "users"."ReferralUserData"("referredId");

-- CreateIndex
CREATE INDEX "ReferralUserData_referrerId_idx" ON "users"."ReferralUserData"("referrerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralUserData_referrerId_referredId_key" ON "users"."ReferralUserData"("referrerId", "referredId");

-- CreateIndex
CREATE INDEX "ReferralLevelHistory_userId_idx" ON "users"."ReferralLevelHistory"("userId");

-- CreateIndex
CREATE INDEX "ReferralLevelHistory_userId_level_idx" ON "users"."ReferralLevelHistory"("userId", "level");

-- CreateIndex
CREATE INDEX "ReferralRewardHistory_userId_idx" ON "users"."ReferralRewardHistory"("userId");

-- CreateIndex
CREATE INDEX "ReferralRewardHistory_miningSessionId_idx" ON "users"."ReferralRewardHistory"("miningSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralRewardHistory_miningSessionId_level_userId_key" ON "users"."ReferralRewardHistory"("miningSessionId", "level", "userId");

-- CreateIndex
CREATE INDEX "Shortlink_userId_idx" ON "users"."Shortlink"("userId");

-- CreateIndex
CREATE INDEX "Shortlink_source_sourceId_idx" ON "users"."Shortlink"("source", "sourceId");

-- CreateIndex
CREATE INDEX "Turnstile_userId_idx" ON "users"."Turnstile"("userId");

-- CreateIndex
CREATE INDEX "Turnstile_token_idx" ON "users"."Turnstile"("token");

-- CreateIndex
CREATE INDEX "SocialTask_userId_idx" ON "users"."SocialTask"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_slug_key" ON "general"."Subscription"("slug");

-- CreateIndex
CREATE INDEX "SubscriptionFeature_subscriptionSlug_idx" ON "general"."SubscriptionFeature"("subscriptionSlug");

-- CreateIndex
CREATE INDEX "SubscriptionPurchased_userId_idx" ON "users"."SubscriptionPurchased"("userId");

-- CreateIndex
CREATE INDEX "SubscriptionPurchased_depositId_idx" ON "users"."SubscriptionPurchased"("depositId");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveSubscription_sourceId_key" ON "users"."ActiveSubscription"("sourceId");

-- CreateIndex
CREATE INDEX "ActiveSubscription_userId_idx" ON "users"."ActiveSubscription"("userId");

-- CreateIndex
CREATE INDEX "MiningConfig_subscriptionName_idx" ON "system"."MiningConfig"("subscriptionName");

-- CreateIndex
CREATE INDEX "WithdrawRequirement_subscriptionName_idx" ON "system"."WithdrawRequirement"("subscriptionName");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralRewardConfig_subscriptionName_key" ON "system"."ReferralRewardConfig"("subscriptionName");

-- CreateIndex
CREATE INDEX "DailyBonusConfig_subscriptionName_idx" ON "system"."DailyBonusConfig"("subscriptionName");

-- CreateIndex
CREATE INDEX "MonthlyBonusConfig_subscriptionName_idx" ON "system"."MonthlyBonusConfig"("subscriptionName");

-- CreateIndex
CREATE INDEX "CashbackConfig_subscriptionName_idx" ON "system"."CashbackConfig"("subscriptionName");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_depositId_key" ON "system"."Deposit"("depositId");

-- CreateIndex
CREATE INDEX "Deposit_coinName_type_idx" ON "system"."Deposit"("coinName", "type");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "users"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "users"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "users"."User"("referralCode");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "users"."User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "users"."User"("email");

-- CreateIndex
CREATE INDEX "User_referralCode_idx" ON "users"."User"("referralCode");

-- CreateIndex
CREATE INDEX "LoginHistory_userId_idx" ON "users"."LoginHistory"("userId");

-- CreateIndex
CREATE INDEX "LoginHistory_identifier_idx" ON "users"."LoginHistory"("identifier");

-- CreateIndex
CREATE INDEX "LoginHistory_loginIp_idx" ON "users"."LoginHistory"("loginIp");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "users"."Wallet"("userId");

-- CreateIndex
CREATE INDEX "TransactionLog_userId_idx" ON "users"."TransactionLog"("userId");

-- CreateIndex
CREATE INDEX "TransactionLog_walletId_idx" ON "users"."TransactionLog"("walletId");

-- CreateIndex
CREATE INDEX "TransactionLog_sourceId_sourceType_idx" ON "users"."TransactionLog"("sourceId", "sourceType");

-- AddForeignKey
ALTER TABLE "users"."DailyBonus" ADD CONSTRAINT "DailyBonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."MonthlyBonus" ADD CONSTRAINT "MonthlyBonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."Cashback" ADD CONSTRAINT "Cashback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."BoostPurchased" ADD CONSTRAINT "BoostPurchased_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."History" ADD CONSTRAINT "History_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."ControlLoginHistory" ADD CONSTRAINT "ControlLoginHistory_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "control"."TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."WithdrawRequest" ADD CONSTRAINT "WithdrawRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."ActiveMining" ADD CONSTRAINT "ActiveMining_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."MiningHistory" ADD CONSTRAINT "MiningHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."ReferralUserData" ADD CONSTRAINT "ReferralUserData_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."ReferralUserData" ADD CONSTRAINT "ReferralUserData_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."Shortlink" ADD CONSTRAINT "Shortlink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general"."SubscriptionFeature" ADD CONSTRAINT "SubscriptionFeature_subscriptionSlug_fkey" FOREIGN KEY ("subscriptionSlug") REFERENCES "general"."Subscription"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."ActiveSubscription" ADD CONSTRAINT "ActiveSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."TransactionLog" ADD CONSTRAINT "TransactionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."TransactionLog" ADD CONSTRAINT "TransactionLog_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "users"."Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
