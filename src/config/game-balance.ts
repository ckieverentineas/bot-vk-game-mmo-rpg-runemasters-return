import { env } from './env';
import type { InventoryView, MaterialField, RuneRarity, ShardField } from '../shared/types/game';

export interface RuneProfile {
  weight: number;
  maxStatRoll: number;
  lines: number;
  shardField: ShardField;
  title: string;
}

export const gameBalance = Object.freeze({
  world: {
    introLocationLevel: 0,
    minLocationLevel: 0,
    minAdventureLocationLevel: 1,
    maxLocationLevel: 200,
    adaptiveDifficulty: {
      combatPowerPerLevel: 35,
      combatPowerFloorOffset: 1,
      victoryStreakStep: 2,
      maxVictoryStreakBonus: 4,
      defeatStreakPenalty: 4,
      maxDefeatStreakPenalty: 16,
      lowHealthRatio: 0.35,
      lowHealthPenalty: 3,
      lowManaRatio: 0.25,
      lowManaPenalty: 1,
    },
  },
  progression: {
    experienceForNextLevel: (level: number): number => 50 + 10 * level * level,
  },
  combat: {
    spellManaCost: 3,
    battleLogLimit: 12,
    defeatRecovery: {
      healthRatio: 0.35,
      manaRatio: 0.5,
    },
  },
  starterInventory: {
    usualShards: env.game.startingUsualShards,
    unusualShards: env.game.startingUnusualShards,
    rareShards: env.game.startingRareShards,
    epicShards: 0,
    legendaryShards: 0,
    mythicalShards: 0,
    leather: 0,
    bone: 0,
    herb: 0,
    essence: 0,
    metal: 0,
    crystal: 0,
  } satisfies InventoryView,
  runes: {
    craftCost: 10,
    rerollShardCost: 1,
    craftDustCosts: {
      USUAL: 18,
      UNUSUAL: 30,
      RARE: 52,
      EPIC: 90,
      LEGENDARY: 150,
      MYTHICAL: 240,
    } satisfies Record<RuneRarity, number>,
    rerollDustCosts: {
      USUAL: 5,
      UNUSUAL: 8,
      RARE: 13,
      EPIC: 21,
      LEGENDARY: 34,
      MYTHICAL: 55,
    } satisfies Record<RuneRarity, number>,
    craftMaterialCosts: {
      USUAL: {},
      UNUSUAL: { essence: 1 },
      RARE: { essence: 2, crystal: 1 },
      EPIC: { essence: 3, crystal: 2, metal: 1 },
      LEGENDARY: { essence: 5, crystal: 3, metal: 2 },
      MYTHICAL: { essence: 8, crystal: 5, metal: 3 },
    } satisfies Record<RuneRarity, Partial<Record<MaterialField, number>>>,
    profiles: {
      USUAL: { weight: 60, maxStatRoll: 2, lines: 1, shardField: 'usualShards', title: 'Обычная руна' },
      UNUSUAL: { weight: 30, maxStatRoll: 4, lines: 2, shardField: 'unusualShards', title: 'Необычная руна' },
      RARE: { weight: 15, maxStatRoll: 6, lines: 2, shardField: 'rareShards', title: 'Редкая руна' },
      EPIC: { weight: 8, maxStatRoll: 9, lines: 3, shardField: 'epicShards', title: 'Эпическая руна' },
      LEGENDARY: { weight: 3, maxStatRoll: 12, lines: 4, shardField: 'legendaryShards', title: 'Легендарная руна' },
      MYTHICAL: { weight: 1, maxStatRoll: 16, lines: 5, shardField: 'mythicalShards', title: 'Мифическая руна' },
    } satisfies Record<RuneRarity, RuneProfile>,
  },
});
