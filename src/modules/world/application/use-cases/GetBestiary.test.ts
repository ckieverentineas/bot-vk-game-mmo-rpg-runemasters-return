import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { BestiaryDiscoveryState } from '../../domain/bestiary';
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

const createDiscovery = (overrides: Partial<BestiaryDiscoveryState> = {}) => ({
  discoveredEnemyCodes: [],
  rewardedEnemyCodes: [],
  enemyVictoryCounts: [],
  claimedLocationRewardCodes: [],
  claimedKillMilestones: [],
  ...overrides,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds location overview and claims newly unlocked discovery rewards once', async () => {
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer()),
      listBestiaryDiscovery: vi.fn()
        .mockResolvedValueOnce(createDiscovery({ discoveredEnemyCodes: ['training-wisp'] }))
        .mockResolvedValueOnce(createDiscovery({
          discoveredEnemyCodes: ['training-wisp'],
          claimedLocationRewardCodes: ['initium'],
        })),
      claimBestiaryLocationDiscoveryReward: vi.fn().mockResolvedValue({
        player: { ...createPlayer(), radiance: 1 },
        biomeCode: 'initium',
        reward: { radiance: 1 },
        claimed: true,
      }),
      claimBestiaryEnemyKillMilestoneReward: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new GetBestiary(repository, catalog);

    const bestiary = await useCase.execute(1001);

    expect(repository.findPlayerByVkId).toHaveBeenCalledWith(1001);
    expect(repository.listBestiaryDiscovery).toHaveBeenCalledWith(1);
    expect(catalog.listBiomes).toHaveBeenCalled();
    expect(repository.claimBestiaryLocationDiscoveryReward).toHaveBeenCalledWith(1, 'initium', { radiance: 1 });
    expect(bestiary.locations[0]).toMatchObject({
      biome: expect.objectContaining({ code: 'initium' }),
      isUnlocked: true,
      discoveryReward: {
        reward: { radiance: 1 },
        isClaimed: true,
        claimedNow: true,
      },
    });
  });

  it('does not claim a location discovery reward that is already recorded', async () => {
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer()),
      listBestiaryDiscovery: vi.fn().mockResolvedValue(createDiscovery({
        claimedLocationRewardCodes: ['initium'],
      })),
      claimBestiaryLocationDiscoveryReward: vi.fn(),
      claimBestiaryEnemyKillMilestoneReward: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new GetBestiary(repository, catalog);

    const bestiary = await useCase.execute(1001);

    expect(repository.claimBestiaryLocationDiscoveryReward).not.toHaveBeenCalled();
    expect(bestiary.locations[0]?.discoveryReward).toMatchObject({
      isClaimed: true,
      claimedNow: false,
    });
  });

  it('builds selected location detail and claims qualified kill milestone rewards once', async () => {
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer()),
      listBestiaryDiscovery: vi.fn()
        .mockResolvedValueOnce(createDiscovery({
          discoveredEnemyCodes: ['training-wisp'],
          rewardedEnemyCodes: ['training-wisp'],
          claimedLocationRewardCodes: ['initium'],
          enemyVictoryCounts: [{ enemyCode: 'training-wisp', victoryCount: 5 }],
          claimedKillMilestones: [{ enemyCode: 'training-wisp', threshold: 1 }],
        }))
        .mockResolvedValueOnce(createDiscovery({
          discoveredEnemyCodes: ['training-wisp'],
          rewardedEnemyCodes: ['training-wisp'],
          claimedLocationRewardCodes: ['initium'],
          enemyVictoryCounts: [{ enemyCode: 'training-wisp', victoryCount: 5 }],
          claimedKillMilestones: [
            { enemyCode: 'training-wisp', threshold: 1 },
            { enemyCode: 'training-wisp', threshold: 5 },
          ],
        })),
      claimBestiaryLocationDiscoveryReward: vi.fn(),
      claimBestiaryEnemyKillMilestoneReward: vi.fn().mockResolvedValue({
        player: { ...createPlayer(), radiance: 1 },
        enemyCode: 'training-wisp',
        threshold: 5,
        reward: { radiance: 1 },
        claimed: true,
      }),
    } as unknown as GameRepository;
    const useCase = new GetBestiary(repository, catalog);

    const detail = await useCase.executeLocation(1001, 'initium');

    expect(repository.claimBestiaryEnemyKillMilestoneReward).toHaveBeenCalledWith(
      1,
      'training-wisp',
      5,
      { radiance: 1 },
    );
    expect(detail.location.biome.code).toBe('initium');
    expect(detail.enemies[0]).toMatchObject({
      isDiscovered: true,
      isDropRevealed: true,
      victoryCount: 5,
    });
    expect(detail.enemies[0]?.killMilestones.find(({ threshold }) => threshold === 5)).toMatchObject({
      isClaimed: true,
      claimedNow: true,
    });
  });
});
