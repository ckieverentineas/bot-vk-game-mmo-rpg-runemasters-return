import { gameBalance } from '../../../config/game-balance';
import type { InventoryView, PlayerState, RuneRarity, RuneView, ShardField, StatBlock } from '../../../shared/types/game';
import { resolveUnlockedRuneSlotCountFromSchoolMasteries } from './school-mastery';

export const DEFAULT_UNLOCKED_RUNE_SLOT_COUNT = 2;

export const emptyStats = (): StatBlock => ({
  health: 0,
  attack: 0,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
});

export const emptyInventory = (): InventoryView => ({
  usualShards: 0,
  unusualShards: 0,
  rareShards: 0,
  epicShards: 0,
  legendaryShards: 0,
  mythicalShards: 0,
  leather: 0,
  bone: 0,
  herb: 0,
  essence: 0,
  metal: 0,
  crystal: 0,
});

export const addStats = (left: StatBlock, right: StatBlock): StatBlock => ({
  health: left.health + right.health,
  attack: left.attack + right.attack,
  defence: left.defence + right.defence,
  magicDefence: left.magicDefence + right.magicDefence,
  dexterity: left.dexterity + right.dexterity,
  intelligence: left.intelligence + right.intelligence,
});

export interface PlayerVitalsView {
  readonly maxHealth: number;
  readonly currentHealth: number;
  readonly maxMana: number;
  readonly currentMana: number;
}

export const resolveMaxMana = (stats: Pick<StatBlock, 'intelligence'>): number => (
  Math.max(0, stats.intelligence * 4)
);

const normalizeCurrentVital = (
  value: number | null | undefined,
  fallback: number,
  maxValue: number,
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return clamp(Math.floor(value), 0, Math.max(0, maxValue));
};

export const getUnlockedRuneSlotCount = (player: Pick<PlayerState, 'unlockedRuneSlotCount' | 'schoolMasteries'>): number => {
  const slotCount = player.unlockedRuneSlotCount ?? DEFAULT_UNLOCKED_RUNE_SLOT_COUNT;
  const persistedSlotCount = Number.isInteger(slotCount) && slotCount > 0 ? slotCount : DEFAULT_UNLOCKED_RUNE_SLOT_COUNT;
  const normalizedSlotCount = Math.max(DEFAULT_UNLOCKED_RUNE_SLOT_COUNT, persistedSlotCount);

  return 'schoolMasteries' in player
    ? resolveUnlockedRuneSlotCountFromSchoolMasteries(player, normalizedSlotCount)
    : normalizedSlotCount;
};

export const getRuneEquippedSlot = (rune: Pick<RuneView, 'equippedSlot' | 'isEquipped'>): number | null => {
  if (typeof rune.equippedSlot === 'number' && Number.isInteger(rune.equippedSlot) && rune.equippedSlot >= 0) {
    return rune.equippedSlot;
  }

  return rune.isEquipped ? 0 : null;
};

export const getEquippedRunes = (player: PlayerState): RuneView[] => player.runes
  .filter((rune) => getRuneEquippedSlot(rune) !== null)
  .sort((left, right) => {
    const leftSlot = getRuneEquippedSlot(left) ?? Number.MAX_SAFE_INTEGER;
    const rightSlot = getRuneEquippedSlot(right) ?? Number.MAX_SAFE_INTEGER;

    if (leftSlot !== rightSlot) {
      return leftSlot - rightSlot;
    }

    return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
  });

export const getEquippedRuneIdsBySlot = (
  player: PlayerState,
  slotCount = getUnlockedRuneSlotCount(player),
): Array<string | null> => {
  const runeIdsBySlot = Array.from({ length: slotCount }, () => null as string | null);

  for (const rune of getEquippedRunes(player)) {
    const slot = getRuneEquippedSlot(rune);
    if (slot === null || slot >= runeIdsBySlot.length || runeIdsBySlot[slot] !== null) {
      continue;
    }

    runeIdsBySlot[slot] = rune.id;
  }

  return runeIdsBySlot;
};

export const getEquippedRune = (player: PlayerState, slot = 0): RuneView | null => (
  getEquippedRunes(player).find((rune) => getRuneEquippedSlot(rune) === slot) ?? null
);

export const findFirstEmptyRuneSlot = (
  player: PlayerState,
  slotCount = getUnlockedRuneSlotCount(player),
): number | null => {
  for (let slot = 0; slot < slotCount; slot += 1) {
    if (!getEquippedRune(player, slot)) {
      return slot;
    }
  }

  return null;
};

