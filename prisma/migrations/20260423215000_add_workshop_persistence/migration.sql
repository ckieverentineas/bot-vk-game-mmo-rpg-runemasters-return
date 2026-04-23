CREATE TABLE "PlayerBlueprint" (
    "playerId" INTEGER NOT NULL,
    "blueprintCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "PlayerBlueprint_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerBlueprint_quantity_non_negative" CHECK ("quantity" >= 0),
    CONSTRAINT "PlayerBlueprint_code_known" CHECK ("blueprintCode" IN ('hunter_cleaver', 'tracker_jacket', 'skinning_kit', 'resonance_tool')),
    PRIMARY KEY ("playerId", "blueprintCode")
);

CREATE TABLE "PlayerCraftedItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" INTEGER NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemClass" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "durability" INTEGER NOT NULL,
    "maxDurability" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "PlayerCraftedItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerCraftedItem_code_known" CHECK ("itemCode" IN ('hunter_cleaver', 'tracker_jacket', 'skinning_kit')),
    CONSTRAINT "PlayerCraftedItem_class_known" CHECK ("itemClass" IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'L', 'UL')),
    CONSTRAINT "PlayerCraftedItem_slot_known" CHECK ("slot" IN ('weapon', 'armor', 'trinket', 'tool')),
    CONSTRAINT "PlayerCraftedItem_status_known" CHECK ("status" IN ('ACTIVE', 'BROKEN', 'DESTROYED')),
    CONSTRAINT "PlayerCraftedItem_durability_non_negative" CHECK ("durability" >= 0),
    CONSTRAINT "PlayerCraftedItem_maxDurability_positive" CHECK ("maxDurability" > 0),
    CONSTRAINT "PlayerCraftedItem_durability_not_above_max" CHECK ("durability" <= "maxDurability")
);

CREATE INDEX "PlayerBlueprint_blueprintCode_idx" ON "PlayerBlueprint"("blueprintCode");
CREATE INDEX "PlayerCraftedItem_playerId_status_idx" ON "PlayerCraftedItem"("playerId", "status");
CREATE INDEX "PlayerCraftedItem_playerId_itemCode_idx" ON "PlayerCraftedItem"("playerId", "itemCode");
CREATE INDEX "PlayerCraftedItem_playerId_slot_equipped_idx" ON "PlayerCraftedItem"("playerId", "slot", "equipped");
