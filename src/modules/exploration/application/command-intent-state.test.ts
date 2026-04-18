import { describe, expect, it } from 'vitest';

import type { PlayerState } from '../../../shared/types/game';

import {
  buildExploreLocationIntentStateKey,
  buildReturnToAdventureIntentStateKey,
  buildSkipTutorialIntentStateKey,
} from './command-intent-state';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 5,
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
  locationLevel: 0,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 2,
  victoryStreak: 1,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 2,
  tutorialState: 'ACTIVE',
  inventory: {
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
  },
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('exploration command intent state keys', () => {
  it('changes when tutorial state changes', () => {
    const before = createPlayer({ tutorialState: 'ACTIVE' });
    const after = createPlayer({ tutorialState: 'SKIPPED' });

    expect(buildSkipTutorialIntentStateKey(before)).not.toBe(buildSkipTutorialIntentStateKey(after));
  });

  it('changes when adaptive destination changes', () => {
    const before = createPlayer({ victoryStreak: 0 });
    const after = createPlayer({ victoryStreak: 3 });

    expect(buildReturnToAdventureIntentStateKey(before)).not.toBe(buildReturnToAdventureIntentStateKey(after));
  });

  it('changes when active battle context changes for explore', () => {
    const before = createPlayer({ activeBattleId: null });
    const after = createPlayer({ activeBattleId: 'battle-1' });

    expect(buildExploreLocationIntentStateKey(before)).not.toBe(buildExploreLocationIntentStateKey(after));
  });
});
