import { describe, expect, it } from 'vitest';

import type { BiomeView, MobTemplateView } from '../../../shared/types/game';
import {
  bestiaryLocationPageSize,
  buildBestiaryView,
  normalizeBestiaryPageNumber,
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
    expect(bestiary.locations[0]).toMatchObject({
      discoveredEnemyCount: 2,
      revealedDropCount: 1,
      totalEnemyCount: 3,
    });
  });
});
