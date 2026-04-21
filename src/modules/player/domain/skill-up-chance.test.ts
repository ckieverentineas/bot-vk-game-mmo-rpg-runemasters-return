import { describe, expect, it } from 'vitest';

import { resolveSkillUpChancePercent } from './skill-up-chance';

describe('resolveSkillUpChancePercent', () => {
  it('gives a high chance to a new skill after a valid action', () => {
    expect(resolveSkillUpChancePercent({
      currentSkillPoints: 0,
      actionPoints: 1,
    })).toBe(95);
  });

  it('does not create a roll for actions without skill points', () => {
    expect(resolveSkillUpChancePercent({
      currentSkillPoints: 0,
      actionPoints: 0,
    })).toBe(0);
  });

  it('lowers the chance as the current skill grows', () => {
    const earlyChance = resolveSkillUpChancePercent({
      currentSkillPoints: 100,
      actionPoints: 1,
    });
    const veteranChance = resolveSkillUpChancePercent({
      currentSkillPoints: 500,
      actionPoints: 1,
    });

    expect(earlyChance).toBe(85);
    expect(veteranChance).toBe(45);
    expect(veteranChance).toBeLessThan(earlyChance);
  });

  it('lets stronger actions keep a better chance at the same skill level', () => {
    const ordinaryActionChance = resolveSkillUpChancePercent({
      currentSkillPoints: 500,
      actionPoints: 1,
    });
    const bossActionChance = resolveSkillUpChancePercent({
      currentSkillPoints: 500,
      actionPoints: 4,
    });

    expect(ordinaryActionChance).toBe(45);
    expect(bossActionChance).toBe(60);
  });

  it('keeps very high skills inside the minimum chance floor', () => {
    expect(resolveSkillUpChancePercent({
      currentSkillPoints: 10_000,
      actionPoints: 1,
    })).toBe(5);
  });
});
