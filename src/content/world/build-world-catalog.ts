import type { BiomeView, MobTemplateView } from '../../shared/types/game';
import type { WorldCatalog } from '../../modules/world/application/ports/WorldCatalog';

import type { BiomeSeedDefinition, MobTemplateSeedDefinition } from './types';

export interface BuildWorldCatalogInput {
  readonly biomes: readonly BiomeSeedDefinition[];
  readonly mobs: readonly MobTemplateSeedDefinition[];
}

const emptyMobTemplateList: readonly MobTemplateView[] = [];

const toBiomeView = (biome: BiomeSeedDefinition, index: number): BiomeView => ({
  id: index + 1,
  code: biome.code,
  name: biome.name,
  description: biome.description,
  minLevel: biome.minLevel,
  maxLevel: biome.maxLevel,
});

const toMobTemplateView = (mob: MobTemplateSeedDefinition): MobTemplateView => ({
  code: mob.code,
  biomeCode: mob.biomeCode,
  name: mob.name,
  kind: mob.kind,
  isElite: mob.isElite,
  isBoss: mob.isBoss,
  baseStats: {
    health: mob.baseHealth,
    attack: mob.baseAttack,
    defence: mob.baseDefence,
    magicDefence: mob.baseMagicDefence,
    dexterity: mob.baseDexterity,
    intelligence: mob.baseIntelligence,
  },
  scales: {
    health: mob.healthScale,
    attack: mob.attackScale,
    defence: mob.defenceScale,
    magicDefence: mob.magicDefenceScale,
    dexterity: mob.dexterityScale,
    intelligence: mob.intelligenceScale,
  },
  baseExperience: mob.baseExperience,
  baseGold: mob.baseGold,
  runeDropChance: mob.runeDropChance,
  lootTable: { ...mob.lootTable },
  attackText: mob.attackText,
});

export const buildWorldCatalog = ({ biomes, mobs }: BuildWorldCatalogInput): WorldCatalog => {
  const biomeViews = biomes.map(toBiomeView);
  const biomesSortedByLevel = [...biomeViews].sort((left, right) => (
    left.minLevel - right.minLevel
    || left.maxLevel - right.maxLevel
    || left.code.localeCompare(right.code)
  ));
  const mobsByBiomeCode = new Map<string, MobTemplateView[]>();

  mobs.forEach((mob) => {
    const currentTemplates = mobsByBiomeCode.get(mob.biomeCode) ?? [];
    currentTemplates.push(toMobTemplateView(mob));
    mobsByBiomeCode.set(mob.biomeCode, currentTemplates);
  });

  return {
    findBiomeForLocationLevel: (locationLevel: number): BiomeView | null => (
      biomesSortedByLevel.find((biome) => biome.minLevel <= locationLevel && biome.maxLevel >= locationLevel) ?? null
    ),
    listMobTemplatesForBiome: (biomeCode: string): readonly MobTemplateView[] => (
      mobsByBiomeCode.get(biomeCode) ?? emptyMobTemplateList
    ),
  };
};
