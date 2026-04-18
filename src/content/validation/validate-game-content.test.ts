import { describe, expect, it } from 'vitest';

import type { GameContentValidationInput } from './validate-game-content';
import { createGameContentValidationInput, validateGameContent } from './validate-game-content';

const cloneValidationInput = (): GameContentValidationInput => {
  const input = createGameContentValidationInput();

  return {
    ...input,
    biomes: input.biomes.map((biome) => ({ ...biome })),
    mobs: input.mobs.map((mob) => ({ ...mob })),
    schools: input.schools.map((school) => ({ ...school })),
    abilities: input.abilities.map((ability) => ({
      ...ability,
      tags: [...ability.tags],
    })),
    runeArchetypes: input.runeArchetypes.map((runeArchetype) => ({
      ...runeArchetype,
      passiveAbilityCodes: [...runeArchetype.passiveAbilityCodes],
      activeAbilityCodes: [...runeArchetype.activeAbilityCodes],
      preferredStats: [...runeArchetype.preferredStats],
    })),
    worldBalance: {
      ...input.worldBalance,
      adaptiveDifficulty: {
        ...input.worldBalance.adaptiveDifficulty,
      },
    },
    runeBalance: {
      ...input.runeBalance,
      profiles: {
        ...input.runeBalance.profiles,
      },
    },
    envGameConfig: {
      ...input.envGameConfig,
    },
  };
};

describe('validateGameContent', () => {
  it('принимает текущий контент проекта как валидный', () => {
    const report = validateGameContent();

    expect(report.isValid).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it('ловит дубли biome code и разрывы в покрытии мира', () => {
    const input = cloneValidationInput();
    const [firstBiome, secondBiome, ...remainingBiomes] = input.biomes;

    const report = validateGameContent({
      ...input,
      biomes: [
        {
          ...firstBiome,
          maxLevel: 0,
        },
        {
          ...secondBiome,
          code: firstBiome.code,
          minLevel: 3,
          maxLevel: secondBiome.maxLevel,
        },
        ...remainingBiomes,
      ],
    });

    expect(report.isValid).toBe(false);
    expect(report.issues.some(({ message }) => message.includes('дублирующийся biome code'))).toBe(true);
    expect(report.issues.some(({ message }) => message.includes('разрыв по уровням'))).toBe(true);
  });

  it('ловит некорректные ссылки и правила для рунного контента', () => {
    const input = cloneValidationInput();

    const report = validateGameContent({
      ...input,
      abilities: input.abilities.map((ability) => (
        ability.code === 'ember_heart'
          ? {
              ...ability,
              manaCost: 1,
            }
          : ability
      )),
      runeArchetypes: input.runeArchetypes.map((runeArchetype) => (
        runeArchetype.code === 'ember'
          ? {
              ...runeArchetype,
              activeAbilityCodes: ['missing_active_ability'],
            }
          : runeArchetype
      )),
    });

    expect(report.isValid).toBe(false);
    expect(report.issues.some(({ scope }) => scope === 'ability:ember_heart')).toBe(true);
    expect(report.issues.some(({ message }) => message.includes('missing_active_ability'))).toBe(true);
  });

  it('ловит ссылки архетипа на способности другого архетипа', () => {
    const input = cloneValidationInput();

    const report = validateGameContent({
      ...input,
      runeArchetypes: input.runeArchetypes.map((runeArchetype) => (
        runeArchetype.code === 'ember'
          ? {
              ...runeArchetype,
              passiveAbilityCodes: ['stone_guard'],
            }
          : runeArchetype
      )),
    });

    expect(report.isValid).toBe(false);
    expect(
      report.issues.some(({ scope, message }) => (
        scope === 'archetype:ember.passiveAbilityCodes'
        && message.includes('stone_guard')
        && message.includes('stone')
      )),
    ).toBe(true);
  });

  it('ловит разрыв между школой и стартовым архетипом', () => {
    const input = cloneValidationInput();

    const report = validateGameContent({
      ...input,
      schools: input.schools.map((school) => (
        school.code === 'ember'
          ? {
              ...school,
              starterArchetypeCode: 'stone',
            }
          : school
      )),
    });

    expect(report.isValid).toBe(false);
    expect(
      report.issues.some(({ scope, message }) => (
        scope === 'school:ember'
        && message.includes('stone')
        && message.includes('ember')
      )),
    ).toBe(true);
  });

  it('ловит неизвестные ссылки школы и архетипа друг на друга', () => {
    const input = cloneValidationInput();

    const report = validateGameContent({
      ...input,
      schools: input.schools.map((school) => (
        school.code === 'gale'
          ? {
              ...school,
              starterArchetypeCode: 'missing_starter_archetype',
            }
          : school
      )),
      runeArchetypes: input.runeArchetypes.map((runeArchetype) => (
        runeArchetype.code === 'echo'
          ? {
              ...runeArchetype,
              schoolCode: 'missing_school',
            }
          : runeArchetype
      )),
    });

    expect(report.isValid).toBe(false);
    expect(
      report.issues.some(({ scope, message }) => (
        scope === 'school:gale'
        && message.includes('missing_starter_archetype')
      )),
    ).toBe(true);
    expect(
      report.issues.some(({ scope, message }) => (
        scope === 'archetype:echo.schoolCode'
        && message.includes('missing_school')
      )),
    ).toBe(true);
  });
});
