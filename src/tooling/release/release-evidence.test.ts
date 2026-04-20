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
        action: 'loadout_changed',
        details: JSON.stringify({
          changeType: 'equip_primary',
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
    ], '2026-04-20T03:00:00.000Z'));

    expect(markdown).toContain('# Release Evidence Report');
    expect(markdown).toContain('## School payoff funnel');
    expect(markdown).toContain('## QA / exploit guardrails');
    expect(markdown).toContain('| Школа | Novice elite | UNUSUAL reward | Open runes | Equip sign | Follow-up battle | RARE seal | Latest event |');
  });
});
