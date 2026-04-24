import { describe, expect, it, vi } from 'vitest';

import { emptyInventory } from '../../../player/domain/player-stats';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { WorldCatalog } from '../../../world/application/ports/WorldCatalog';
import type { BiomeView, PlayerState } from '../../../../shared/types/game';
import { GetRunicTavern } from './GetRunicTavern';

const createPlayer = (): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 8,
  experience: 0,
  gold: 0,
  baseStats: {
    health: 30,
    attack: 5,
    defence: 2,
    magicDefence: 1,
    dexterity: 1,
    intelligence: 1,
  },
  locationLevel: 6,
  currentRuneIndex: 0,
  unlockedRuneSlotCount: 2,
  activeBattleId: null,
  victories: 4,
  victoryStreak: 1,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 4,
  highestLocationLevel: 6,
  tutorialState: 'COMPLETED',
  inventory: emptyInventory(),
  schoolMasteries: [],
  skills: [],
  runes: [],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
});

const createBiome = (overrides: Partial<BiomeView>): BiomeView => ({
  id: 1,
  code: 'dark-forest',
  name: 'Тёмный лес',
  description: 'Старый лес.',
  minLevel: 1,
  maxLevel: 15,
  ...overrides,
});

describe('GetRunicTavern', () => {
  it('loads active threats from every biome and returns tavern board targets', async () => {
    const player = createPlayer();
    const biomes = [
      createBiome({ code: 'dark-forest', name: 'Тёмный лес' }),
      createBiome({ code: 'forgotten-caves', name: 'Забытые пещеры' }),
    ];
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      listActiveEnemyThreatsForBiome: vi.fn(async (biomeCode: string) => (
        biomeCode === 'dark-forest'
          ? [{
              enemyCode: 'blue-slime',
              enemyName: 'Синий слизень',
              originBiomeCode: 'dark-forest',
              originBiomeName: 'Тёмный лес',
              currentBiomeCode: 'dark-forest',
              survivalCount: 3,
              experience: 24,
              levelBonus: 3,
              lastSeenLocationLevel: 6,
            }]
          : []
      )),
    } as unknown as GameRepository;
    const worldCatalog = {
      listBiomes: vi.fn().mockReturnValue(biomes),
    } as unknown as WorldCatalog;
    const board = await new GetRunicTavern(repository, worldCatalog).execute(player.vkId);

    expect(repository.listActiveEnemyThreatsForBiome).toHaveBeenCalledTimes(2);
    expect(repository.listActiveEnemyThreatsForBiome).toHaveBeenCalledWith('dark-forest');
    expect(repository.listActiveEnemyThreatsForBiome).toHaveBeenCalledWith('forgotten-caves');
    expect(board.threats).toHaveLength(1);
    expect(board.threats[0]?.displayName).toBe('Упрямый Синий слизень');
  });
});
