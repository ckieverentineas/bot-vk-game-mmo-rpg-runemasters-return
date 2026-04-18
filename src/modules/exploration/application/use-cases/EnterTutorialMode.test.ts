import { describe, expect, it, vi } from 'vitest';

import { gameBalance } from '../../../../config/game-balance';
import type { PlayerState } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { EnterTutorialMode } from './EnterTutorialMode';

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
  highestLocationLevel: 1,
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

describe('EnterTutorialMode', () => {
  it('moves active tutorial players into the intro location', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 2 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveExplorationState: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new EnterTutorialMode(repository);

    await useCase.execute(player.vkId);

    expect(repository.saveExplorationState).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({
        locationLevel: gameBalance.world.introLocationLevel,
        tutorialState: 'ACTIVE',
      }),
    );
  });

  it('does not re-enter tutorial mode for skipped players', async () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: gameBalance.world.introLocationLevel });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EnterTutorialMode(repository);

    await expect(useCase.execute(player.vkId)).resolves.toEqual(player);

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('rejects tutorial screen entry while a battle is already active', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', activeBattleId: 'battle-1' });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EnterTutorialMode(repository);

    await expect(useCase.execute(player.vkId)).rejects.toMatchObject({
      code: 'battle_in_progress',
    });

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });
});
