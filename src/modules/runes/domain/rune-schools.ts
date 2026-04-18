import { runeArchetypeSeed, schoolSeed } from '../../../content/runes';
import type { SchoolDefinition } from '../../../shared/types/game';

export interface RuneSchoolPresentation {
  readonly name: string;
  readonly schoolLine: string;
  readonly runeTitle: string;
  readonly roleName: string;
  readonly styleLine: string;
  readonly playPatternLine: string;
  readonly battleLine: string;
  readonly passiveLine: string;
}

const schoolMap = new Map<string, SchoolDefinition>(schoolSeed.map((entry) => [entry.code, entry]));
const archetypeMap = new Map(runeArchetypeSeed.map((entry) => [entry.code, entry]));

const toRuneSchoolPresentation = (
  school: SchoolDefinition,
  roleName: string,
): RuneSchoolPresentation => ({
  name: school.name,
  schoolLine: `Школа ${school.nameGenitive}`,
  runeTitle: school.nameGenitive,
  roleName,
  styleLine: school.styleLine,
  playPatternLine: school.playPatternLine,
  battleLine: school.battleLine,
  passiveLine: school.passiveLine,
});

export const listSchoolDefinitions = (): readonly SchoolDefinition[] => schoolSeed;

export const getSchoolDefinition = (code: string | null | undefined): SchoolDefinition | null => {
  if (!code) {
    return null;
  }

  return schoolMap.get(code) ?? null;
};

export const getSchoolDefinitionForArchetype = (archetypeCode: string | null | undefined): SchoolDefinition | null => {
  if (!archetypeCode) {
    return null;
  }

  const archetype = archetypeMap.get(archetypeCode);
  if (!archetype) {
    return null;
  }

  return getSchoolDefinition(archetype.schoolCode);
};

export const getRuneSchoolPresentation = (code: string | null | undefined): RuneSchoolPresentation | null => {
  if (!code) {
    return null;
  }

  const archetype = archetypeMap.get(code);
  const school = getSchoolDefinitionForArchetype(code);

  if (!archetype || !school) {
    return null;
  }

  return toRuneSchoolPresentation(school, archetype.name);
};
