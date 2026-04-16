import { abilitySeed, runeArchetypeSeed } from '../../../content/runes';
import { AppError } from '../../../shared/domain/AppError';
import type { AbilityDefinition, RuneArchetypeDefinition, RuneDraft } from '../../../shared/types/game';

type RuneAbilityCarrier = Pick<RuneDraft, 'archetypeCode' | 'activeAbilityCodes' | 'passiveAbilityCodes'>;

export interface RuneContentDescription {
  readonly archetype: RuneArchetypeDefinition | null;
  readonly passiveAbilities: readonly AbilityDefinition[];
  readonly activeAbilities: readonly AbilityDefinition[];
}

const archetypeMap = new Map<string, RuneArchetypeDefinition>(runeArchetypeSeed.map((entry) => [entry.code, entry]));
const abilityMap = new Map<string, AbilityDefinition>(abilitySeed.map((entry) => [entry.code, entry]));

const maybeGetRuneArchetype = (code: string | null | undefined): RuneArchetypeDefinition | null => {
  if (!code) {
    return null;
  }

  return archetypeMap.get(code) ?? null;
};

const listAbilityDefinitions = (codes: readonly string[] | undefined): AbilityDefinition[] => (
  (codes ?? []).flatMap((code) => {
    const ability = abilityMap.get(code);
    return ability ? [ability] : [];
  })
);

export const listRuneArchetypes = (): readonly RuneArchetypeDefinition[] => runeArchetypeSeed;

export const getRuneArchetype = (code: string): RuneArchetypeDefinition => {
  const archetype = archetypeMap.get(code);
  if (!archetype) {
    throw new AppError('rune_archetype_not_found', `Рунный архетип ${code} не найден.`);
  }

  return archetype;
};

export const getAbilityDefinition = (code: string): AbilityDefinition => {
  const ability = abilityMap.get(code);
  if (!ability) {
    throw new AppError('rune_ability_not_found', `Рунная способность ${code} не найдена.`);
  }

  return ability;
};

export const applyRuneArchetype = (rune: RuneDraft, archetypeCode: string): RuneDraft => {
  const archetype = getRuneArchetype(archetypeCode);

  return {
    ...rune,
    archetypeCode: archetype.code,
    passiveAbilityCodes: [...archetype.passiveAbilityCodes],
    activeAbilityCodes: [...archetype.activeAbilityCodes],
  };
};

export const describeRuneContent = (rune: RuneAbilityCarrier): RuneContentDescription => ({
  archetype: maybeGetRuneArchetype(rune.archetypeCode),
  passiveAbilities: listAbilityDefinitions(rune.passiveAbilityCodes),
  activeAbilities: listAbilityDefinitions(rune.activeAbilityCodes),
});

export const listRuneAbilities = (rune: Pick<RuneDraft, 'activeAbilityCodes' | 'passiveAbilityCodes'>): AbilityDefinition[] => {
  const codes = [...(rune.passiveAbilityCodes ?? []), ...(rune.activeAbilityCodes ?? [])];
  return codes.map((code) => getAbilityDefinition(code));
};
