import type {
  AbilitySeedDefinition,
  RuneArchetypeSeedDefinition,
  SchoolSeedDefinition,
} from './runes';
import type {
  BiomeSeedDefinition,
  MobTemplateSeedDefinition,
} from './world';

import { biomeSeed, mobSeed } from './world';
import { abilitySeed, runeArchetypeSeed, schoolSeed } from './runes';

export interface GameWorldContent {
  readonly biomes: readonly BiomeSeedDefinition[];
  readonly mobs: readonly MobTemplateSeedDefinition[];
}

export interface GameRuneContent {
  readonly abilities: readonly AbilitySeedDefinition[];
  readonly schools: readonly SchoolSeedDefinition[];
  readonly archetypes: readonly RuneArchetypeSeedDefinition[];
}

export interface GameContent {
  readonly world: GameWorldContent;
  readonly runes: GameRuneContent;
}

export const gameContent: GameContent = {
  world: {
    biomes: biomeSeed,
    mobs: mobSeed,
  },
  runes: {
    abilities: abilitySeed,
    schools: schoolSeed,
    archetypes: runeArchetypeSeed,
  },
};
