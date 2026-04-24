-- CreateTable
CREATE TABLE "RoamingThreat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enemyCode" TEXT NOT NULL,
    "enemyName" TEXT NOT NULL,
    "originBiomeCode" TEXT NOT NULL,
    "originBiomeName" TEXT NOT NULL,
    "currentBiomeCode" TEXT NOT NULL,
    "firstSeenBattleId" TEXT NOT NULL,
    "lastSeenBattleId" TEXT NOT NULL,
    "lastSeenLocationLevel" INTEGER NOT NULL,
    "lastSurvivalResult" TEXT NOT NULL,
    "survivalCount" INTEGER NOT NULL DEFAULT 0,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "levelBonus" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RoamingThreat_enemyCode_originBiomeCode_currentBiomeCode_key" ON "RoamingThreat"("enemyCode", "originBiomeCode", "currentBiomeCode");

-- CreateIndex
CREATE INDEX "RoamingThreat_status_levelBonus_idx" ON "RoamingThreat"("status", "levelBonus");

-- CreateIndex
CREATE INDEX "RoamingThreat_originBiomeCode_status_idx" ON "RoamingThreat"("originBiomeCode", "status");
