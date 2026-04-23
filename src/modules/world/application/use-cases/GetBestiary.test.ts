import { describe, expect, it, vi } from 'vitest';

import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { WorldCatalog } from '../ports/WorldCatalog';
import { GetBestiary } from './GetBestiary';

const createPlayer = () => ({
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
  locationLevel: 1,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 1,
  tutorialState: 'SKIPPED' as const,
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
});

const catalog = {
  listBiomes: vi.fn().mockReturnValue([
    {
      id: 1,
      code: 'initium',
      name: 'Порог Инициации',
      description: 'Стартовая локация.',
      minLevel: 0,
      maxLevel: 0,
    },
  ]),
  findBiomeForLocationLevel: vi.fn(),
  listMobTemplatesForBiome: vi.fn().mockReturnValue([
    {
      code: 'training-wisp',
      biomeCode: 'initium',
      name: 'Учебный огонёк',
      kind: 'spirit',
      isElite: false,
      isBoss: false,
      baseStats: {
        health: 8,
        attack: 1,
        defence: 0,
        magicDefence: 0,
        dexterity: 2,
        intelligence: 1,
      },
      scales: {
        health: 1,
        attack: 1,
        defence: 1,
        magicDefence: 1,
        dexterity: 1,
        intelligence: 1,
      },
      baseExperience: 6,
      baseGold: 2,
      runeDropChance: 10,
      lootTable: { essence: 1 },
      attackText: 'касается искрой',
    },
  ]),
} satisfies WorldCatalog;

describe('GetBestiary', () => {
  it('builds bestiary from player discovery records and world catalog', async () => {
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer()),
      listBestiaryDiscovery: vi.fn().mockResolvedValue({
        discoveredEnemyCodes: ['training-wisp'],
        rewardedEnemyCodes: [],
      }),
    } as unknown as GameRepository;
    const useCase = new GetBestiary(repository, catalog);

    const bestiary = await useCase.execute(1001);

    expect(repository.findPlayerByVkId).toHaveBeenCalledWith(1001);
    expect(repository.listBestiaryDiscovery).toHaveBeenCalledWith(1);
    expect(catalog.listBiomes).toHaveBeenCalled();
    expect(bestiary.locations[0]?.enemies[0]).toMatchObject({
      isDiscovered: true,
      isDropRevealed: false,
    });
  });
});
