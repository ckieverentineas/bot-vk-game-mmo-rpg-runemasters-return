import { describe, expect, it } from 'vitest';

import {
  enemySupportsGuardBreak,
  enemySupportsHeavyStrike,
  resolveEnemyTacticalProfile,
} from './enemy-tactical-profile';

describe('enemy tactical profile', () => {
  it('models guard-break enemies as attack or rune targets', () => {
    const profile = resolveEnemyTacticalProfile({
      kind: 'slime',
      isElite: false,
      isBoss: false,
    });

    expect(enemySupportsGuardBreak({
      kind: 'slime',
      isElite: false,
      isBoss: false,
    })).toBe(true);
    expect(profile.code).toBe('GUARD_BREAK');
    expect(profile.habitLine).toContain('пробивающий удар');
    expect(profile.answerLine).toContain('атакой или готовой руной');
  });

  it('models heavy-strike enemies as guard or rune targets', () => {
    const profile = resolveEnemyTacticalProfile({
      kind: 'wolf',
      isElite: false,
      isBoss: false,
    });

    expect(enemySupportsHeavyStrike({
      kind: 'wolf',
      isElite: false,
      isBoss: false,
    })).toBe(true);
    expect(profile.code).toBe('HEAVY_STRIKE');
    expect(profile.habitLine).toContain('тяжёлый удар');
    expect(profile.answerLine).toContain('защитой');
  });

  it('keeps enemies without a signature intent as basic pressure', () => {
    const profile = resolveEnemyTacticalProfile({
      kind: 'spirit',
      isElite: false,
      isBoss: false,
    });

    expect(profile).toMatchObject({
      code: 'BASIC_PRESSURE',
      habitLine: 'особого телеграфа нет: давит обычными ударами',
    });
  });
});
