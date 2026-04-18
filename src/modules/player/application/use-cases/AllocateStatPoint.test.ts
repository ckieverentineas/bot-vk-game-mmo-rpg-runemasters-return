import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '../../../../../shared/types/game';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { buildAllocateStatIntentStateKey } from '../command-intent-state';
import { AllocateStatPoint } from './AllocateStatPoint';

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
  unspentStatPoints: 2,
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

describe('AllocateStatPoint', () => {
  it('passes guarded allocation options when intent metadata is present', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveAllocation: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new AllocateStatPoint(repository);
    const stateKey = buildAllocateStatIntentStateKey(player, 'attack');

    await useCase.execute(player.vkId, 'attack', 'intent-attack-1', stateKey);

    expect(repository.saveAllocation).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({ attack: 1 }),
      1,
      expect.objectContaining({
        commandKey: 'ALLOCATE_STAT_POINT',
        intentId: 'intent-attack-1',
        intentStateKey: stateKey,
        expectedAllocationPoints: player.allocationPoints,
        expectedUnspentStatPoints: player.unspentStatPoints,
      }),
    );
  });

  it('rejects a stale profile button before persistence', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveAllocation: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new AllocateStatPoint(repository);

    await expect(useCase.execute(player.vkId, 'attack', 'intent-attack-1', 'stale-state')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.saveAllocation).not.toHaveBeenCalled();
  });

  it('rejects an incomplete intent envelope before persistence', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveAllocation: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new AllocateStatPoint(repository);

    await expect(useCase.execute(player.vkId, 'attack', 'intent-only')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.saveAllocation).not.toHaveBeenCalled();
  });
});
