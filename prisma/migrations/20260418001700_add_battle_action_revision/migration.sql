-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BattleSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "battleType" TEXT NOT NULL DEFAULT 'PVE',
    "actionRevision" INTEGER NOT NULL DEFAULT 0,
    "playerLoadoutSnapshot" TEXT,
    "locationLevel" INTEGER NOT NULL,
    "biomeCode" TEXT NOT NULL,
    "enemyCode" TEXT NOT NULL,
    "enemyName" TEXT NOT NULL,
    "rewardTableCode" TEXT,
    "turnOwner" TEXT NOT NULL,
    "playerSnapshot" TEXT NOT NULL,
    "enemySnapshot" TEXT NOT NULL,
    "log" TEXT NOT NULL DEFAULT '[]',
    "result" TEXT,
    "rewardsSnapshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BattleSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BattleSession" ("battleType", "biomeCode", "createdAt", "enemyCode", "enemyName", "enemySnapshot", "id", "locationLevel", "log", "playerId", "playerLoadoutSnapshot", "playerSnapshot", "result", "rewardTableCode", "rewardsSnapshot", "status", "turnOwner", "updatedAt") SELECT "battleType", "biomeCode", "createdAt", "enemyCode", "enemyName", "enemySnapshot", "id", "locationLevel", "log", "playerId", "playerLoadoutSnapshot", "playerSnapshot", "result", "rewardTableCode", "rewardsSnapshot", "status", "turnOwner", "updatedAt" FROM "BattleSession";
DROP TABLE "BattleSession";
ALTER TABLE "new_BattleSession" RENAME TO "BattleSession";
CREATE INDEX "BattleSession_playerId_status_idx" ON "BattleSession"("playerId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
