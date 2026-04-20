import type { BiomeView, MobTemplateView, StatKey } from '../../shared/types/game';

type SeedBaseStatField = {
  [Key in StatKey as `base${Capitalize<Key>}`]: number;
};

type SeedScaleField = {
  [Key in StatKey as `${Key}Scale`]: number;
};

export type BiomeSeedDefinition = Omit<BiomeView, 'id'>;

export type MobTemplateSeedDefinition = Omit<MobTemplateView, 'baseStats' | 'scales'>
  & SeedBaseStatField
  & SeedScaleField;
