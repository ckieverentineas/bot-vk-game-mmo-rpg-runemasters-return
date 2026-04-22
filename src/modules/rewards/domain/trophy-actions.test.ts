import { describe, expect, it } from 'vitest';

import { resolveTrophyActionReward, resolveTrophyActions } from './trophy-actions';

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

  it('models fallback collection as ordinary material loot without skill progress', () => {
    const [claimAll] = resolveTrophyActions({ kind: 'unknown' });

    expect(resolveTrophyActionReward({
      kind: 'unknown',
      isElite: false,
      isBoss: false,
      lootTable: {
        leather: 2,
        bone: 1,
      },
    }, claimAll!)).toEqual({
      actionCode: 'claim_all',
      inventoryDelta: {
        leather: 2,
        bone: 1,
      },
      skillPoints: [],
    });
  });

  it('models skinning as beast material loot and skinning skill progress', () => {
    const [skinning] = resolveTrophyActions({ kind: 'wolf' });

    expect(resolveTrophyActionReward({
      kind: 'wolf',
      isElite: true,
      isBoss: false,
      lootTable: {
        leather: 2,
        bone: 1,
        herb: 3,
      },
    }, skinning!)).toEqual({
      actionCode: 'skin_beast',
      inventoryDelta: {
        leather: 2,
        bone: 1,
      },
      skillPoints: [
        {
          skillCode: 'gathering.skinning',
          points: 2,
        },
      ],
    });
  });

  it('adds a boar skinning reward variation for preserved horn and bone', () => {
    const [skinning] = resolveTrophyActions({ kind: 'boar' });

    expect(resolveTrophyActionReward({
      kind: 'boar',
      isElite: false,
      isBoss: false,
      lootTable: {
        leather: 1,
        bone: 1,
        herb: 2,
      },
    }, skinning!)).toEqual({
      actionCode: 'skin_beast',
      inventoryDelta: {
        leather: 1,
        bone: 2,
      },
      skillPoints: [
        {
          skillCode: 'gathering.skinning',
          points: 1,
        },
      ],
    });
  });

  it('models slime gathering as reagent loot only when the enemy can drop it', () => {
    const [gatherSlime] = resolveTrophyActions({ kind: 'slime' });

    expect(resolveTrophyActionReward({
      kind: 'slime',
      isElite: false,
      isBoss: false,
      lootTable: {
        herb: 1,
        leather: 1,
      },
    }, gatherSlime!)).toEqual({
      actionCode: 'gather_slime',
      inventoryDelta: {
        herb: 1,
      },
      skillPoints: [
        {
          skillCode: 'gathering.reagent_gathering',
          points: 1,
        },
      ],
    });
  });

  it('adds a slime reagent reward variation when the core has essence', () => {
    const [gatherSlime] = resolveTrophyActions({ kind: 'slime' });

    expect(resolveTrophyActionReward({
      kind: 'slime',
      isElite: false,
      isBoss: false,
      lootTable: {
        herb: 1,
        essence: 1,
        leather: 1,
      },
    }, gatherSlime!)).toEqual({
      actionCode: 'gather_slime',
      inventoryDelta: {
        herb: 2,
        essence: 1,
      },
      skillPoints: [
        {
          skillCode: 'gathering.reagent_gathering',
          points: 1,
        },
      ],
    });
  });

  it('adds a mage focus reward variation for stable crystal traces', () => {
    const [extractEssence] = resolveTrophyActions({ kind: 'mage' });

    expect(resolveTrophyActionReward({
      kind: 'mage',
      isElite: false,
      isBoss: false,
      lootTable: {
        essence: 1,
        crystal: 1,
        metal: 2,
      },
    }, extractEssence!)).toEqual({
      actionCode: 'extract_essence',
      inventoryDelta: {
        essence: 1,
        crystal: 1,
      },
      skillPoints: [
        {
          skillCode: 'gathering.essence_extraction',
          points: 1,
        },
      ],
    });
  });

  it('models boss trophy actions with stronger skill point rewards', () => {
    const [extractEssence] = resolveTrophyActions({ kind: 'spirit' });

    expect(resolveTrophyActionReward({
      kind: 'spirit',
      isElite: true,
      isBoss: true,
      lootTable: {
        essence: 2,
        crystal: 1,
        metal: 3,
      },
    }, extractEssence!)).toEqual({
      actionCode: 'extract_essence',
      inventoryDelta: {
        essence: 2,
      },
      skillPoints: [
        {
          skillCode: 'gathering.essence_extraction',
          points: 4,
        },
      ],
    });
  });
});
