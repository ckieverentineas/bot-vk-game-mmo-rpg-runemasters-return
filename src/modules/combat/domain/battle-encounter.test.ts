import { describe, expect, it } from 'vitest';

import { createBattleEncounter, resolveFleeChancePercent } from './battle-encounter';

describe('battle encounter', () => {
  it('builds an offered encounter with a dexterity-based flee chance', () => {
    const encounter = createBattleEncounter(
      { dexterity: 4 },
      { dexterity: 2, isElite: false, isBoss: false },
      'ENEMY',
    );

    expect(encounter).toEqual({
      status: 'OFFERED',
      initialTurnOwner: 'ENEMY',
      canFlee: true,
      fleeChancePercent: 59,
    });
  });

  it('applies encounter variant pacing without leaving safe flee bounds', () => {
    const encounter = createBattleEncounter(
      { dexterity: 4 },
      { dexterity: 2, isElite: false, isBoss: false },
      'PLAYER',
      {
        kind: 'AMBUSH',
        title: 'Засада',
        description: 'Враг выходит из укрытия.',
        effectLine: 'Враг начнёт первым, шанс отступить ниже: -10%.',
        fleeChanceModifierPercent: -10,
        initialTurnOwner: 'ENEMY',
      },
    );

    expect(encounter).toEqual({
      status: 'OFFERED',
      initialTurnOwner: 'ENEMY',
      canFlee: true,
      fleeChancePercent: 49,
      kind: 'AMBUSH',
      title: 'Засада',
      description: 'Враг выходит из укрытия.',
      effectLine: 'Враг начнёт первым, шанс отступить ниже: -10%.',
    });
  });

  it('penalizes elite and boss enemies without leaving safe chance bounds', () => {
    expect(resolveFleeChancePercent(
      { dexterity: 2 },
      { dexterity: 2, isElite: true, isBoss: false },
    )).toBe(35);
    expect(resolveFleeChancePercent(
      { dexterity: 2 },
      { dexterity: 2, isElite: true, isBoss: true },
    )).toBe(25);
    expect(resolveFleeChancePercent(
      { dexterity: 20 },
      { dexterity: 1, isElite: false, isBoss: false },
    )).toBe(85);
    expect(resolveFleeChancePercent(
      { dexterity: 1 },
      { dexterity: 20, isElite: false, isBoss: true },
    )).toBe(15);
  });
});
