import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { LeaveParty } from './LeaveParty';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1002,
  playerId: 2,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: { health: 8, attack: 4, defence: 3, magicDefence: 1, dexterity: 2, intelligence: 1 },
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
    usualShards: 0, unusualShards: 0, rareShards: 0, epicShards: 0, legendaryShards: 0, mythicalShards: 0,
    leather: 0, bone: 0, herb: 0, essence: 0, metal: 0, crystal: 0,
  },
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('LeaveParty', () => {
  it('removes the player from the active party and returns the empty party screen state', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      leaveParty: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new LeaveParty(repository);

    await expect(useCase.execute(player.vkId)).resolves.toEqual({
      player,
      party: null,
    });

    expect(repository.leaveParty).toHaveBeenCalledWith(player.playerId);
  });
});
