import type { BiomeView, MobTemplateView } from '../../../../shared/types/game';

export interface WorldCatalog {
  listBiomes(): readonly BiomeView[];
  findBiomeForLocationLevel(locationLevel: number): BiomeView | null;
  listMobTemplatesForBiome(biomeCode: string): readonly MobTemplateView[];
}
