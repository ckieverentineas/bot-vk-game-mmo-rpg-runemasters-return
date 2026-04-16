import { describe, expect, it } from 'vitest';

import type { RuneDraft } from '../../../shared/types/game';

import { applyRuneArchetype, describeRuneContent } from './rune-abilities';
import { RuneFactory } from './rune-factory';

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

    expect(description.archetype?.name).toBe('Камень');
    expect(description.passiveAbilities.map(({ code }) => code)).toEqual(['stone_guard']);
    expect(description.activeAbilities).toEqual([]);
  });
});

describe('RuneFactory.create', () => {
  it('создаёт руну с привязанным архетипом и способностями из контента', () => {
    const rune = RuneFactory.create(20, 'EPIC');
    const description = describeRuneContent(rune);

    expect(rune.archetypeCode).toBeTruthy();
    expect(rune.name).toContain(description.archetype?.name ?? '');
    expect(description.passiveAbilities.length + description.activeAbilities.length).toBeGreaterThan(0);
  });

  it('сохраняет контентные поля руны при реролле стата', () => {
    const rune = applyRuneArchetype(createBaseRune(), 'echo');
    const rerolledRune = RuneFactory.rerollStat(rune, 'intelligence', 15);

    expect(rerolledRune.archetypeCode).toBe('echo');
    expect(rerolledRune.passiveAbilityCodes).toEqual(['echo_mind']);
    expect(rerolledRune.activeAbilityCodes).toEqual([]);
  });
});
