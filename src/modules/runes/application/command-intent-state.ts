import { createHash } from 'node:crypto';

import { gameBalance } from '../../../config/game-balance';
import {
  getEquippedRuneIdsBySlot,
  getSelectedRune,
  getUnlockedRuneSlotCount,
  resolveCurrentProgressionLocationLevel,
} from '../../player/domain/player-stats';
import type { PlayerState, StatKey } from '../../../shared/types/game';
import type { RunePageSlot } from '../domain/rune-collection';
import { resolveHighestCraftableRuneRarity } from '../domain/rune-economy';

const serializeStateKey = (value: unknown): string => createHash('sha1').update(JSON.stringify(value)).digest('hex');

const resolveCraftRarity = (player: PlayerState): string | null => resolveHighestCraftableRuneRarity(player);

const buildRuneLoadoutState = (player: PlayerState) => ({
  currentRuneIndex: player.currentRuneIndex,
  unlockedRuneSlotCount: getUnlockedRuneSlotCount(player),
  selectedRuneId: getSelectedRune(player)?.id ?? null,
  equippedRuneIdsBySlot: getEquippedRuneIdsBySlot(player),
  runeIds: player.runes.map((rune) => rune.id),
});

export const buildMoveRuneCursorIntentStateKey = (player: PlayerState, direction: number): string => serializeStateKey({
  action: 'move_rune_cursor',
  direction,
  ...buildRuneLoadoutState(player),
});

export const buildSelectRunePageSlotIntentStateKey = (player: PlayerState, slot: RunePageSlot): string => serializeStateKey({
  action: 'select_rune_page_slot',
  slot,
  ...buildRuneLoadoutState(player),
});

export const buildCraftIntentStateKey = (player: PlayerState): string => serializeStateKey({
  rarity: resolveCraftRarity(player),
  locationLevel: resolveCurrentProgressionLocationLevel(player),
  currentRuneIndex: player.currentRuneIndex,
  dustBudget: player.gold,
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
    dustBudget: player.gold,
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

export const buildEquipIntentStateKey = (player: PlayerState, targetSlot = 0): string => serializeStateKey({
  action: 'equip',
  targetSlot,
  ...buildRuneLoadoutState(player),
});

export const buildUnequipIntentStateKey = (player: PlayerState, targetSlot = 0): string => serializeStateKey({
  action: 'unequip',
  targetSlot,
  ...buildRuneLoadoutState(player),
});
