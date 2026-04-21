-- CreateTable
CREATE TABLE "PlayerSkill" (
    "playerId" INTEGER NOT NULL,
    "skillCode" TEXT NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("playerId", "skillCode"),
    CONSTRAINT "PlayerSkill_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlayerSkill_skillCode_rank_idx" ON "PlayerSkill"("skillCode", "rank");
