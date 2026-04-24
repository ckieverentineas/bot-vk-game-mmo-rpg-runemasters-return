import { describe, expect, it } from 'vitest';

import type { GameRandom } from '../../../shared/domain/GameRandom';
import { RuneFactory } from './rune-factory';

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

describe('RuneFactory rarity rails', () => {
  it('не выдаёт редкости выше unusual на стартовых уровнях без forced rarity', () => {
    const generated = Array.from({ length: 50 }, () => RuneFactory.create(0, undefined, undefined, createDeterministicRandom([0])));

    expect(generated.every((rune) => rune.rarity === 'USUAL' || rune.rarity === 'UNUSUAL')).toBe(true);
  });

  it('сохраняет forced rarity для крафта', () => {
    const rune = RuneFactory.create(0, 'EPIC', undefined, createDeterministicRandom([0]));

    expect(rune.rarity).toBe('EPIC');
  });

  it('позволяет зафиксировать архетип для обучающей награды', () => {
    const rune = RuneFactory.create(1, 'UNUSUAL', 'ember', createDeterministicRandom([0]));

    expect(rune.archetypeCode).toBe('ember');
    expect(rune.name).toBe('Необычная руна Пламени');
    expect(rune.activeAbilityCodes).toEqual(['ember_pulse']);
  });

  it('создаёт детерминированную руну при явном RNG port', () => {
    const rune = RuneFactory.create(20, 'EPIC', undefined, createDeterministicRandom([2, 1, 3, 4, 5]));

    expect(rune.rarity).toBe('EPIC');
    expect(rune.archetypeCode).toBeTruthy();
    expect(rune.name).toContain('руна');
    expect(rune.attack + rune.health + rune.defence + rune.magicDefence + rune.dexterity + rune.intelligence).toBeGreaterThan(0);
  });

  it('делает реролл стата детерминированным при явном RNG port', () => {
    const baseRune = RuneFactory.create(1, 'UNUSUAL', 'ember', createDeterministicRandom([0, 0]));
    const rerolled = RuneFactory.rerollStat(baseRune, 'attack', 15, createDeterministicRandom([2]));

    expect(rerolled.attack).toBe(3);
  });
});
