import { describe, expect, it } from 'vitest';

import type { BiomeView, MobTemplateView } from '../../../shared/types/game';
import {
  bestiaryLocationPageSize,
  buildBestiaryLocationDetailView,
  buildBestiaryOverviewView,
  buildBestiaryView,
  normalizeBestiaryPageNumber,
  resolveBestiaryKillMilestoneReward,
} from './bestiary';

const createBiome = (index: number): BiomeView => ({
  id: index,
  code: `biome-${index}`,
  name: `Локация ${index}`,
  description: `Описание ${index}`,
  minLevel: index * 10,
  maxLevel: index * 10 + 9,
});

const createMob = (code: string, biomeCode: string, overrides: Partial<MobTemplateView> = {}): MobTemplateView => ({
  code,
  biomeCode,
  name: `Противник ${code}`,
  kind: 'spirit',
  isElite: false,
  isBoss: false,
  baseStats: {
    health: 10,
    attack: 2,
    defence: 1,
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
  baseExperience: 5,
  baseGold: 2,
  runeDropChance: 10,
  lootTable: { essence: 1 },
  attackText: 'касается',
  ...overrides,
});

describe('bestiary', () => {
  it('normalizes page number inside available location pages', () => {
    expect(normalizeBestiaryPageNumber(Number.NaN, 8)).toBe(1);
    expect(normalizeBestiaryPageNumber(-3, 8)).toBe(1);
    expect(normalizeBestiaryPageNumber(99, 8)).toBe(2);
    expect(normalizeBestiaryPageNumber(2, 8)).toBe(2);
  });

  it('shows five locations per page', () => {
    const biomes = Array.from({ length: bestiaryLocationPageSize + 1 }, (_, index) => createBiome(index + 1));
    const bestiary = buildBestiaryView(
      biomes,
      (biomeCode) => [createMob(`${biomeCode}-enemy`, biomeCode)],
      { discoveredEnemyCodes: [], rewardedEnemyCodes: [] },
      1,
    );

    expect(bestiary.locations.map(({ biome }) => biome.code)).toEqual([
      'biome-1',
      'biome-2',
      'biome-3',
      'biome-4',
      'biome-5',
    ]);
    expect(bestiary.totalPages).toBe(2);
  });

  it('shows five location summaries with first discovery rewards and progress locks', () => {
    const biomes = Array.from({ length: bestiaryLocationPageSize }, (_, index) => createBiome(index));
    const bestiary = buildBestiaryOverviewView({
      biomes,
      listMobTemplatesForBiome: (biomeCode) => [createMob(`${biomeCode}-enemy`, biomeCode)],
      discovery: {
        discoveredEnemyCodes: ['biome-0-enemy', 'biome-1-enemy'],
        rewardedEnemyCodes: ['biome-0-enemy'],
      },
      requestedPageNumber: 1,
      highestLocationLevel: 10,
      claimedLocationRewardCodes: ['biome-0'],
      newlyClaimedLocationRewardCodes: ['biome-1'],
    });

    expect(bestiary.locations).toHaveLength(5);
    expect(bestiary.locations[0]).not.toHaveProperty('enemies');
    expect(bestiary.locations.map(({ biome }) => biome.code)).toEqual([
      'biome-0',
      'biome-1',
      'biome-2',
      'biome-3',
      'biome-4',
    ]);
    expect(bestiary.locations.map(({ isUnlocked }) => isUnlocked)).toEqual([true, true, false, false, false]);
    expect(bestiary.locations.map(({ discoveryReward }) => discoveryReward.reward.radiance)).toEqual([1, 2, 3, 4, 5]);
    expect(bestiary.locations.map(({ discoveryReward }) => discoveryReward.isClaimed)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(bestiary.locations[1]?.discoveryReward.claimedNow).toBe(true);
  });

  it('reveals enemy info after encounter and drop after applied reward', () => {
    const biome = createBiome(1);
    const knownWithoutDrop = createMob('known-without-drop', biome.code);
    const knownWithDrop = createMob('known-with-drop', biome.code, { lootTable: { leather: 2, bone: 1 } });
    const unknown = createMob('unknown', biome.code);

    const bestiary = buildBestiaryView(
      [biome],
      () => [knownWithoutDrop, knownWithDrop, unknown],
      {
        discoveredEnemyCodes: [knownWithoutDrop.code, knownWithDrop.code],
        rewardedEnemyCodes: [knownWithDrop.code],
      },
    );
    const enemies = bestiary.locations[0]?.enemies ?? [];

    expect(enemies.map(({ isDiscovered }) => isDiscovered)).toEqual([true, true, false]);
    expect(enemies.map(({ isDropRevealed }) => isDropRevealed)).toEqual([false, true, false]);
    expect(enemies.map(({ tacticalProfile }) => tacticalProfile?.code ?? null)).toEqual([
      'BASIC_PRESSURE',
      'BASIC_PRESSURE',
      null,
    ]);
    expect(bestiary.locations[0]).toMatchObject({
      discoveredEnemyCount: 2,
      revealedDropCount: 1,
      totalEnemyCount: 3,
    });
  });

  it('builds selected location enemy detail with kill milestone progress', () => {
    const biome = createBiome(0);
    const knownWithDrop = createMob('known-with-drop', biome.code, { lootTable: { leather: 2, bone: 1 } });
    const unknown = createMob('unknown', biome.code);

    const bestiary = buildBestiaryLocationDetailView({
      biomeCode: biome.code,
      biomes: [biome],
      listMobTemplatesForBiome: () => [knownWithDrop, unknown],
      discovery: {
        discoveredEnemyCodes: [knownWithDrop.code],
        rewardedEnemyCodes: [knownWithDrop.code],
        enemyVictoryCounts: [{ enemyCode: knownWithDrop.code, victoryCount: 5 }],
        claimedKillMilestones: [{ enemyCode: knownWithDrop.code, threshold: 1 }],
      },
      highestLocationLevel: 0,
      claimedLocationRewardCodes: [biome.code],
      newlyClaimedLocationRewardCodes: [],
      newlyClaimedKillMilestones: [{ enemyCode: knownWithDrop.code, threshold: 5 }],
    });

    expect(bestiary.location.biome.code).toBe(biome.code);
    expect(bestiary.location.discoveryReward).toMatchObject({ isClaimed: true, claimedNow: false });
    expect(bestiary.enemies.map(({ isDiscovered }) => isDiscovered)).toEqual([true, false]);
    expect(bestiary.enemies[0]?.victoryCount).toBe(5);
    expect(bestiary.enemies[0]?.killMilestones.map(({ threshold, isClaimed, claimedNow }) => ({
      threshold,
      isClaimed,
      claimedNow,
    }))).toEqual([
      { threshold: 1, isClaimed: true, claimedNow: false },
      { threshold: 5, isClaimed: true, claimedNow: true },
      { threshold: 10, isClaimed: false, claimedNow: false },
      { threshold: 25, isClaimed: false, claimedNow: false },
    ]);
    expect(bestiary.enemies[1]?.victoryCount).toBe(0);
    expect(bestiary.enemies[1]?.killMilestones.every(({ isClaimed }) => !isClaimed)).toBe(true);
  });

  it('adds a secret skinning kit blueprint to the five-kill beast milestone', () => {
    expect(resolveBestiaryKillMilestoneReward({
      code: 'forest-wolf',
      kind: 'wolf',
    }, 5)).toMatchObject({
      radiance: 1,
      blueprintDrops: [
        {
          blueprintCode: 'skinning_kit',
          sourceType: 'BESTIARY',
          sourceId: 'forest-wolf:5',
          discoveryKind: 'SECRET',
          quality: 'FINE',
          craftPotential: 'secret_skinning_kit',
        },
      ],
    });
  });
});
