import { describe, expect, it } from 'vitest';

import type { PlayerState, StatBlock } from '../../../shared/types/game';
import { buildBattlePlayerSnapshot } from './build-battle-player-snapshot';

const createStats = (): StatBlock => ({
  health: 12,
  attack: 4,
  defence: 3,
  magicDefence: 1,
  dexterity: 2,
  intelligence: 2,
});

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: createStats(),
  locationLevel: 1,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 1,
  tutorialState: 'SKIPPED',
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
  schoolMasteries: [],
  runes: [],
  createdAt: '2026-04-23T00:00:00.000Z',
  updatedAt: '2026-04-23T00:00:00.000Z',
  ...overrides,
});

describe('buildBattlePlayerSnapshot', () => {
  it('starts the next battle from persisted player vitals', () => {
    const snapshot = buildBattlePlayerSnapshot(1, 1001, createStats(), createPlayer({
      currentHealth: 5,
      currentMana: 3,
    }));

    expect(snapshot.maxHealth).toBe(12);
    expect(snapshot.currentHealth).toBe(5);
    expect(snapshot.maxMana).toBe(8);
    expect(snapshot.currentMana).toBe(3);
  });

  it('uses full vitals for players without persisted attrition state', () => {
    const snapshot = buildBattlePlayerSnapshot(1, 1001, createStats(), createPlayer());

    expect(snapshot.currentHealth).toBe(snapshot.maxHealth);
    expect(snapshot.currentMana).toBe(snapshot.maxMana);
  });
});
