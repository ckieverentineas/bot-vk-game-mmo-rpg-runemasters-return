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

  it('unlocks careful skinning for wolf enemies at the skinning threshold', () => {
    expect(resolveTrophyActions({
      kind: 'wolf',
      skillExperiences: {
        'gathering.skinning': 10,
      },
    })).toEqual([
      {
        code: 'skin_beast',
        label: '🔪 Свежевать',
        skillCodes: ['gathering.skinning'],
        visibleRewardFields: ['leather', 'bone'],
      },
      {
        code: 'careful_skinning',
        label: '🔪 Аккуратно снять шкуру',
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

  it('keeps careful skinning locked below the skinning threshold', () => {
    expect(resolveTrophyActions({
      kind: 'wolf',
      skillExperiences: {
        'gathering.skinning': 9,
      },
    }).map((action) => action.code)).toEqual([
      'skin_beast',
      'claim_all',
    ]);
  });

  it('unlocks refined slime gathering at the reagent threshold', () => {
    expect(resolveTrophyActions({
      kind: 'slime',
      skillExperiences: {
        'gathering.reagent_gathering': 10,
      },
    })).toEqual([
      {
        code: 'gather_slime',
        label: '🧪 Собрать слизь',
        skillCodes: ['gathering.reagent_gathering'],
        visibleRewardFields: ['herb', 'essence'],
      },
      {
        code: 'refine_slime_core',
        label: '🧪 Отделить чистый реагент',
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

  it.each(['spirit', 'mage'])('unlocks stabilized essence for %s enemies at the essence threshold', (kind) => {
    expect(resolveTrophyActions({
      kind,
      skillExperiences: {
        'gathering.essence_extraction': 10,
      },
    }).map((action) => action.code)).toEqual([
      'extract_essence',
      'stabilize_essence',
      'claim_all',
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

  it.each([
    [
      'knight',
      {
        code: 'salvage_armor',
        label: '⚒️ Разобрать доспех',
        skillCodes: ['gathering.reagent_gathering'],
        visibleRewardFields: ['metal', 'crystal', 'leather'],
      },
    ],
    [
      'goblin',
      {
        code: 'strip_goblin_gear',
        label: '🧰 Разобрать трофейное снаряжение',
        skillCodes: ['gathering.reagent_gathering'],
        visibleRewardFields: ['bone', 'metal', 'crystal'],
      },
    ],
    [
      'troll',
      {
        code: 'crack_troll_growths',
        label: '⛏️ Сколоть пещерные наросты',
        skillCodes: ['gathering.reagent_gathering'],
        visibleRewardFields: ['bone', 'metal', 'crystal'],
      },
    ],
    [
      'lich',
      {
        code: 'unmake_phylactery',
        label: '☠️ Рассеять филактерию',
        skillCodes: ['gathering.essence_extraction'],
        visibleRewardFields: ['essence', 'crystal'],
      },
    ],
    [
      'demon',
      {
        code: 'bind_abyss_ichor',
        label: '🜏 Сковать бездновую искру',
        skillCodes: ['gathering.essence_extraction'],
        visibleRewardFields: ['essence', 'crystal'],
      },
    ],
    [
      'dragon',
      {
        code: 'harvest_dragon_scale',
        label: '🐉 Снять драконью чешую',
        skillCodes: ['gathering.skinning'],
        visibleRewardFields: ['crystal', 'metal'],
      },
    ],
  ] as const)('offers a trophy action for %s enemies', (kind, action) => {
    expect(resolveTrophyActions({ kind })).toEqual([
      action,
      {
        code: 'claim_all',
        label: '🎒 Забрать добычу',
        skillCodes: [],
        visibleRewardFields: [],
      },
    ]);
  });

  it('offers an ember hidden trophy action for the ash seer when ember is equipped', () => {
    expect(resolveTrophyActions({
      kind: 'mage',
      code: 'ash-seer',
      equippedSchoolCode: 'ember',
    })).toEqual([
      {
        code: 'draw_ember_sign',
        label: '🔥 Вытянуть знак Пламени',
        skillCodes: ['gathering.essence_extraction'],
        visibleRewardFields: ['essence'],
      },
      {
        code: 'extract_essence',
        label: '🔮 Разобрать фокус',
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

  it('keeps the ember hidden trophy action locked without the ember school', () => {
    expect(resolveTrophyActions({
      kind: 'mage',
      code: 'ash-seer',
      equippedSchoolCode: 'stone',
    }).map((action) => action.code)).toEqual([
      'extract_essence',
      'claim_all',
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

  it('adds a careful skinning reward variation for preserved hide', () => {
    const carefulSkinning = resolveTrophyActions({
      kind: 'wolf',
      skillExperiences: {
        'gathering.skinning': 10,
      },
    }).find((action) => action.code === 'careful_skinning');

    expect(resolveTrophyActionReward({
      kind: 'wolf',
      isElite: false,
      isBoss: false,
      lootTable: {
        leather: 2,
        bone: 1,
      },
    }, carefulSkinning!)).toEqual({
      actionCode: 'careful_skinning',
      inventoryDelta: {
        leather: 3,
        bone: 1,
      },
      skillPoints: [
        {
          skillCode: 'gathering.skinning',
          points: 1,
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

  it('adds a refined slime reward variation after the reagent threshold', () => {
    const refinedSlimeCore = resolveTrophyActions({
      kind: 'slime',
      skillExperiences: {
        'gathering.reagent_gathering': 10,
      },
    }).find((action) => action.code === 'refine_slime_core');

    expect(resolveTrophyActionReward({
      kind: 'slime',
      isElite: false,
      isBoss: false,
      lootTable: {
        herb: 1,
        essence: 1,
        leather: 1,
      },
    }, refinedSlimeCore!)).toEqual({
      actionCode: 'refine_slime_core',
      inventoryDelta: {
        herb: 1,
        essence: 2,
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

  it('adds a stabilized essence reward variation after the essence threshold', () => {
    const stabilizedEssence = resolveTrophyActions({
      kind: 'spirit',
      skillExperiences: {
        'gathering.essence_extraction': 10,
      },
    }).find((action) => action.code === 'stabilize_essence');

    expect(resolveTrophyActionReward({
      kind: 'spirit',
      isElite: false,
      isBoss: false,
      lootTable: {
        essence: 2,
        crystal: 1,
        metal: 2,
      },
    }, stabilizedEssence!)).toEqual({
      actionCode: 'stabilize_essence',
      inventoryDelta: {
        essence: 3,
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

  it.each([
    [
      'knight',
      'salvage_armor',
      {
        metal: 2,
        crystal: 2,
        leather: 1,
      },
      'gathering.reagent_gathering',
    ],
    [
      'goblin',
      'strip_goblin_gear',
      {
        bone: 2,
        metal: 2,
        crystal: 2,
      },
      'gathering.reagent_gathering',
    ],
    [
      'troll',
      'crack_troll_growths',
      {
        bone: 2,
        metal: 2,
        crystal: 2,
      },
      'gathering.reagent_gathering',
    ],
    [
      'lich',
      'unmake_phylactery',
      {
        essence: 3,
        crystal: 2,
      },
      'gathering.essence_extraction',
    ],
    [
      'demon',
      'bind_abyss_ichor',
      {
        essence: 3,
        crystal: 2,
      },
      'gathering.essence_extraction',
    ],
    [
      'dragon',
      'harvest_dragon_scale',
      {
        crystal: 2,
        metal: 2,
      },
      'gathering.skinning',
    ],
  ] as const)('models the %s trophy action as skill-bearing loot', (
    kind,
    actionCode,
    expectedInventoryDelta,
    skillCode,
  ) => {
    const action = resolveTrophyActions({ kind }).find((candidate) => candidate.code === actionCode);

    expect(resolveTrophyActionReward({
      kind,
      isElite: true,
      isBoss: false,
      lootTable: {
        leather: 1,
        bone: 2,
        herb: 1,
        essence: 3,
        metal: 2,
        crystal: 2,
      },
    }, action!)).toEqual({
      actionCode,
      inventoryDelta: expectedInventoryDelta,
      skillPoints: [
        {
          skillCode,
          points: 2,
        },
      ],
    });
  });

  it('resolves the ember hidden trophy reward before the pending snapshot is persisted', () => {
    const [drawEmberSign] = resolveTrophyActions({
      kind: 'mage',
      code: 'ash-seer',
      equippedSchoolCode: 'ember',
    });

    expect(resolveTrophyActionReward({
      kind: 'mage',
      code: 'ash-seer',
      equippedSchoolCode: 'ember',
      isElite: true,
      isBoss: false,
      lootTable: {
        herb: 2,
        essence: 1,
      },
    }, drawEmberSign!)).toEqual({
      actionCode: 'draw_ember_sign',
      inventoryDelta: {
        essence: 2,
      },
      skillPoints: [
        {
          skillCode: 'gathering.essence_extraction',
          points: 2,
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
