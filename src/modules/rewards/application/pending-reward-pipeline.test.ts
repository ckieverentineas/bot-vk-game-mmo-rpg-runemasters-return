import { describe, expect, it } from 'vitest';

import { AppError } from '../../../shared/domain/AppError';
import type { BattleWorkshopItemSnapshot, PlayerSkillView } from '../../../shared/types/game';
import {
  createTestBattle,
  createTestBattleEnemySnapshot,
  createTestBattlePlayerSnapshot,
  testTimestamp,
} from '../../../shared/testing/game-factories';
import {
  buildPendingRewardInventoryDelta,
  buildPendingRewardSkillPointGains,
  createAppliedPendingRewardLedger,
  createPendingRewardLedgerForBattle,
  findPendingRewardTrophyAction,
  resolveBattlePlayerSchoolCode,
} from './pending-reward-pipeline';

const createVictoryBattle = () => createTestBattle({
  status: 'COMPLETED',
  result: 'VICTORY',
  enemy: createTestBattleEnemySnapshot({
    code: 'blue-slime',
    kind: 'slime',
    currentHealth: 0,
    lootTable: {
      herb: 1,
      essence: 1,
    },
  }),
  rewards: {
    experience: 6,
    gold: 2,
    shards: {
      USUAL: 1,
    },
    droppedRune: null,
  },
});

const createSkinningKitSnapshot = (
  overrides: Partial<BattleWorkshopItemSnapshot> = {},
): BattleWorkshopItemSnapshot => ({
  id: 'skinning-kit-1',
  itemCode: 'skinning_kit',
  itemClass: 'COMMON',
  slot: 'tool',
  durability: 3,
  maxDurability: 12,
  ...overrides,
});

const createWolfBattle = (
  workshopLoadout: readonly BattleWorkshopItemSnapshot[] = [],
) => createTestBattle({
  status: 'COMPLETED',
  result: 'VICTORY',
  player: createTestBattlePlayerSnapshot({
    workshopLoadout: [...workshopLoadout],
  }),
  enemy: createTestBattleEnemySnapshot({
    code: 'forest-wolf',
    kind: 'wolf',
    currentHealth: 0,
    lootTable: {
      leather: 2,
      bone: 1,
    },
  }),
  rewards: {
    experience: 8,
    gold: 3,
    shards: {
      USUAL: 1,
    },
    droppedRune: null,
  },
});

const createSkill = (
  experience: number,
): PlayerSkillView => ({
  skillCode: 'gathering.reagent_gathering',
  experience,
  rank: 0,
});

describe('pending reward pipeline', () => {
  it('builds a pending reward ledger with contextual trophy rewards', () => {
    const ledger = createPendingRewardLedgerForBattle({
      playerId: 1,
      battle: createVictoryBattle(),
      createdAt: testTimestamp,
      playerSkills: [createSkill(20)],
    });

    expect(ledger?.ledgerKey).toBe('battle-victory:battle-1');
    expect(ledger?.pendingRewardSnapshot.trophyActions.map((action) => action.code)).toEqual([
      'gather_slime',
      'refine_slime_core',
      'claim_all',
    ]);

    const gatherAction = findPendingRewardTrophyAction(ledger!, 'gather_slime');
    expect(buildPendingRewardInventoryDelta(gatherAction)).toEqual({
      herb: 3,
      essence: 1,
    });
    expect(buildPendingRewardSkillPointGains(gatherAction)).toEqual([
      {
        skillCode: 'gathering.reagent_gathering',
        points: 1,
      },
    ]);

    const claimAllAction = findPendingRewardTrophyAction(ledger!, 'claim_all');
    expect(buildPendingRewardInventoryDelta(claimAllAction)).toEqual({
      herb: 1,
      essence: 1,
    });
    expect(buildPendingRewardSkillPointGains(claimAllAction)).toEqual([]);
  });

  it('marks tool-gated trophy actions unavailable without an equipped active tool', () => {
    const ledger = createPendingRewardLedgerForBattle({
      playerId: 1,
      battle: createWolfBattle(),
      createdAt: testTimestamp,
    });

    const skinningAction = ledger?.pendingRewardSnapshot.trophyActions.find((action) => action.code === 'skin_beast');

    expect(skinningAction?.availability).toEqual({
      available: false,
      reasonCode: 'missing_workshop_tool',
      requiredWorkshopItemCodes: ['skinning_kit'],
    });
    expect(() => findPendingRewardTrophyAction(ledger!, 'skin_beast')).toThrow(AppError);
    expect(findPendingRewardTrophyAction(ledger!, 'claim_all').code).toBe('claim_all');
  });

  it('keeps tool-gated trophy actions available with an equipped active tool', () => {
    const ledger = createPendingRewardLedgerForBattle({
      playerId: 1,
      battle: createWolfBattle([createSkinningKitSnapshot()]),
      createdAt: testTimestamp,
    });

    const skinningAction = findPendingRewardTrophyAction(ledger!, 'skin_beast');

    expect(skinningAction.availability).toEqual({
      available: true,
      requiredWorkshopItemCodes: ['skinning_kit'],
    });
    expect(buildPendingRewardInventoryDelta(skinningAction)).toEqual({
      leather: 2,
      bone: 1,
    });
  });

  it('creates an applied ledger from the selected trophy action', () => {
    const ledger = createPendingRewardLedgerForBattle({
      playerId: 1,
      battle: createVictoryBattle(),
      createdAt: testTimestamp,
      playerSkills: [createSkill(0)],
    });
    const action = findPendingRewardTrophyAction(ledger!, 'gather_slime');
    const appliedResult = {
      baseRewardApplied: true,
      inventoryDelta: buildPendingRewardInventoryDelta(action),
      skillUps: [],
      statUps: [],
      schoolUps: [],
    };

    const appliedLedger = createAppliedPendingRewardLedger({
      ledger: ledger!,
      action,
      appliedResult,
      appliedAt: '2026-04-12T00:01:00.000Z',
    });

    expect(appliedLedger.status).toBe('APPLIED');
    expect(appliedLedger.pendingRewardSnapshot.selectedActionCode).toBe('gather_slime');
    expect(appliedLedger.pendingRewardSnapshot.appliedResult).toEqual(appliedResult);
    expect(appliedLedger.appliedAt).toBe('2026-04-12T00:01:00.000Z');
  });

  it('skips non-victory battles and resolves equipped schools', () => {
    const defeatLedger = createPendingRewardLedgerForBattle({
      playerId: 1,
      battle: createTestBattle({
        status: 'COMPLETED',
        result: 'DEFEAT',
        rewards: null,
      }),
      createdAt: testTimestamp,
    });

    const schoolBattle = createTestBattle({
      player: createTestBattlePlayerSnapshot({
        runeLoadout: {
          runeId: 'rune-1',
          runeName: 'Test ember rune',
          runeRarity: 'USUAL',
          archetypeCode: 'ember',
          archetypeName: 'Штурм',
          schoolCode: 'ember',
          passiveAbilityCodes: [],
          activeAbility: null,
        },
      }),
    });

    expect(defeatLedger).toBeNull();
    expect(resolveBattlePlayerSchoolCode(schoolBattle)).toBe('ember');
  });
});