export const resolveAutoEquipRuneSlot = (player: PlayerState): number => (
  findFirstEmptyRuneSlot(player) ?? 0
);

export const getSelectedRune = (player: PlayerState): RuneView | null => {
  if (player.runes.length === 0) {
    return null;
  }

  return player.runes[normalizeRuneIndex(player.currentRuneIndex, player.runes.length)] ?? null;
};

export const derivePlayerStats = (player: PlayerState): StatBlock => {
  const equippedRunes = getEquippedRunes(player);
  return equippedRunes.reduce((stats, rune) => addStats(stats, rune), player.baseStats);
};

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const derivePlayerVitals = (
  player: Pick<PlayerState, 'currentHealth' | 'currentMana'>,
  stats: StatBlock,
): PlayerVitalsView => {
  const maxHealth = Math.max(1, stats.health);
  const maxMana = resolveMaxMana(stats);

  return {
    maxHealth,
    currentHealth: normalizeCurrentVital(player.currentHealth, maxHealth, maxHealth),
    maxMana,
    currentMana: normalizeCurrentVital(player.currentMana, maxMana, maxMana),
  };
};

export const derivePostBattleVitals = (
  battlePlayer: Pick<PlayerVitalsView, 'maxHealth' | 'currentHealth' | 'maxMana' | 'currentMana'>,
): Pick<PlayerState, 'currentHealth' | 'currentMana'> => ({
  currentHealth: Math.max(1, normalizeCurrentVital(battlePlayer.currentHealth, 1, battlePlayer.maxHealth)),
  currentMana: normalizeCurrentVital(battlePlayer.currentMana, 0, battlePlayer.maxMana),
});

const calculateCombatPower = (stats: StatBlock): number => (
  stats.health
  + stats.attack * 4
  + stats.defence * 3
  + stats.magicDefence * 0.5
  + stats.dexterity * 1.5
  + stats.intelligence * 0.5
);

export const isPlayerInTutorial = (player: Pick<PlayerState, 'locationLevel' | 'tutorialState'>): boolean => (
  player.tutorialState === 'ACTIVE'
  && player.locationLevel === gameBalance.world.introLocationLevel
);

export const resolveCurrentProgressionLocationLevel = (player: PlayerState): number => (
  isPlayerInTutorial(player)
    ? gameBalance.world.introLocationLevel
    : resolveAdaptiveAdventureLocationLevel(player)
);

export const resolveAdaptiveAdventureLocationLevel = (player: PlayerState): number => {
  const adaptiveDifficulty = gameBalance.world.adaptiveDifficulty;
  const combatPower = calculateCombatPower(derivePlayerStats(player));
  const combatPowerBonus = Math.max(
    0,
    Math.floor(combatPower / adaptiveDifficulty.combatPowerPerLevel) - adaptiveDifficulty.combatPowerFloorOffset,
  );
  const victoryBonus = Math.min(
    adaptiveDifficulty.maxVictoryStreakBonus,
    Math.floor(player.victoryStreak / adaptiveDifficulty.victoryStreakStep),
  );
  const defeatPenalty = Math.min(
    adaptiveDifficulty.maxDefeatStreakPenalty,
    player.defeatStreak * adaptiveDifficulty.defeatStreakPenalty,
  );

  return clamp(
    player.level + combatPowerBonus + victoryBonus - defeatPenalty,
    gameBalance.world.minAdventureLocationLevel,
    gameBalance.world.maxLocationLevel,
  );
};

export const resolveEncounterLocationLevel = (player: PlayerState): number => resolveCurrentProgressionLocationLevel(player);

export const normalizeRuneIndex = (index: number, runeCount: number): number => {
  if (runeCount <= 0) {
    return 0;
  }

  const normalized = index % runeCount;
  return normalized >= 0 ? normalized : runeCount + normalized;
};

export const resolveLevelProgression = (
  level: number,
  experience: number,
  experienceGain: number,
): { level: number; experience: number } => {
  let nextLevel = level;
  let nextExperience = experience + experienceGain;

  while (nextExperience >= gameBalance.progression.experienceForNextLevel(nextLevel)) {
    nextExperience -= gameBalance.progression.experienceForNextLevel(nextLevel);
    nextLevel += 1;
  }

  return {
    level: nextLevel,
    experience: nextExperience,
  };
};

export const shardFieldForRarity = (rarity: RuneRarity): ShardField => gameBalance.runes.profiles[rarity].shardField;
