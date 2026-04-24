import { describe, expect, it } from 'vitest';

import type { GameRandom } from '../../../shared/domain/GameRandom';
import type { RuneDraft } from '../../../shared/types/game';

import { applyRuneArchetype, describeRuneContent } from './rune-abilities';
import { RuneFactory } from './rune-factory';
import { getRuneSchoolPresentation } from './rune-schools';

const createBaseRune = (): RuneDraft => ({
  name: 'Тестовая руна',
  rarity: 'RARE',
  isEquipped: false,
  health: 0,
  attack: 0,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
});

const createDeterministicRandom = (values: number[]): GameRandom => {
  let index = 0;

  const nextValue = (): number => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };

  return {
    nextInt(min, max) {
      const raw = nextValue();
      const range = max - min + 1;
      return min + ((raw % range) + range) % range;
    },
    rollPercentage(chancePercent) {
      return nextValue() <= chancePercent;
    },
    pickOne(items) {
      return items[this.nextInt(0, items.length - 1)]!;
    },
  };
};

describe('applyRuneArchetype', () => {
  it('подтягивает архетип и способности из контентного каталога', () => {
    const rune = applyRuneArchetype(createBaseRune(), 'ember');

    expect(rune.archetypeCode).toBe('ember');
    expect(rune.passiveAbilityCodes).toEqual(['ember_heart']);
    expect(rune.activeAbilityCodes).toEqual(['ember_pulse']);
  });
});

describe('describeRuneContent', () => {
  it('возвращает архетип и расшифровывает способности руны', () => {
    const rune = applyRuneArchetype(createBaseRune(), 'stone');
    const description = describeRuneContent(rune);

    expect(description.archetype?.name).toBe('Страж');
    expect(description.passiveAbilities.map(({ code }) => code)).toEqual(['stone_guard']);
    expect(description.activeAbilities.map(({ code }) => code)).toEqual(['stone_bastion']);
  });
});

describe('RuneFactory.create', () => {
  it('создаёт руну с привязанным архетипом и способностями из контента', () => {
    const rune = RuneFactory.create(20, 'EPIC', undefined, createDeterministicRandom([0, 1, 2, 3, 4]));
    const description = describeRuneContent(rune);
    const school = getRuneSchoolPresentation(rune.archetypeCode);

    expect(rune.archetypeCode).toBeTruthy();
    expect(rune.name).toContain(school?.runeTitle ?? description.archetype?.name ?? '');
    expect(description.passiveAbilities.length + description.activeAbilities.length).toBeGreaterThan(0);
  });

  it('сохраняет контентные поля руны при реролле стата', () => {
    const rune = applyRuneArchetype(createBaseRune(), 'echo');
    const rerolledRune = RuneFactory.rerollStat(rune, 'intelligence', 15, createDeterministicRandom([0]));

    expect(rerolledRune.archetypeCode).toBe('echo');
    expect(rerolledRune.passiveAbilityCodes).toEqual(['echo_mind']);
    expect(rerolledRune.activeAbilityCodes).toEqual([]);
  });
});
