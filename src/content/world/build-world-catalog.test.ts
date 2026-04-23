import { describe, expect, it } from 'vitest';

import { buildWorldCatalog } from './build-world-catalog';
import type { BiomeSeedDefinition, MobTemplateSeedDefinition } from './types';

const biomes: readonly BiomeSeedDefinition[] = [
  {
    code: 'tutorial',
    name: 'Обучение',
    description: 'Стартовая зона.',
    minLevel: 0,
    maxLevel: 0,
  },
  {
    code: 'forest',
    name: 'Лес',
    description: 'Основная стартовая зона.',
    minLevel: 1,
    maxLevel: 10,
  },
];

const mobs: readonly MobTemplateSeedDefinition[] = [
  {
    biomeCode: 'forest',
    code: 'wolf',
    name: 'Волк',
    kind: 'wolf',
    isElite: false,
    isBoss: false,
    baseHealth: 12,
    baseAttack: 3,
    baseDefence: 1,
    baseMagicDefence: 0,
    baseDexterity: 3,
    baseIntelligence: 1,
    healthScale: 1.1,
    attackScale: 1.05,
    defenceScale: 1.02,
    magicDefenceScale: 1.01,
    dexterityScale: 1.04,
    intelligenceScale: 1.01,
    baseExperience: 10,
    baseGold: 4,
    runeDropChance: 12,
    lootTable: { leather: 1, bone: 1 },
    attackText: 'впивается клыками',
  },
  {
    biomeCode: 'forest',
    code: 'seer',
    name: 'Ведунья',
    kind: 'mage',
    isElite: true,
    isBoss: false,
    baseHealth: 18,
    baseAttack: 5,
    baseDefence: 1,
    baseMagicDefence: 3,
    baseDexterity: 4,
    baseIntelligence: 6,
    healthScale: 1.1,
    attackScale: 1.05,
    defenceScale: 1.02,
    magicDefenceScale: 1.03,
    dexterityScale: 1.04,
    intelligenceScale: 1.05,
    baseExperience: 16,
    baseGold: 7,
    runeDropChance: 18,
    lootTable: { herb: 2, essence: 1 },
    attackText: 'швыряет рунный разряд',
  },
];

describe('buildWorldCatalog', () => {
  it('resolves biome by location range', () => {
    const catalog = buildWorldCatalog({ biomes, mobs });

    expect(catalog.findBiomeForLocationLevel(0)).toMatchObject({ code: 'tutorial' });
    expect(catalog.findBiomeForLocationLevel(5)).toMatchObject({ code: 'forest' });
  });

  it('returns null when no biome covers the level', () => {
    const catalog = buildWorldCatalog({ biomes, mobs });

    expect(catalog.findBiomeForLocationLevel(999)).toBeNull();
  });

  it('lists biomes in authored order for catalog screens', () => {
    const catalog = buildWorldCatalog({ biomes, mobs });

    expect(catalog.listBiomes().map(({ code }) => code)).toEqual(['tutorial', 'forest']);
  });

  it('keeps authored mob order inside a biome', () => {
    const catalog = buildWorldCatalog({ biomes, mobs });

    expect(catalog.listMobTemplatesForBiome('forest').map(({ code }) => code)).toEqual(['wolf', 'seer']);
  });

  it('maps typed loot tables without JSON parsing', () => {
    const catalog = buildWorldCatalog({ biomes, mobs });

    expect(catalog.listMobTemplatesForBiome('forest')[0]).toMatchObject({
      code: 'wolf',
      lootTable: { leather: 1, bone: 1 },
    });
  });
});
