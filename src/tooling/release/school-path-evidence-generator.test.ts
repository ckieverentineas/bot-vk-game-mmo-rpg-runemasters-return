import { describe, expect, it } from 'vitest';

import { buildSchoolPathEvidenceMarkdown, summarizeSchoolPathEvidence } from './school-path-evidence-generator';

describe('summarizeSchoolPathEvidence', () => {
  it('aggregates unique school-path users across novice, follow-up, and rare seal steps', () => {
    const rows = summarizeSchoolPathEvidence([
      {
        userId: 1,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'ember' }),
        createdAt: '2026-04-20T01:00:00.000Z',
      },
      {
        userId: 1,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'ember',
          noviceTargetRewardRarity: 'UNUSUAL',
          rewardRuneRarity: 'UNUSUAL',
        }),
        createdAt: '2026-04-20T01:05:00.000Z',
      },
      {
        userId: 1,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({ schoolCode: 'ember', actionType: 'open_runes' }),
        createdAt: '2026-04-20T01:06:00.000Z',
      },
      {
        userId: 1,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({ schoolCode: 'ember', actionType: 'equip_school_sign' }),
        createdAt: '2026-04-20T01:07:00.000Z',
      },
      {
        userId: 1,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({ schoolCode: 'ember', actionType: 'start_next_battle' }),
        createdAt: '2026-04-20T01:08:00.000Z',
      },
      {
        userId: 1,
        action: 'reward_claim_applied',
        details: JSON.stringify({
          battleSchoolCode: 'ember',
          rewardRuneRarity: 'RARE',
        }),
        createdAt: '2026-04-20T01:10:00.000Z',
      },
      {
        userId: 2,
        action: 'school_novice_elite_encounter_started',
        details: JSON.stringify({ schoolCode: 'echo' }),
        createdAt: '2026-04-20T02:00:00.000Z',
      },
      {
        userId: 2,
        action: 'school_novice_follow_up_action_taken',
        details: JSON.stringify({ schoolCode: 'echo', actionType: 'open_runes' }),
        createdAt: '2026-04-20T02:01:00.000Z',
      },
    ]);

    const ember = rows.find((row) => row.schoolCode === 'ember');
    const echo = rows.find((row) => row.schoolCode === 'echo');

    expect(ember).toEqual(expect.objectContaining({
      noviceEliteUsers: 1,
      noviceRewardUsers: 1,
      openRunesUsers: 1,
      equipSignUsers: 1,
      followUpBattleUsers: 1,
      rareSealUsers: 1,
      latestEventAt: '2026-04-20T01:10:00.000Z',
    }));
    expect(echo).toEqual(expect.objectContaining({
      noviceEliteUsers: 1,
      noviceRewardUsers: 0,
      openRunesUsers: 1,
      equipSignUsers: 0,
      followUpBattleUsers: 0,
      rareSealUsers: 0,
      latestEventAt: '2026-04-20T02:01:00.000Z',
    }));
  });
});

describe('buildSchoolPathEvidenceMarkdown', () => {
  it('builds a markdown table for school-path evidence', () => {
    const markdown = buildSchoolPathEvidenceMarkdown([
      {
        schoolCode: 'ember',
        schoolName: 'Пламя',
        noviceEliteUsers: 3,
        noviceRewardUsers: 2,
        openRunesUsers: 2,
        equipSignUsers: 2,
        followUpBattleUsers: 1,
        rareSealUsers: 1,
        latestEventAt: '2026-04-20T01:10:00.000Z',
      },
    ], '2026-04-20T03:00:00.000Z');

    expect(markdown).toContain('# School Path Evidence Summary');
    expect(markdown).toContain('Пламя');
    expect(markdown).toContain('| Школа | Novice elite | UNUSUAL reward | Open runes | Equip sign | Follow-up battle | RARE seal | Latest event |');
  });
});
