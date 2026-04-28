ALTER TABLE "PlayerCraftedItem" ADD COLUMN "quality" TEXT NOT NULL DEFAULT 'STURDY';
ALTER TABLE "PlayerCraftedItem" ADD COLUMN "health" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerCraftedItem" ADD COLUMN "attack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerCraftedItem" ADD COLUMN "defence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerCraftedItem" ADD COLUMN "magicDefence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerCraftedItem" ADD COLUMN "dexterity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerCraftedItem" ADD COLUMN "intelligence" INTEGER NOT NULL DEFAULT 0;

UPDATE "PlayerCraftedItem"
SET
  "health" = CASE "itemCode"
    WHEN 'tracker_jacket' THEN 3
    ELSE 0
  END,
  "attack" = CASE "itemCode"
    WHEN 'hunter_cleaver' THEN 2
    ELSE 0
  END,
  "defence" = CASE "itemCode"
    WHEN 'tracker_jacket' THEN 1
    ELSE 0
  END,
  "dexterity" = CASE "itemCode"
    WHEN 'skinning_kit' THEN 1
    ELSE 0
  END;
