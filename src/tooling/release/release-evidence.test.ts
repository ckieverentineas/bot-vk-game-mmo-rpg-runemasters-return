import { describe, expect, it } from 'vitest';

import { buildReleaseEvidenceMarkdown, summarizeReleaseEvidence } from './release-evidence-generator';

describe('summarizeReleaseEvidence', () => {
  it('builds a unified release evidence snapshot from telemetry logs', () => {
    const report = summarizeReleaseEvidence([
      {
        userId: 11,
        action: 'onboarding_started',
        details: JSON.stringify({ tutorialState: 'IN_PROGRESS' }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 11,
        action: 'tutorial_path_chosen',
        details: JSON.stringify({ choice: 'continue_tutorial' }),
        createdAt: '2026-04-20T01:00:30.000Z',
      },
      {
        userId: 11,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:01:00.000Z',
      },
      {
        userId: 11,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'ledger-1',
          battleId: 'battle-1',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'ember',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:02:00.000Z',
      },
      {
        userId: 11,
        action: 'first_school_presented',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:02:30.000Z',
      },
      {
        userId: 11,
        action: 'post_session_next_goal_shown',
        details: JSON.stringify({
          suggestedGoalType: 'equip_school_sign',
          isSchoolNoviceElite: true,
        }),
        createdAt: '2026-04-20T01:03:00.000Z',
      },
      {
        userId: 11,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({
          schoolCode: 'ember',
          currentGoalType: 'equip_school_sign',
          actionType: 'open_runes',
          signEquipped: false,
        }),
        createdAt: '2026-04-20T01:04:00.000Z',
      },
      {
        userId: 11,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({
          schoolCode: 'ember',
          currentGoalType: 'equip_school_sign',
          actionType: 'equip_school_sign',
          signEquipped: true,
        }),
        createdAt: '2026-04-20T01:05:00.000Z',
      },
      {
        userId: 11,
        action: 'first_school_committed',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:05:30.000Z',
      },
      {
        userId: 11,
        action: 'quest_book_opened',
        details: JSON.stringify({
          playerId: 11,
          questCode: null,
          questStatus: null,
          readyToClaimCount: 1,
          claimedCount: 0,
        }),
        createdAt: '2026-04-20T01:05:40.000Z',
      },
      {
        userId: 11,
        action: 'quest_reward_claimed',
        details: JSON.stringify({
          playerId: 11,
          questCode: 'awakening_empty_master',
          questStatus: 'CLAIMED',
          readyToClaimCount: 0,
          claimedCount: 1,
        }),
        createdAt: '2026-04-20T01:05:45.000Z',
      },
      {
        userId: 11,
        action: 'quest_reward_replayed',
        details: JSON.stringify({
          playerId: 11,
          questCode: 'awakening_empty_master',
          questStatus: 'CLAIMED',
          readyToClaimCount: 0,
          claimedCount: 1,
        }),
        createdAt: '2026-04-20T01:05:50.000Z',
      },
      {
        userId: 11,
        action: 'loadout_changed',
        details: JSON.stringify({
          changeType: 'equip_rune',
          slotNumber: 1,
          afterSchoolCode: 'ember',
          afterRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:06:00.000Z',
      },
      {
        userId: 11,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({
          schoolCode: 'ember',
          currentGoalType: 'equip_school_sign',
          actionType: 'start_next_battle',
          signEquipped: true,
        }),
        createdAt: '2026-04-20T01:07:00.000Z',
      },
      {
        userId: 11,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'ledger-2',
          battleId: 'battle-2',
          battleSchoolCode: 'ember',
          rewardRuneRarity: 'RARE',
        }),
        createdAt: '2026-04-20T01:08:00.000Z',
      },
      {
        userId: 21,
        action: 'return_recap_shown',
        details: JSON.stringify({
          nextStepType: 'equip_school_sign',
          hasEquippedRune: false,
        }),
        createdAt: '2026-04-20T02:00:00.000Z',
      },
      {
        userId: 21,
        action: 'quest_reward_not_ready',
        details: JSON.stringify({
          playerId: 21,
          questCode: 'first_school_sign',
          questStatus: 'IN_PROGRESS',
          readyToClaimCount: 0,
          claimedCount: 1,
        }),
        createdAt: '2026-04-20T02:00:30.000Z',
      },
      {
        userId: 21,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({
          schoolCode: 'echo',
          currentGoalType: 'equip_school_sign',
          actionType: 'equip_school_sign',
          signEquipped: true,
        }),
        createdAt: '2026-04-20T02:01:00.000Z',
      },
      {
        userId: 21,
        action: 'post_session_next_goal_shown',
        details: JSON.stringify({
          suggestedGoalType: 'push_higher_threat',
          isSchoolNoviceElite: false,
        }),
        createdAt: '2026-04-20T02:02:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z');

    expect(report.verdict).toBe('pass');
    expect(report.uniqueUsers).toBe(2);
    expect(report.windowStart).toBe('2026-04-20T01:00:00.000Z');
    expect(report.windowEnd).toBe('2026-04-20T02:02:00.000Z');

    const onboardingRow = report.onboardingRows[0];
    expect(onboardingRow).toEqual({
      tutorialState: 'IN_PROGRESS',
      eventCount: 1,
      uniqueUsers: 1,
    });
    expect(report.tutorialPathRows).toEqual([
      {
        choice: 'continue_tutorial',
        eventCount: 1,
        uniqueUsers: 1,
      },
    ]);
    expect(report.firstSchoolRows.find((row) => row.schoolCode === 'ember')).toEqual({
      schoolCode: 'ember',
      schoolName: 'Пламя',
      presentedUsers: 1,
      committedUsers: 1,
    });

    const emberLoadout = report.loadoutRows.find((row) => row.schoolCode === 'ember');
    expect(emberLoadout).toEqual(expect.objectContaining({
      alignedRewardUsers: 1,
      openRunesAfterRewardUsers: 1,
      equipSignAfterRewardUsers: 1,
      loadoutChangedAfterRewardUsers: 1,
      nextBattleAfterRewardUsers: 1,
      rareSealUsers: 1,
    }));

    expect(report.nextGoalRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        goalType: 'equip_school_sign',
        shownCount: 1,
        noviceEliteShownCount: 1,
        followUpUsers: 1,
      }),
      expect.objectContaining({
        goalType: 'push_higher_threat',
        shownCount: 1,
        noviceEliteShownCount: 0,
        followUpUsers: 0,
      }),
    ]));

    expect(report.returnRecapRows).toEqual([
      {
        nextStepType: 'equip_school_sign',
        shownCount: 1,
        withoutEquippedRuneShownCount: 1,
        withEquippedRuneShownCount: 0,
        followUpUsers: 1,
      },
    ]);

    expect(report.questBookRows).toEqual([
      {
        action: 'quest_book_opened',
        label: '`quest_book_opened`',
        eventCount: 1,
        uniqueUsers: 1,
        questCodes: [],
        latestEventAt: '2026-04-20T01:05:40.000Z',
      },
      {
        action: 'quest_reward_claimed',
        label: '`quest_reward_claimed`',
        eventCount: 1,
        uniqueUsers: 1,
        questCodes: ['awakening_empty_master'],
        latestEventAt: '2026-04-20T01:05:45.000Z',
      },
      {
        action: 'quest_reward_replayed',
        label: '`quest_reward_replayed`',
        eventCount: 1,
        uniqueUsers: 1,
        questCodes: ['awakening_empty_master'],
        latestEventAt: '2026-04-20T01:05:50.000Z',
      },
      {
        action: 'quest_reward_not_ready',
        label: '`quest_reward_not_ready`',
        eventCount: 1,
        uniqueUsers: 1,
        questCodes: ['first_school_sign'],
        latestEventAt: '2026-04-20T02:00:30.000Z',
      },
    ]);

    expect(report.exploitSummary).toEqual({
      duplicateRewardLedgerKeys: [],
      duplicateRewardBattleIds: [],
      staleActionRejectedCount: 0,
      staleActionRejectedUsers: 0,
      staleActionRejectedBattles: 0,
    });
  });

  it('warns when duplicate reward claims or stale battle signals appear', () => {
    const report = summarizeReleaseEvidence([
      {
        userId: 1,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'stone' }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 1,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'duplicate-ledger',
          battleId: 'battle-1',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'stone',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:01:00.000Z',
      },
      {
        userId: 1,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'duplicate-ledger',
          battleId: 'battle-1',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'stone',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:02:00.000Z',
      },
      {
        userId: 1,
        action: 'battle_stale_action_rejected',
        details: JSON.stringify({ battleId: 'battle-1' }),
        createdAt: '2026-04-20T01:03:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z');

    expect(report.verdict).toBe('warn');
    expect(report.verdictReasons.join(' ')).toContain('ledgerKey');
    expect(report.verdictReasons.join(' ')).toContain('battleId');
    expect(report.exploitSummary).toEqual({
      duplicateRewardLedgerKeys: ['duplicate-ledger'],
      duplicateRewardBattleIds: ['battle-1'],
      staleActionRejectedCount: 1,
      staleActionRejectedUsers: 1,
      staleActionRejectedBattles: 1,
    });
  });

  it('summarizes committed economy transactions by transaction and source type', () => {
    const report = summarizeReleaseEvidence([
      {
        userId: 1,
        action: 'economy_transaction_committed',
        details: JSON.stringify({
          transactionType: 'reward_claim',
          sourceType: 'QUEST_REWARD',
          sourceId: 'awakening_empty_master',
          resourceDustDelta: 5,
          resourceRadianceDelta: 1,
          resourceShardsDelta: 1,
          runeDelta: 0,
          playerLevel: 1,
        }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 2,
        action: 'economy_transaction_committed',
        details: JSON.stringify({
          transactionType: 'reward_claim',
          sourceType: 'QUEST_REWARD',
          sourceId: 'first_school_sign',
          resourceDustDelta: 3,
          resourceRadianceDelta: 2,
          resourceShardsDelta: 2,
          runeDelta: 0,
          playerLevel: 2,
        }),
        createdAt: '2026-04-20T01:01:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z');

    expect(report.actionRows.find((row) => row.action === 'economy_transaction_committed')).toEqual({
      action: 'economy_transaction_committed',
      label: '`economy_transaction_committed`',
      eventCount: 2,
      uniqueUsers: 2,
    });
    expect(report.economyRows).toEqual([
      {
        transactionType: 'reward_claim',
        sourceType: 'QUEST_REWARD',
        eventCount: 2,
        uniqueUsers: 2,
        resourceDustDelta: 8,
        resourceRadianceDelta: 3,
        resourceShardsDelta: 3,
        runeDelta: 0,
        sourceIds: ['awakening_empty_master', 'first_school_sign'],
        latestEventAt: '2026-04-20T01:01:00.000Z',
      },
    ]);
  });

  it('does not mark unrelated school follow-up as success and warns when return recap evidence is missing', () => {
    const report = summarizeReleaseEvidence([
      {
        userId: 5,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'gale' }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 5,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'ledger-1',
          battleId: 'battle-1',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'gale',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:01:00.000Z',
      },
      {
        userId: 5,
        action: 'post_session_next_goal_shown',
        details: JSON.stringify({
          suggestedGoalType: 'push_higher_threat',
          isSchoolNoviceElite: true,
        }),
        createdAt: '2026-04-20T01:02:00.000Z',
      },
      {
        userId: 5,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({
          schoolCode: 'gale',
          currentGoalType: 'equip_school_sign',
          actionType: 'equip_school_sign',
          signEquipped: true,
        }),
        createdAt: '2026-04-20T01:03:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z');

    expect(report.verdict).toBe('warn');
    expect(report.verdictReasons.join(' ')).toContain('return_recap_shown');
    expect(report.nextGoalRows).toEqual([
      {
        goalType: 'push_higher_threat',
        shownCount: 1,
        noviceEliteShownCount: 1,
        followUpUsers: 0,
      },
    ]);
  });

  it('warns when post-session evidence is missing entirely', () => {
    const report = summarizeReleaseEvidence([
      {
        userId: 8,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'stone' }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 8,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'ledger-1',
          battleId: 'battle-1',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'stone',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:01:00.000Z',
      },
      {
        userId: 8,
        action: 'return_recap_shown',
        details: JSON.stringify({
          nextStepType: 'equip_school_sign',
          hasEquippedRune: false,
        }),
        createdAt: '2026-04-20T01:02:00.000Z',
      },
      {
        userId: 8,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({
          schoolCode: 'stone',
          currentGoalType: 'equip_school_sign',
          actionType: 'equip_school_sign',
          signEquipped: true,
        }),
        createdAt: '2026-04-20T01:03:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z');

    expect(report.verdict).toBe('warn');
    expect(report.verdictReasons.join(' ')).toContain('post_session_next_goal_shown');
  });

  it('attributes one matching follow-up to the latest shown surface only', () => {
    const report = summarizeReleaseEvidence([
      {
        userId: 13,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 13,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'ledger-1',
          battleId: 'battle-1',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'ember',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:01:00.000Z',
      },
      {
        userId: 13,
        action: 'post_session_next_goal_shown',
        details: JSON.stringify({
          suggestedGoalType: 'equip_school_sign',
          isSchoolNoviceElite: true,
        }),
        createdAt: '2026-04-20T01:02:00.000Z',
      },
      {
        userId: 13,
        action: 'return_recap_shown',
        details: JSON.stringify({
          nextStepType: 'equip_school_sign',
          hasEquippedRune: false,
        }),
        createdAt: '2026-04-20T01:03:00.000Z',
      },
      {
        userId: 13,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({
          schoolCode: 'ember',
          currentGoalType: 'equip_school_sign',
          actionType: 'equip_school_sign',
          signEquipped: true,
        }),
        createdAt: '2026-04-20T01:04:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z');

    expect(report.nextGoalRows).toEqual([
      {
        goalType: 'equip_school_sign',
        shownCount: 1,
        noviceEliteShownCount: 1,
        followUpUsers: 0,
      },
    ]);
    expect(report.returnRecapRows).toEqual([
      {
        nextStepType: 'equip_school_sign',
        shownCount: 1,
        withoutEquippedRuneShownCount: 1,
        withEquippedRuneShownCount: 0,
        followUpUsers: 1,
      },
    ]);
  });

  it('stitches a loadout change to the latest matching post-session next-goal surface', () => {
    const report = summarizeReleaseEvidence([
      {
        userId: 9,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 9,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'ledger-1',
          battleId: 'battle-1',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'ember',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:01:00.000Z',
      },
      {
        userId: 9,
        action: 'post_session_next_goal_shown',
        details: JSON.stringify({
          suggestedGoalType: 'equip_dropped_rune',
          isSchoolNoviceElite: false,
        }),
        createdAt: '2026-04-20T01:02:00.000Z',
      },
      {
        userId: 9,
        action: 'loadout_changed',
        details: JSON.stringify({
          changeType: 'equip_rune',
          afterSchoolCode: 'ember',
          afterRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:03:00.000Z',
      },
      {
        userId: 9,
        action: 'return_recap_shown',
        details: JSON.stringify({
          nextStepType: 'equip_school_sign',
          hasEquippedRune: true,
        }),
        createdAt: '2026-04-20T01:04:00.000Z',
      },
      {
        userId: 9,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({
          schoolCode: 'ember',
          currentGoalType: 'equip_school_sign',
          actionType: 'start_next_battle',
          signEquipped: true,
        }),
        createdAt: '2026-04-20T01:05:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z');

    expect(report.nextGoalRows).toEqual([
      {
        goalType: 'equip_dropped_rune',
        shownCount: 1,
        noviceEliteShownCount: 0,
        followUpUsers: 1,
      },
    ]);
    expect(report.returnRecapRows).toEqual([
      {
        nextStepType: 'equip_school_sign',
        shownCount: 1,
        withoutEquippedRuneShownCount: 0,
        withEquippedRuneShownCount: 1,
        followUpUsers: 1,
      },
    ]);
  });

  it('warns when a school miniboss follow-up has no rare seal payoff yet', () => {
    const report = summarizeReleaseEvidence([
      {
        userId: 19,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 19,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'ledger-1',
          battleId: 'battle-1',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'ember',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:01:00.000Z',
      },
      {
        userId: 19,
        action: 'first_school_presented',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:02:00.000Z',
      },
      {
        userId: 19,
        action: 'first_school_committed',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:03:00.000Z',
      },
      {
        userId: 19,
        action: 'post_session_next_goal_shown',
        details: JSON.stringify({
          suggestedGoalType: 'challenge_school_miniboss',
          isSchoolNoviceElite: false,
        }),
        createdAt: '2026-04-20T01:04:00.000Z',
      },
      {
        userId: 19,
        action: 'return_recap_shown',
        details: JSON.stringify({
          nextStepType: 'challenge_school_miniboss',
          hasEquippedRune: true,
        }),
        createdAt: '2026-04-20T01:05:00.000Z',
      },
      {
        userId: 19,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({
          schoolCode: 'ember',
          currentGoalType: 'challenge_school_miniboss',
          actionType: 'start_next_battle',
          signEquipped: true,
        }),
        createdAt: '2026-04-20T01:06:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z');

    expect(report.verdict).toBe('warn');
    expect(report.verdictReasons.join(' ')).toContain('rare seal payoff');
  });

  it('counts the earliest tutorial path choice per user in the onboarding split', () => {
    const report = summarizeReleaseEvidence([
      {
        userId: 17,
        action: 'onboarding_started',
        details: JSON.stringify({ tutorialState: 'ACTIVE' }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 17,
        action: 'tutorial_path_chosen',
        details: JSON.stringify({ choice: 'continue_tutorial' }),
        createdAt: '2026-04-20T01:01:00.000Z',
      },
      {
        userId: 17,
        action: 'tutorial_path_chosen',
        details: JSON.stringify({ choice: 'skip_tutorial' }),
        createdAt: '2026-04-20T01:02:00.000Z',
      },
      {
        userId: 17,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'stone' }),
        createdAt: '2026-04-20T01:03:00.000Z',
      },
      {
        userId: 17,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'ledger-1',
          battleId: 'battle-1',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'stone',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:04:00.000Z',
      },
      {
        userId: 17,
        action: 'first_school_presented',
        details: JSON.stringify({ schoolCode: 'stone' }),
        createdAt: '2026-04-20T01:05:00.000Z',
      },
      {
        userId: 17,
        action: 'first_school_committed',
        details: JSON.stringify({ schoolCode: 'stone' }),
        createdAt: '2026-04-20T01:06:00.000Z',
      },
      {
        userId: 17,
        action: 'post_session_next_goal_shown',
        details: JSON.stringify({
          suggestedGoalType: 'equip_school_sign',
          isSchoolNoviceElite: true,
        }),
        createdAt: '2026-04-20T01:07:00.000Z',
      },
      {
        userId: 17,
        action: 'return_recap_shown',
        details: JSON.stringify({
          nextStepType: 'equip_school_sign',
          hasEquippedRune: false,
        }),
        createdAt: '2026-04-20T01:08:00.000Z',
      },
      {
        userId: 17,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({
          schoolCode: 'stone',
          currentGoalType: 'equip_school_sign',
          actionType: 'equip_school_sign',
          signEquipped: true,
        }),
        createdAt: '2026-04-20T01:09:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z');

    expect(report.tutorialPathRows).toEqual([
      {
        choice: 'continue_tutorial',
        eventCount: 1,
        uniqueUsers: 1,
      },
    ]);
  });

  it('warns when onboarding evidence only covers a fraction of started players', () => {
    const report = summarizeReleaseEvidence([
      {
        userId: 1,
        action: 'onboarding_started',
        details: JSON.stringify({ tutorialState: 'ACTIVE' }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 2,
        action: 'onboarding_started',
        details: JSON.stringify({ tutorialState: 'ACTIVE' }),
        createdAt: '2026-04-20T01:00:10.000Z',
      },
      {
        userId: 1,
        action: 'tutorial_path_chosen',
        details: JSON.stringify({ choice: 'continue_tutorial' }),
        createdAt: '2026-04-20T01:01:00.000Z',
      },
      {
        userId: 1,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:02:00.000Z',
      },
      {
        userId: 1,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'ledger-1',
          battleId: 'battle-1',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'ember',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:03:00.000Z',
      },
      {
        userId: 1,
        action: 'first_school_presented',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:04:00.000Z',
      },
      {
        userId: 1,
        action: 'first_school_committed',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:05:00.000Z',
      },
      {
        userId: 1,
        action: 'post_session_next_goal_shown',
        details: JSON.stringify({
          suggestedGoalType: 'equip_school_sign',
          isSchoolNoviceElite: true,
        }),
        createdAt: '2026-04-20T01:06:00.000Z',
      },
      {
        userId: 1,
        action: 'return_recap_shown',
        details: JSON.stringify({
          nextStepType: 'equip_school_sign',
          hasEquippedRune: false,
        }),
        createdAt: '2026-04-20T01:07:00.000Z',
      },
      {
        userId: 1,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({
          schoolCode: 'ember',
          currentGoalType: 'equip_school_sign',
          actionType: 'equip_school_sign',
          signEquipped: true,
        }),
        createdAt: '2026-04-20T01:08:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z');

    expect(report.verdict).toBe('warn');
    expect(report.verdictReasons.join(' ')).toContain('tutorial_path_chosen');
  });

  it('does not treat later second-school rewards as missing first-school telemetry coverage', () => {
    const report = summarizeReleaseEvidence([
      {
        userId: 30,
        action: 'onboarding_started',
        details: JSON.stringify({ tutorialState: 'ACTIVE' }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 30,
        action: 'tutorial_path_chosen',
        details: JSON.stringify({ choice: 'continue_tutorial' }),
        createdAt: '2026-04-20T01:01:00.000Z',
      },
      {
        userId: 30,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:02:00.000Z',
      },
      {
        userId: 30,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'ledger-ember',
          battleId: 'battle-ember',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'ember',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:03:00.000Z',
      },
      {
        userId: 30,
        action: 'first_school_presented',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:04:00.000Z',
      },
      {
        userId: 30,
        action: 'first_school_committed',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:05:00.000Z',
      },
      {
        userId: 30,
        action: 'post_session_next_goal_shown',
        details: JSON.stringify({
          suggestedGoalType: 'equip_school_sign',
          isSchoolNoviceElite: true,
        }),
        createdAt: '2026-04-20T01:06:00.000Z',
      },
      {
        userId: 30,
        action: 'return_recap_shown',
        details: JSON.stringify({
          nextStepType: 'equip_school_sign',
          hasEquippedRune: false,
        }),
        createdAt: '2026-04-20T01:07:00.000Z',
      },
      {
        userId: 30,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({
          schoolCode: 'ember',
          currentGoalType: 'equip_school_sign',
          actionType: 'equip_school_sign',
          signEquipped: true,
        }),
        createdAt: '2026-04-20T01:08:00.000Z',
      },
      {
        userId: 30,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'ledger-stone',
          battleId: 'battle-stone',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'stone',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:09:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z');

    expect(report.verdictReasons.join(' ')).not.toContain('first_school_presented');
    expect(report.verdictReasons.join(' ')).not.toContain('first_school_committed');
  });
});

describe('buildReleaseEvidenceMarkdown', () => {
  it('renders the unified report headings and tables', () => {
    const markdown = buildReleaseEvidenceMarkdown(summarizeReleaseEvidence([
      {
        userId: 11,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'gale' }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 11,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          ledgerKey: 'ledger-1',
          battleId: 'battle-1',
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'gale',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:01:00.000Z',
      },
      {
        userId: 11,
        action: 'economy_transaction_committed',
        details: JSON.stringify({
          transactionType: 'reward_claim',
          sourceType: 'QUEST_REWARD',
          sourceId: 'awakening_empty_master',
          resourceDustDelta: 5,
          resourceRadianceDelta: 1,
          resourceShardsDelta: 1,
          runeDelta: 0,
          playerLevel: 1,
        }),
        createdAt: '2026-04-20T01:02:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z'));

    expect(markdown).toContain('# Release Evidence Report');
    expect(markdown).toContain('## School payoff funnel');
    expect(markdown).toContain('## Quest book funnel');
    expect(markdown).toContain('## Economy health');
    expect(markdown).toContain('## QA / exploit guardrails');
    expect(markdown).toContain('| Quest signal | Events | Unique users | Quest codes | Latest event |');
    expect(markdown).toContain('| Transaction | Source | Events | Unique users | Dust delta | Radiance delta | Shards delta | Rune delta | Source IDs | Latest event |');
    expect(markdown).toContain('| Школа | Novice elite | UNUSUAL reward | Open runes | Equip sign | Follow-up battle | RARE seal | Latest event |');
  });
});
