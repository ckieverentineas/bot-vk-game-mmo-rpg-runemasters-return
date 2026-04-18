import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { resolveAdaptiveAdventureLocationLevel } from '../../../player/domain/player-stats';
import { SkipTutorial } from './SkipTutorial';

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

describe('SkipTutorial', () => {
  it('moves active tutorial players onto the adventure path and marks onboarding skipped', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveExplorationState: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new SkipTutorial(repository);

    await useCase.execute(player.vkId);

    expect(repository.saveExplorationState).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({
        locationLevel: resolveAdaptiveAdventureLocationLevel(player),
        tutorialState: 'SKIPPED',
      }),
    );
  });

  it('keeps completed tutorial state unchanged on repeated skip command', async () => {
    const player = createPlayer({ tutorialState: 'COMPLETED', locationLevel: 0 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveExplorationState: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new SkipTutorial(repository);

    await useCase.execute(player.vkId);

    expect(repository.saveExplorationState).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({
        tutorialState: 'COMPLETED',
      }),
    );
  });
});
