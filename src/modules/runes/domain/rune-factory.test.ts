import { describe, expect, it } from 'vitest';

import { RuneFactory } from './rune-factory';

describe('RuneFactory rarity rails', () => {
  it('не выдаёт редкости выше unusual на стартовых уровнях без forced rarity', () => {
    const generated = Array.from({ length: 50 }, () => RuneFactory.create(0));

    expect(generated.every((rune) => rune.rarity === 'USUAL' || rune.rarity === 'UNUSUAL')).toBe(true);
  });

  it('сохраняет forced rarity для крафта', () => {
    const rune = RuneFactory.create(0, 'EPIC');

    expect(rune.rarity).toBe('EPIC');
  });

  it('позволяет зафиксировать архетип для обучающей награды', () => {
    const rune = RuneFactory.create(1, 'UNUSUAL', 'ember');

    expect(rune.archetypeCode).toBe('ember');
    expect(rune.activeAbilityCodes).toEqual(['ember_pulse']);
  });
});
