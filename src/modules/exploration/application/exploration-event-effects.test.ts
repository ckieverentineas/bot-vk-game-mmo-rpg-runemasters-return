import { describe, expect, it, vi } from 'vitest';

import type { InventoryDelta, PlayerState } from '../../../shared/types/game';
import type { ExplorationSceneView } from '../../world/domain/exploration-events';
import { persistExplorationSceneEffectResult } from './exploration-event-effects';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  radiance: 0,
  baseStats: {
    health: 10,
    attack: 3,
    defence: 2,
    magicDefence: 1,
    dexterity: 2,
    intelligence: 2,
  },
  currentHealth: 2,
  currentMana: 1,
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
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  ...overrides,
});

const createScene = (
  effect: ExplorationSceneView['effect'],
): ExplorationSceneView => ({
  code: 'scene-1',
  kind: 'resource_find',
  kindLabel: 'find',
  title: 'Scene',
  directorLine: null,
  description: 'Scene.',
  outcomeLine: 'Outcome.',
  nextStepLine: 'Next.',
  effect,
});

const addInventoryDelta = (player: PlayerState, delta: InventoryDelta): PlayerState => ({
  ...player,
  inventory: {
    ...player.inventory,
    herb: (player.inventory.herb ?? 0) + (delta.herb ?? 0),
  },
});

describe('persistExplorationSceneEffectResult', () => {
  it('records inventory delta effects through the repository', async () => {
    const player = createPlayer();
    const repository = {
      recordInventoryDeltaResult: vi.fn(async (
        _playerId: number,
        delta: InventoryDelta,
        _options: unknown,
        buildResult: (updatedPlayer: PlayerState) => PlayerState,
      ) => buildResult(addInventoryDelta(player, delta))),
      recordPlayerVitalsResult: vi.fn(),
    };

    const result = await persistExplorationSceneEffectResult({
      repository,
      player,
      event: createScene({
        kind: 'inventory_delta',
        delta: { herb: 1 },
        line: 'Herb +1.',
      }),
      options: { commandKey: 'EXPLORE_LOCATION' },
      buildResult: (updatedPlayer) => updatedPlayer,
    });

    expect(result?.inventory.herb).toBe(1);
    expect(repository.recordInventoryDeltaResult).toHaveBeenCalledWith(
      player.playerId,
      { herb: 1 },
      { commandKey: 'EXPLORE_LOCATION' },
      expect.any(Function),
    );
    expect(repository.recordPlayerVitalsResult).not.toHaveBeenCalled();
  });

  it('records vital recovery effects through the repository', async () => {
    const player = createPlayer();
    const repository = {
      recordInventoryDeltaResult: vi.fn(),
      recordPlayerVitalsResult: vi.fn(async (
        _playerId: number,
        vitals: Required<Pick<PlayerState, 'currentHealth' | 'currentMana'>>,
        _options: unknown,
        buildResult: (updatedPlayer: PlayerState) => PlayerState,
      ) => buildResult({ ...player, ...vitals })),
    };

    const result = await persistExplorationSceneEffectResult({
      repository,
      player,
      event: createScene({
        kind: 'vital_recovery',
        healthRatio: 0.7,
        manaRatio: 0.75,
        line: 'Recover.',
      }),
      options: { commandKey: 'EXPLORE_PARTY' },
      buildResult: (updatedPlayer) => updatedPlayer,
    });

    expect(result?.currentHealth).toBe(7);
    expect(result?.currentMana).toBe(6);
    expect(repository.recordPlayerVitalsResult).toHaveBeenCalledWith(
      player.playerId,
      { currentHealth: 7, currentMana: 6 },
      { commandKey: 'EXPLORE_PARTY' },
      expect.any(Function),
    );
    expect(repository.recordInventoryDeltaResult).not.toHaveBeenCalled();
  });

  it('returns null for scenes without a persisted effect', async () => {
    const repository = {
      recordInventoryDeltaResult: vi.fn(),
      recordPlayerVitalsResult: vi.fn(),
    };

    const result = await persistExplorationSceneEffectResult({
      repository,
      player: createPlayer(),
      event: createScene({ kind: 'none' }),
      options: { commandKey: 'EXPLORE_LOCATION' },
      buildResult: (updatedPlayer) => updatedPlayer,
    });

    expect(result).toBeNull();
    expect(repository.recordInventoryDeltaResult).not.toHaveBeenCalled();
    expect(repository.recordPlayerVitalsResult).not.toHaveBeenCalled();
  });
});
