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
