import { describe, expect, it } from 'vitest';

import type { PlayerState } from '../../../shared/types/game';

import { buildCraftIntentStateKey } from './command-intent-state';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: {
    health: 8,
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 2,
    intelligence: 1,
  },
  allocationPoints: {
    health: 0,
    attack: 0,
    defence: 0,
    magicDefence: 0,
    dexterity: 0,
    intelligence: 0,
  },
  unspentStatPoints: 0,
  locationLevel: 1,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 0,
  tutorialState: 'SKIPPED',
  inventory: {
    usualShards: 20,
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
  },
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('command intent state keys', () => {
  it('changes craft state key when rune collection changes even if shard budget returns to the same value', () => {
    const before = createPlayer({
      runes: [
        {
          id: 'rune-a',
          runeCode: 'rune-a',
          archetypeCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbilityCodes: ['ember_pulse'],
          name: 'Руна A',
          rarity: 'USUAL',
          isEquipped: false,
          health: 1,
          attack: 2,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });
    const after = createPlayer({
      runes: [
        {
          id: 'rune-b',
          runeCode: 'rune-b',
          archetypeCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbilityCodes: ['ember_pulse'],
          name: 'Руна B',
          rarity: 'USUAL',
          isEquipped: false,
          health: 1,
          attack: 2,
          defence: 0,
          magicDefence: 0,
          dexterity: 0,
          intelligence: 0,
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });

    expect(buildCraftIntentStateKey(before)).not.toBe(buildCraftIntentStateKey(after));
  });
});
