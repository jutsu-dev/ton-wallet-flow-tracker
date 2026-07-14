-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "LabelType" AS ENUM ('OWN', 'SAFE', 'UNKNOWN', 'SUSPICIOUS', 'SERVICE', 'EXCHANGE', 'MARKETPLACE', 'OTHER');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "canonicalAddress" TEXT NOT NULL,
    "bounceableAddress" TEXT NOT NULL,
    "nonBounceableAddress" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_labels" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "labelType" "LabelType" NOT NULL DEFAULT 'UNKNOWN',
    "title" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_checks" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "requestedLimit" INTEGER NOT NULL,
    "requestedDepth" INTEGER NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'PENDING',
    "dataSource" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_events" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "externalEventId" TEXT,
    "traceId" TEXT,
    "transactionHash" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "actionType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "senderAddress" TEXT,
    "recipientAddress" TEXT,
    "amountRaw" TEXT,
    "amountFormatted" TEXT,
    "assetType" TEXT NOT NULL,
    "assetSymbol" TEXT,
    "assetContractAddress" TEXT,
    "nftAddress" TEXT,
    "nftName" TEXT,
    "collectionName" TEXT,
    "comment" TEXT,
    "memo" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL,
    "normalizedPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_canonicalAddress_key" ON "wallets"("canonicalAddress");

-- CreateIndex
CREATE INDEX "wallet_labels_walletId_idx" ON "wallet_labels"("walletId");

-- CreateIndex
CREATE INDEX "wallet_labels_createdByUserId_idx" ON "wallet_labels"("createdByUserId");

-- CreateIndex
CREATE INDEX "wallet_checks_walletId_idx" ON "wallet_checks"("walletId");

-- CreateIndex
CREATE INDEX "wallet_checks_requestedByUserId_idx" ON "wallet_checks"("requestedByUserId");

-- CreateIndex
CREATE INDEX "wallet_events_walletId_idx" ON "wallet_events"("walletId");

-- CreateIndex
CREATE INDEX "wallet_events_walletId_externalEventId_idx" ON "wallet_events"("walletId", "externalEventId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_labels" ADD CONSTRAINT "wallet_labels_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_labels" ADD CONSTRAINT "wallet_labels_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_checks" ADD CONSTRAINT "wallet_checks_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_checks" ADD CONSTRAINT "wallet_checks_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_events" ADD CONSTRAINT "wallet_events_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
