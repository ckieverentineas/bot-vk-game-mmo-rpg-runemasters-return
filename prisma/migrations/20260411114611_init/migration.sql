-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vkId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "baseHealth" INTEGER NOT NULL DEFAULT 4,
    "baseAttack" INTEGER NOT NULL DEFAULT 2,
    "baseDefence" INTEGER NOT NULL DEFAULT 3,
    "baseMagicDefence" INTEGER NOT NULL DEFAULT 0,
    "baseDexterity" INTEGER NOT NULL DEFAULT 2,
    "baseIntelligence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerStatAllocation" (
    "playerId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "health" INTEGER NOT NULL DEFAULT 0,
    "attack" INTEGER NOT NULL DEFAULT 0,
    "defence" INTEGER NOT NULL DEFAULT 0,
    "magicDefence" INTEGER NOT NULL DEFAULT 0,
    "dexterity" INTEGER NOT NULL DEFAULT 0,
    "intelligence" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PlayerStatAllocation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerProgress" (
    "playerId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unspentStatPoints" INTEGER NOT NULL DEFAULT 1,
    "locationLevel" INTEGER NOT NULL DEFAULT 1,
    "currentRuneIndex" INTEGER NOT NULL DEFAULT 0,
    "activeBattleId" TEXT,
    "victories" INTEGER NOT NULL DEFAULT 0,
    "defeats" INTEGER NOT NULL DEFAULT 0,
    "mobsKilled" INTEGER NOT NULL DEFAULT 0,
    "highestLocationLevel" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerInventory" (
    "playerId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usualShards" INTEGER NOT NULL DEFAULT 0,
    "unusualShards" INTEGER NOT NULL DEFAULT 0,
    "rareShards" INTEGER NOT NULL DEFAULT 0,
    "epicShards" INTEGER NOT NULL DEFAULT 0,
    "legendaryShards" INTEGER NOT NULL DEFAULT 0,
    "mythicalShards" INTEGER NOT NULL DEFAULT 0,
    "leather" INTEGER NOT NULL DEFAULT 0,
    "bone" INTEGER NOT NULL DEFAULT 0,
    "herb" INTEGER NOT NULL DEFAULT 0,
    "essence" INTEGER NOT NULL DEFAULT 0,
    "metal" INTEGER NOT NULL DEFAULT 0,
    "crystal" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerInventory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rune" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" INTEGER NOT NULL,
    "runeCode" TEXT,
    "archetypeCode" TEXT,
    "passiveAbilityCodes" TEXT NOT NULL DEFAULT '[]',
    "activeAbilityCodes" TEXT NOT NULL DEFAULT '[]',
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "health" INTEGER NOT NULL DEFAULT 0,
    "attack" INTEGER NOT NULL DEFAULT 0,
    "defence" INTEGER NOT NULL DEFAULT 0,
    "magicDefence" INTEGER NOT NULL DEFAULT 0,
    "dexterity" INTEGER NOT NULL DEFAULT 0,
    "intelligence" INTEGER NOT NULL DEFAULT 0,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rune_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BattleSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "battleType" TEXT NOT NULL DEFAULT 'PVE',
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

-- CreateTable
CREATE TABLE "Biome" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "minLevel" INTEGER NOT NULL,
    "maxLevel" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "MobTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "biomeId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "rewardTableCode" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "isElite" BOOLEAN NOT NULL DEFAULT false,
    "isBoss" BOOLEAN NOT NULL DEFAULT false,
    "baseHealth" INTEGER NOT NULL,
    "baseAttack" INTEGER NOT NULL,
    "baseDefence" INTEGER NOT NULL,
    "baseMagicDefence" INTEGER NOT NULL,
    "baseDexterity" INTEGER NOT NULL,
    "baseIntelligence" INTEGER NOT NULL,
    "healthScale" REAL NOT NULL DEFAULT 1.15,
    "attackScale" REAL NOT NULL DEFAULT 1.10,
    "defenceScale" REAL NOT NULL DEFAULT 1.10,
    "magicDefenceScale" REAL NOT NULL DEFAULT 1.08,
    "dexterityScale" REAL NOT NULL DEFAULT 1.08,
    "intelligenceScale" REAL NOT NULL DEFAULT 1.08,
    "baseExperience" INTEGER NOT NULL,
    "baseGold" INTEGER NOT NULL,
    "runeDropChance" INTEGER NOT NULL DEFAULT 30,
    "lootTable" TEXT NOT NULL DEFAULT '{}',
    "attackText" TEXT NOT NULL DEFAULT 'атакует',
    CONSTRAINT "MobTemplate_biomeId_fkey" FOREIGN KEY ("biomeId") REFERENCES "Biome" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_vkId_key" ON "User"("vkId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Rune_runeCode_key" ON "Rune"("runeCode");

-- CreateIndex
CREATE INDEX "Rune_playerId_createdAt_idx" ON "Rune"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "BattleSession_playerId_status_idx" ON "BattleSession"("playerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Biome_code_key" ON "Biome"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MobTemplate_code_key" ON "MobTemplate"("code");

-- CreateIndex
CREATE INDEX "MobTemplate_biomeId_idx" ON "MobTemplate"("biomeId");

-- CreateIndex
CREATE INDEX "GameLog_userId_action_idx" ON "GameLog"("userId", "action");
