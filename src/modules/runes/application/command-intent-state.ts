import { createHash } from 'node:crypto';

import { gameBalance } from '../../../config/game-balance';
import type { PlayerState, StatKey } from '../../../shared/types/game';

const rarityPriority = ['MYTHICAL', 'LEGENDARY', 'EPIC', 'RARE', 'UNUSUAL', 'USUAL'] as const;

const serializeStateKey = (value: unknown): string => createHash('sha1').update(JSON.stringify(value)).digest('hex');

const resolveCraftRarity = (player: PlayerState): string | null => {
  const rarity = rarityPriority.find((candidate) => (
    player.inventory[gameBalance.runes.profiles[candidate].shardField] >= gameBalance.runes.craftCost
  ));

  return rarity ?? null;
};

export const buildCraftIntentStateKey = (player: PlayerState): string => serializeStateKey({
  rarity: resolveCraftRarity(player),
  locationLevel: player.locationLevel,
  currentRuneIndex: player.currentRuneIndex,
  shardBudgets: {
    usual: player.inventory.usualShards,
    unusual: player.inventory.unusualShards,
    rare: player.inventory.rareShards,
    epic: player.inventory.epicShards,
    legendary: player.inventory.legendaryShards,
    mythical: player.inventory.mythicalShards,
  },
  runeIds: player.runes.map((rune) => rune.id),
});

export const buildRerollIntentStateKey = (
  player: PlayerState,
  stat: StatKey,
  rune: NonNullable<PlayerState['runes'][number]>,
): string => {
  const shardField = gameBalance.runes.profiles[rune.rarity].shardField;

  return serializeStateKey({
    stat,
    runeId: rune.id,
    currentRuneIndex: player.currentRuneIndex,
    shardBudget: player.inventory[shardField],
    stats: {
      health: rune.health,
      attack: rune.attack,
      defence: rune.defence,
      magicDefence: rune.magicDefence,
      dexterity: rune.dexterity,
      intelligence: rune.intelligence,
    },
  });
};

export const buildDestroyIntentStateKey = (
  player: PlayerState,
  runeId: string,
  shardField: keyof PlayerState['inventory'],
): string => serializeStateKey({
  runeId,
  currentRuneIndex: player.currentRuneIndex,
  shardBudget: player.inventory[shardField],
  runeIds: player.runes.map((rune) => rune.id),
});
