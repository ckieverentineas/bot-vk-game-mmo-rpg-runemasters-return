-- CreateTable
CREATE TABLE "RewardLedgerRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" INTEGER NOT NULL,
    "ledgerKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "entrySnapshot" TEXT NOT NULL,
    "appliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RewardLedgerRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RewardLedgerRecord_ledgerKey_key" ON "RewardLedgerRecord"("ledgerKey");

-- CreateIndex
CREATE INDEX "RewardLedgerRecord_playerId_sourceType_sourceId_idx" ON "RewardLedgerRecord"("playerId", "sourceType", "sourceId");
