import { gameBalance } from '../../../config/game-balance';
import type { InventoryView, PlayerState, RuneRarity, RuneView, ShardField, StatBlock } from '../../../shared/types/game';

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

export const allocationToBonus = (allocationPoints: StatBlock): StatBlock => ({
  health: allocationPoints.health * gameBalance.statPointEffects.health,
  attack: allocationPoints.attack * gameBalance.statPointEffects.attack,
  defence: allocationPoints.defence * gameBalance.statPointEffects.defence,
  magicDefence: allocationPoints.magicDefence * gameBalance.statPointEffects.magicDefence,
  dexterity: allocationPoints.dexterity * gameBalance.statPointEffects.dexterity,
  intelligence: allocationPoints.intelligence * gameBalance.statPointEffects.intelligence,
});

export const getEquippedRune = (player: PlayerState): RuneView | null => player.runes.find((rune) => rune.isEquipped) ?? null;

export const getSelectedRune = (player: PlayerState): RuneView | null => {
  if (player.runes.length === 0) {
    return null;
  }

  return player.runes[normalizeRuneIndex(player.currentRuneIndex, player.runes.length)] ?? null;
};

export const derivePlayerStats = (player: PlayerState): StatBlock => {
  const equippedRune = getEquippedRune(player) ?? emptyStats();
  return addStats(addStats(player.baseStats, allocationToBonus(player.allocationPoints)), equippedRune);
};

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const calculateCombatPower = (stats: StatBlock): number => (
  stats.health
  + stats.attack * 4
  + stats.defence * 3
  + stats.magicDefence * 2
  + stats.dexterity * 2
  + stats.intelligence * 2
);

export const isPlayerInTutorial = (player: Pick<PlayerState, 'locationLevel'>): boolean => (
  player.locationLevel === gameBalance.world.introLocationLevel
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

export const resolveEncounterLocationLevel = (player: PlayerState): number => (
  isPlayerInTutorial(player)
    ? gameBalance.world.introLocationLevel
    : resolveAdaptiveAdventureLocationLevel(player)
);

export const normalizeRuneIndex = (index: number, runeCount: number): number => {
  if (runeCount <= 0) {
    return 0;
  }

  const normalized = index % runeCount;
  return normalized >= 0 ? normalized : runeCount + normalized;
};

export const spentStatPoints = (allocationPoints: StatBlock): number => (
  allocationPoints.health
  + allocationPoints.attack
  + allocationPoints.defence
  + allocationPoints.magicDefence
  + allocationPoints.dexterity
  + allocationPoints.intelligence
);

export const resolveLevelProgression = (
  level: number,
  experience: number,
  experienceGain: number,
  unspentStatPoints: number,
): { level: number; experience: number; unspentStatPoints: number } => {
  let nextLevel = level;
  let nextExperience = experience + experienceGain;
  let nextPoints = unspentStatPoints;

  while (nextExperience >= gameBalance.progression.experienceForNextLevel(nextLevel)) {
    nextExperience -= gameBalance.progression.experienceForNextLevel(nextLevel);
    nextLevel += 1;
    nextPoints += 1;
  }

  return {
    level: nextLevel,
    experience: nextExperience,
    unspentStatPoints: nextPoints,
  };
};

export const shardFieldForRarity = (rarity: RuneRarity): ShardField => gameBalance.runes.profiles[rarity].shardField;
