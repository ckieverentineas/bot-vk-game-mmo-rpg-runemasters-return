import { AppError } from '../../../shared/domain/AppError';
import type { AbilityDefinition, RuneArchetypeDefinition, RuneDraft } from '../../../shared/types/game';
import {
  getAbilityByCode,
  getRuneArchetypeByCode,
  listRuneArchetypes as listRuneArchetypesFromRegistry,
} from './rune-content-registry';

type RuneAbilityCarrier = Pick<RuneDraft, 'archetypeCode' | 'activeAbilityCodes' | 'passiveAbilityCodes'>;

export interface RuneContentDescription {
  readonly archetype: RuneArchetypeDefinition | null;
  readonly passiveAbilities: readonly AbilityDefinition[];
  readonly activeAbilities: readonly AbilityDefinition[];
}

const maybeGetRuneArchetype = (code: string | null | undefined): RuneArchetypeDefinition | null => (
  code ? getRuneArchetypeByCode(code) : null
);

const listAbilityDefinitions = (codes: readonly string[] | undefined): AbilityDefinition[] => (
  (codes ?? []).flatMap((code) => {
    const ability = getAbilityByCode(code);
    return ability ? [ability] : [];
  })
);

export const listRuneArchetypes = (): readonly RuneArchetypeDefinition[] => listRuneArchetypesFromRegistry();

export const getRuneArchetype = (code: string): RuneArchetypeDefinition => {
  const archetype = getRuneArchetypeByCode(code);
  if (!archetype) {
    throw new AppError('rune_archetype_not_found', `Архетип ${code} не найден.`);
  }

  return archetype;
};

export const getAbilityDefinition = (code: string): AbilityDefinition => {
  const ability = getAbilityByCode(code);
  if (!ability) {
    throw new AppError('rune_ability_not_found', `Способность ${code} не найдена.`);
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
