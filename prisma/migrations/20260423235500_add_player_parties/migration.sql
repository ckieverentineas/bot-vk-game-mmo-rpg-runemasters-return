-- CreateTable
CREATE TABLE "PlayerParty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviteCode" TEXT NOT NULL,
    "leaderPlayerId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "activeBattleId" TEXT,
    "maxMembers" INTEGER NOT NULL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerParty_leaderPlayerId_fkey" FOREIGN KEY ("leaderPlayerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerPartyMember" (
    "partyId" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("partyId", "playerId"),
    CONSTRAINT "PlayerPartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "PlayerParty" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerPartyMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerParty_inviteCode_key" ON "PlayerParty"("inviteCode");

-- CreateIndex
CREATE INDEX "PlayerParty_leaderPlayerId_status_idx" ON "PlayerParty"("leaderPlayerId", "status");

-- CreateIndex
CREATE INDEX "PlayerParty_status_activeBattleId_idx" ON "PlayerParty"("status", "activeBattleId");

-- CreateIndex
CREATE INDEX "PlayerPartyMember_playerId_idx" ON "PlayerPartyMember"("playerId");
