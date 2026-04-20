import type { AbilityDefinition, RuneArchetypeDefinition, SchoolDefinition } from '../../../shared/types/game';
import { gameContent } from '../../../content/game-content';

const createLookupByCode = <T extends { code: string }>(items: readonly T[]): ReadonlyMap<string, T> => (
  new Map(items.map((entry) => [entry.code, entry]))
);

const runeArchetypes = gameContent.runes.archetypes;
const abilities = gameContent.runes.abilities;
const schools = gameContent.runes.schools;

const archetypeByCode = createLookupByCode(runeArchetypes);
const abilityByCode = createLookupByCode(abilities);
const schoolByCode = createLookupByCode(schools);

export const listRuneArchetypes = (): readonly RuneArchetypeDefinition[] => runeArchetypes;

export const getRuneArchetypeByCode = (code: string): RuneArchetypeDefinition | null => (
  archetypeByCode.get(code) ?? null
);

export const listAbilities = (): readonly AbilityDefinition[] => abilities;

export const getAbilityByCode = (code: string): AbilityDefinition | null => (
  abilityByCode.get(code) ?? null
);

export const listSchoolDefinitions = (): readonly SchoolDefinition[] => schools;

export const getSchoolDefinitionByCode = (code: string): SchoolDefinition | null => (
  schoolByCode.get(code) ?? null
);

