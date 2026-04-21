import { describe, expect, it } from 'vitest';

import { resolveTrophyActions } from './trophy-actions';

describe('resolveTrophyActions', () => {
  it('always offers a fallback claim action', () => {
    expect(resolveTrophyActions({ kind: 'unknown' })).toEqual([
      {
        code: 'claim_all',
        label: '🎒 Забрать добычу',
        skillCodes: [],
        visibleRewardFields: [],
      },
    ]);
  });

  it.each(['wolf', 'boar'])('offers skinning for %s enemies', (kind) => {
    expect(resolveTrophyActions({ kind })).toEqual([
      {
        code: 'skin_beast',
        label: kind === 'boar' ? '🔪 Снять шкуру и рог' : '🔪 Свежевать',
        skillCodes: ['gathering.skinning'],
        visibleRewardFields: ['leather', 'bone'],
      },
      {
        code: 'claim_all',
        label: '🎒 Забрать добычу',
        skillCodes: [],
        visibleRewardFields: [],
      },
    ]);
  });

  it('offers reagent gathering for slime enemies', () => {
    expect(resolveTrophyActions({ kind: 'slime' })).toEqual([
      {
        code: 'gather_slime',
        label: '🧪 Собрать слизь',
        skillCodes: ['gathering.reagent_gathering'],
        visibleRewardFields: ['herb', 'essence'],
      },
      {
        code: 'claim_all',
        label: '🎒 Забрать добычу',
        skillCodes: [],
        visibleRewardFields: [],
      },
    ]);
  });

  it.each(['spirit', 'mage'])('offers essence extraction for %s enemies', (kind) => {
    expect(resolveTrophyActions({ kind })).toEqual([
      {
        code: 'extract_essence',
        label: kind === 'mage' ? '🔮 Разобрать фокус' : '✨ Извлечь эссенцию',
        skillCodes: ['gathering.essence_extraction'],
        visibleRewardFields: ['essence'],
      },
      {
        code: 'claim_all',
        label: '🎒 Забрать добычу',
        skillCodes: [],
        visibleRewardFields: [],
      },
    ]);
  });
});
