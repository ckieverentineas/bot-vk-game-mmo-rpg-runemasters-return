PRAGMA foreign_keys=OFF;

CREATE TABLE "new_PlayerProgress" (
  "playerId" INTEGER NOT NULL PRIMARY KEY,
  "locationLevel" INTEGER NOT NULL DEFAULT 0,
  "currentRuneIndex" INTEGER NOT NULL DEFAULT 0,
  "unlockedRuneSlotCount" INTEGER NOT NULL DEFAULT 2,
  "activeBattleId" TEXT,
  "tutorialState" TEXT NOT NULL DEFAULT 'ACTIVE',
  "victories" INTEGER NOT NULL DEFAULT 0,
  "victoryStreak" INTEGER NOT NULL DEFAULT 0,
  "defeats" INTEGER NOT NULL DEFAULT 0,
  "defeatStreak" INTEGER NOT NULL DEFAULT 0,
  "mobsKilled" INTEGER NOT NULL DEFAULT 0,
  "highestLocationLevel" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PlayerProgress_playerId_fkey"
    FOREIGN KEY ("playerId")
    REFERENCES "Player" ("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

INSERT INTO "new_PlayerProgress" (
  "playerId",
  "locationLevel",
  "currentRuneIndex",
  "unlockedRuneSlotCount",
  "activeBattleId",
  "tutorialState",
  "victories",
  "victoryStreak",
  "defeats",
  "defeatStreak",
  "mobsKilled",
  "highestLocationLevel",
  "updatedAt"
)
SELECT
  "playerId",
  "locationLevel",
  "currentRuneIndex",
  CASE
    WHEN "unlockedRuneSlotCount" < 2 THEN 2
    ELSE "unlockedRuneSlotCount"
  END,
  "activeBattleId",
  "tutorialState",
  "victories",
  "victoryStreak",
  "defeats",
  "defeatStreak",
  "mobsKilled",
  "highestLocationLevel",
  "updatedAt"
FROM "PlayerProgress";

DROP TABLE "PlayerProgress";
ALTER TABLE "new_PlayerProgress" RENAME TO "PlayerProgress";

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
