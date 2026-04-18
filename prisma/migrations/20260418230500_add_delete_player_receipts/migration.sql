-- CreateTable
CREATE TABLE "DeletePlayerReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scopeVkId" INTEGER NOT NULL,
    "intentId" TEXT NOT NULL,
    "stateKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resultSnapshot" TEXT NOT NULL DEFAULT '{}',
    "expiresAt" DATETIME NOT NULL,
    "appliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "DeletePlayerReceipt_scopeVkId_status_idx" ON "DeletePlayerReceipt"("scopeVkId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DeletePlayerReceipt_scopeVkId_intentId_key" ON "DeletePlayerReceipt"("scopeVkId", "intentId");
