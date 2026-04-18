import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '../../../../../shared/types/game';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { DeletePlayer } from './DeletePlayer';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 3,
  experience: 0,
  gold: 0,
  baseStats: { health: 8, attack: 4, defence: 3, magicDefence: 1, dexterity: 2, intelligence: 1 },
  allocationPoints: { health: 0, attack: 0, defence: 0, magicDefence: 0, dexterity: 0, intelligence: 0 },
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

describe('DeletePlayer', () => {
  it('deletes the player only with a matching confirmation state', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      deletePlayerByVkId: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new DeletePlayer(repository);

    await useCase.execute(player.vkId, player.updatedAt);

    expect(repository.deletePlayerByVkId).toHaveBeenCalledWith(player.vkId, player.updatedAt);
  });

  it('rejects stale or missing confirmations before deletion', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      deletePlayerByVkId: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new DeletePlayer(repository);

    await expect(useCase.execute(player.vkId)).rejects.toMatchObject({ code: 'stale_command_intent' });
    await expect(useCase.execute(player.vkId, 'stale-delete-state')).rejects.toMatchObject({ code: 'stale_command_intent' });

    expect(repository.deletePlayerByVkId).not.toHaveBeenCalled();
  });
});
