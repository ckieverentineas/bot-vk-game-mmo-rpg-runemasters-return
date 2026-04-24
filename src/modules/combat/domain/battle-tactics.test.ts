import { describe, expect, it } from 'vitest';

import { resolvePlayerSignatureReactionChancePercent } from './battle-tactics';

describe('battle tactics', () => {
  it('counts dexterity and battle reading when reacting to a signature move', () => {
    const chancePercent = resolvePlayerSignatureReactionChancePercent(
      { dexterity: 4, intelligence: 3 },
      { dexterity: 2, intelligence: 1, isElite: false, isBoss: false },
    );

    expect(chancePercent).toBe(74);
  });

  it('keeps signature reaction chance inside readable battle bounds', () => {
    const weakPlayerChance = resolvePlayerSignatureReactionChancePercent(
      { dexterity: 0, intelligence: 0 },
      { dexterity: 10, intelligence: 10, isElite: false, isBoss: true },
    );
    const sharpPlayerChance = resolvePlayerSignatureReactionChancePercent(
      { dexterity: 20, intelligence: 20 },
      { dexterity: 0, intelligence: 0, isElite: false, isBoss: false },
    );

    expect(weakPlayerChance).toBe(15);
    expect(sharpPlayerChance).toBe(85);
  });
});
