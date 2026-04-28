CREATE TABLE "PlayerBlueprintInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" INTEGER NOT NULL,
    "blueprintCode" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "discoveryKind" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "craftPotential" TEXT NOT NULL DEFAULT 'default',
    "modifierSnapshot" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "discoveredAt" DATETIME,
    "consumedAt" DATETIME,

    CONSTRAINT "PlayerBlueprintInstance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerBlueprintInstance_code_known" CHECK ("blueprintCode" IN ('hunter_cleaver', 'tracker_jacket', 'skinning_kit', 'resonance_tool')),
    CONSTRAINT "PlayerBlueprintInstance_rarity_known" CHECK ("rarity" IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC')),
    CONSTRAINT "PlayerBlueprintInstance_source_known" CHECK ("sourceType" IN ('TROPHY', 'QUEST', 'BESTIARY', 'DAILY_TRACE', 'EVENT', 'SCHOOL_TRIAL', 'LEGACY')),
    CONSTRAINT "PlayerBlueprintInstance_discovery_known" CHECK ("discoveryKind" IN ('COMMON', 'SECRET', 'QUEST', 'SCHOOL', 'REPAIR', 'LEGACY')),
    CONSTRAINT "PlayerBlueprintInstance_quality_known" CHECK ("quality" IN ('ROUGH', 'STURDY', 'FINE', 'MASTERWORK')),
    CONSTRAINT "PlayerBlueprintInstance_status_known" CHECK ("status" IN ('AVAILABLE', 'CONSUMED', 'EXPIRED'))
);

CREATE INDEX "PlayerBlueprintInstance_playerId_status_idx" ON "PlayerBlueprintInstance"("playerId", "status");
CREATE INDEX "PlayerBlueprintInstance_playerId_blueprintCode_idx" ON "PlayerBlueprintInstance"("playerId", "blueprintCode");
CREATE INDEX "PlayerBlueprintInstance_sourceType_sourceId_idx" ON "PlayerBlueprintInstance"("sourceType", "sourceId");

WITH RECURSIVE expanded_blueprints AS (
    SELECT
        "playerId",
        "blueprintCode",
        "quantity",
        "createdAt",
        "updatedAt",
        1 AS "copyIndex"
    FROM "PlayerBlueprint"
    WHERE "quantity" > 0

    UNION ALL

    SELECT
        "playerId",
        "blueprintCode",
        "quantity",
        "createdAt",
        "updatedAt",
        "copyIndex" + 1
    FROM expanded_blueprints
    WHERE "copyIndex" < "quantity"
)
INSERT INTO "PlayerBlueprintInstance" (
    "id",
    "playerId",
    "blueprintCode",
    "rarity",
    "sourceType",
    "sourceId",
    "discoveryKind",
    "quality",
    "craftPotential",
    "modifierSnapshot",
    "status",
    "createdAt",
    "updatedAt",
    "discoveredAt",
    "consumedAt"
)
SELECT
    'legacy:' || "playerId" || ':' || "blueprintCode" || ':' || "copyIndex",
    "playerId",
    "blueprintCode",
    'COMMON',
    'LEGACY',
    NULL,
    'LEGACY',
    'STURDY',
    'legacy_default',
    '{}',
    'AVAILABLE',
    "createdAt",
    "updatedAt",
    "updatedAt",
    NULL
FROM expanded_blueprints;
