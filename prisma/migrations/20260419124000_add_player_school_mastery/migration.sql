-- CreateTable
CREATE TABLE "PlayerSchoolMastery" (
    "playerId" INTEGER NOT NULL,
    "schoolCode" TEXT NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("playerId", "schoolCode"),
    CONSTRAINT "PlayerSchoolMastery_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlayerSchoolMastery_schoolCode_rank_idx" ON "PlayerSchoolMastery"("schoolCode", "rank");
