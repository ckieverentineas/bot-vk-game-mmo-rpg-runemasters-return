-- Add foundation fields for future rune slots while keeping the active runtime at one unlocked slot.
ALTER TABLE "PlayerProgress" ADD COLUMN "unlockedRuneSlotCount" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Rune" ADD COLUMN "equippedSlot" INTEGER;

UPDATE "Rune"
SET "equippedSlot" = CASE
  WHEN "isEquipped" = true THEN 0
  ELSE NULL
END;
