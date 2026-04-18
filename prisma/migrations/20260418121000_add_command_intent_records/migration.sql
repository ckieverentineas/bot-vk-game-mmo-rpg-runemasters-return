-- CreateTable
CREATE TABLE "CommandIntentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" INTEGER NOT NULL,
    "intentId" TEXT NOT NULL,
    "commandKey" TEXT NOT NULL,
    "stateKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resultSnapshot" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommandIntentRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CommandIntentRecord_playerId_intentId_key" ON "CommandIntentRecord"("playerId", "intentId");

-- CreateIndex
CREATE INDEX "CommandIntentRecord_playerId_commandKey_idx" ON "CommandIntentRecord"("playerId", "commandKey");
