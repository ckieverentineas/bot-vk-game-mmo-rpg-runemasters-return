import { describe, expect, it } from 'vitest';

import type { RewardIntent } from '../../shared/domain/contracts/reward-intent';
import type { TrophyActionDefinition } from './trophy-actions';
import { createPendingRewardSnapshot, isPendingRewardSnapshot } from './pending-reward-snapshot';

const createRewardIntent = (): RewardIntent => ({
  schemaVersion: 1,
  intentId: 'battle-victory:battle-1',
  sourceType: 'BATTLE_VICTORY',
  sourceId: 'battle-1',
  playerId: 7,
  payload: {
    experience: 14,
    gold: 5,
    shards: {
      USUAL: 2,
    },
    droppedRune: null,
  },
});

const trophyActions: readonly TrophyActionDefinition[] = [
  {
    code: 'skin_beast',
    label: 'Skin beast',
    skillCodes: ['gathering.skinning'],
    visibleRewardFields: ['leather', 'bone'],
  },
  {
    code: 'claim_all',
    label: 'Claim all',
    skillCodes: [],
    visibleRewardFields: [],
  },
];

const emberHiddenTrophyActions: readonly TrophyActionDefinition[] = [
  {
    code: 'draw_ember_sign',
    label: '🔥 Вытянуть знак Пламени',
    skillCodes: ['gathering.essence_extraction'],
    visibleRewardFields: ['essence'],
  },
  {
    code: 'claim_all',
    label: '🎒 Забрать добычу',
    skillCodes: [],
    visibleRewardFields: [],
  },
];

const thresholdTrophyActions: readonly TrophyActionDefinition[] = [
  {
    code: 'careful_skinning',
    label: '🔪 Аккуратно снять шкуру',
    skillCodes: ['gathering.skinning'],
    visibleRewardFields: ['leather', 'bone'],
  },
  {
    code: 'claim_all',
    label: 'Claim all',
    skillCodes: [],
    visibleRewardFields: [],
  },
];

const expandedTrophyActions: readonly TrophyActionDefinition[] = [
  {
    code: 'break_stone_seal',
    label: '🧱 Выбить печать Тверди',
    skillCodes: ['gathering.reagent_gathering'],
    visibleRewardFields: ['bone', 'metal'],
  },
  {
    code: 'catch_gale_trace',
    label: '🌪️ Перехватить шквальный след',
    skillCodes: ['gathering.essence_extraction'],
    visibleRewardFields: ['herb', 'essence'],
  },
  {
    code: 'read_omen_mark',
    label: '🔮 Считать предзнаменование',
    skillCodes: ['gathering.essence_extraction'],
    visibleRewardFields: ['herb', 'essence'],
  },
  {
    code: 'refine_slime_core',
    label: '🧪 Отделить чистый реагент',
    skillCodes: ['gathering.reagent_gathering'],
    visibleRewardFields: ['herb', 'essence'],
  },
  {
    code: 'stabilize_essence',
    label: '✨ Стабилизировать эссенцию',
    skillCodes: ['gathering.essence_extraction'],
    visibleRewardFields: ['essence', 'crystal'],
  },
  {
    code: 'salvage_armor',
    label: '⚒️ Разобрать доспех',
    skillCodes: ['gathering.reagent_gathering'],
    visibleRewardFields: ['metal', 'crystal', 'leather'],
  },
  {
    code: 'strip_goblin_gear',
    label: '🧰 Разобрать трофейное снаряжение',
    skillCodes: ['gathering.reagent_gathering'],
    visibleRewardFields: ['bone', 'metal', 'crystal'],
  },
  {
    code: 'crack_troll_growths',
    label: '⛏️ Сколоть пещерные наросты',
    skillCodes: ['gathering.reagent_gathering'],
    visibleRewardFields: ['bone', 'metal', 'crystal'],
  },
  {
    code: 'unmake_phylactery',
    label: '☠️ Рассеять филактерию',
    skillCodes: ['gathering.essence_extraction'],
    visibleRewardFields: ['essence', 'crystal'],
  },
  {
    code: 'bind_abyss_ichor',
    label: '🜏 Сковать бездновую искру',
    skillCodes: ['gathering.essence_extraction'],
    visibleRewardFields: ['essence', 'crystal'],
  },
  {
    code: 'harvest_dragon_scale',
    label: '🐉 Снять драконью чешую',
    skillCodes: ['gathering.skinning'],
    visibleRewardFields: ['crystal', 'metal'],
  },
];

describe('pending reward snapshots', () => {
  it('creates a versioned pending snapshot from a reward intent and trophy actions', () => {
    const snapshot = createPendingRewardSnapshot(
      createRewardIntent(),
      trophyActions,
      '2026-04-22T00:00:00.000Z',
    );

    expect(snapshot).toEqual({
      schemaVersion: 1,
      intentId: 'battle-victory:battle-1',
      sourceType: 'BATTLE_VICTORY',
      sourceId: 'battle-1',
      playerId: 7,
      status: 'PENDING',
      baseReward: {
        experience: 14,
        gold: 5,
        shards: {
          USUAL: 2,
        },
        droppedRune: null,
      },
      trophyActions: [
        {
          code: 'skin_beast',
          label: 'Skin beast',
          skillCodes: ['gathering.skinning'],
          visibleRewardFields: ['leather', 'bone'],
        },
        {
          code: 'claim_all',
          label: 'Claim all',
          skillCodes: [],
          visibleRewardFields: [],
        },
      ],
      selectedActionCode: null,
      appliedResult: null,
      createdAt: '2026-04-22T00:00:00.000Z',
    });
    expect(isPendingRewardSnapshot(snapshot)).toBe(true);
  });

  it('captures resolved trophy action rewards in the pending snapshot', () => {
    const snapshot = createPendingRewardSnapshot(
      createRewardIntent(),
      trophyActions,
      '2026-04-22T00:00:00.000Z',
      [
        {
          actionCode: 'claim_all',
          inventoryDelta: {
            leather: 2,
            bone: 1,
          },
          skillPoints: [],
        },
      ],
    );

    expect(snapshot.trophyActions).toEqual([
      {
        code: 'skin_beast',
        label: 'Skin beast',
        skillCodes: ['gathering.skinning'],
        visibleRewardFields: ['leather', 'bone'],
      },
      {
        code: 'claim_all',
        label: 'Claim all',
        skillCodes: [],
        visibleRewardFields: [],
        reward: {
          inventoryDelta: {
            leather: 2,
            bone: 1,
          },
          skillPoints: [],
        },
      },
    ]);
    expect(isPendingRewardSnapshot(snapshot)).toBe(true);
  });

  it('accepts trophy action availability in canonical pending snapshot data', () => {
    const snapshot = createPendingRewardSnapshot(
      createRewardIntent(),
      trophyActions,
      '2026-04-22T00:00:00.000Z',
    );

    const snapshotWithAvailability = {
      ...snapshot,
      trophyActions: snapshot.trophyActions.map((action) => (
        action.code === 'skin_beast'
          ? {
              ...action,
              availability: {
                available: false,
                reasonCode: 'missing_workshop_tool',
                requiredWorkshopItemCodes: ['skinning_kit'],
              },
            }
          : action
      )),
    };

    expect(isPendingRewardSnapshot(snapshotWithAvailability)).toBe(true);
  });

  it('accepts ember hidden trophy rewards as canonical pending snapshot data', () => {
    const snapshot = createPendingRewardSnapshot(
      createRewardIntent(),
      emberHiddenTrophyActions,
      '2026-04-22T00:00:00.000Z',
      [
        {
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
        },
      ],
    );

    expect(snapshot.trophyActions).toEqual([
      {
        code: 'draw_ember_sign',
        label: '🔥 Вытянуть знак Пламени',
        skillCodes: ['gathering.essence_extraction'],
        visibleRewardFields: ['essence'],
        reward: {
          inventoryDelta: {
            essence: 2,
          },
          skillPoints: [
            {
              skillCode: 'gathering.essence_extraction',
              points: 2,
            },
          ],
        },
      },
      {
        code: 'claim_all',
        label: '🎒 Забрать добычу',
        skillCodes: [],
        visibleRewardFields: [],
      },
    ]);
    expect(isPendingRewardSnapshot(snapshot)).toBe(true);
  });

  it('accepts skill-threshold trophy rewards as canonical pending snapshot data', () => {
    const snapshot = createPendingRewardSnapshot(
      createRewardIntent(),
      thresholdTrophyActions,
      '2026-04-22T00:00:00.000Z',
      [
        {
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
        },
      ],
    );

    expect(snapshot.trophyActions).toEqual([
      {
        code: 'careful_skinning',
        label: '🔪 Аккуратно снять шкуру',
        skillCodes: ['gathering.skinning'],
        visibleRewardFields: ['leather', 'bone'],
        reward: {
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
        },
      },
      {
        code: 'claim_all',
        label: 'Claim all',
        skillCodes: [],
        visibleRewardFields: [],
      },
    ]);
    expect(isPendingRewardSnapshot(snapshot)).toBe(true);
  });

  it('accepts expanded action progression codes as canonical snapshot data', () => {
    const snapshot = createPendingRewardSnapshot(
      createRewardIntent(),
      expandedTrophyActions,
      '2026-04-22T00:00:00.000Z',
    );

    expect(snapshot.trophyActions.map((action) => action.code)).toEqual([
      'break_stone_seal',
      'catch_gale_trace',
      'read_omen_mark',
      'refine_slime_core',
      'stabilize_essence',
      'salvage_armor',
      'strip_goblin_gear',
      'crack_troll_growths',
      'unmake_phylactery',
      'bind_abyss_ichor',
      'harvest_dragon_scale',
    ]);
    expect(isPendingRewardSnapshot(snapshot)).toBe(true);
  });

  it('accepts applied snapshots with the canonical selected action result', () => {
    const snapshot = {
      ...createPendingRewardSnapshot(createRewardIntent(), trophyActions, '2026-04-22T00:00:00.000Z'),
      status: 'APPLIED',
      selectedActionCode: 'skin_beast',
      appliedResult: {
        baseRewardApplied: true,
        inventoryDelta: {
          usualShards: 2,
          leather: 2,
          bone: 1,
        },
        skillUps: [
          {
            skillCode: 'gathering.skinning',
            experienceBefore: 99,
            experienceAfter: 100,
            rankBefore: 0,
            rankAfter: 1,
          },
        ],
        statUps: [
          {
            statKey: 'defence',
            before: 3,
            after: 4,
          },
        ],
        schoolUps: [
          {
            schoolCode: 'ember',
            experienceBefore: 0,
            experienceAfter: 10,
            rankBefore: 0,
            rankAfter: 1,
          },
        ],
        workshopItemDurabilityChanges: [
          {
            itemId: 'skinning-tool-1',
            itemCode: 'skinning_kit',
            itemClass: 'UL',
            slot: 'tool',
            statusBefore: 'ACTIVE',
            statusAfter: 'ACTIVE',
            equippedBefore: true,
            equippedAfter: true,
            durabilityBefore: 2,
            durabilityAfter: 1,
            maxDurability: 12,
          },
        ],
      },
    };

    expect(isPendingRewardSnapshot(snapshot)).toBe(true);
  });

  it('rejects invalid pending reward resolution states', () => {
    const snapshot = createPendingRewardSnapshot(createRewardIntent(), trophyActions, '2026-04-22T00:00:00.000Z');

    expect(isPendingRewardSnapshot({
      ...snapshot,
      status: 'PENDING',
      selectedActionCode: 'skin_beast',
    })).toBe(false);

    expect(isPendingRewardSnapshot({
      ...snapshot,
      status: 'APPLIED',
      appliedResult: null,
    })).toBe(false);
  });
});
