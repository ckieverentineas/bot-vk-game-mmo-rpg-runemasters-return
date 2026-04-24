import { describe, expect, it } from 'vitest';

import type { ReleaseEvidenceFinding } from './release-evidence-generator';
import {
  evaluateReleaseGate,
  findReleaseDocumentIssues,
  parseManualDecisions,
  releaseGateSteps,
  resolveManualDecisionIssues,
} from './release-gate-lib';
import { buildNpmRunCommand, runReleaseGateSteps } from './release-gate';

const blockerFinding: ReleaseEvidenceFinding = {
  id: 'duplicate-reward-ledger-keys',
  severity: 'blocker',
  message: 'Duplicate reward ledger keys detected.',
};

const manualFinding: ReleaseEvidenceFinding = {
  id: 'return-recap-follow-up-proxy',
  severity: 'manual_decision',
  message: 'Return recap follow-up needs owner decision.',
};

describe('releaseGateSteps', () => {
  it('keeps the 1.0 gate commands in the required order', () => {
    expect(releaseGateSteps).toEqual([
      'db:generate',
      'db:deploy',
      'check',
      'release:local-playtest',
      'release:school-evidence',
      'release:evidence',
      'release:preflight',
    ]);
  });
});

describe('parseManualDecisions', () => {
  it('keeps only accepted release-owner decisions with an id', () => {
    expect(parseManualDecisions(JSON.stringify([
      {
        id: 'return-recap-follow-up-proxy',
        owner: 'release-owner',
        date: '2026-04-24',
        decision: 'accepted_for_1_0',
        reason: 'Accepted for the local 1.0 gate.',
        followUp: 'Track after release.',
      },
      {
        id: 'ignored',
        owner: 'release-owner',
        date: '2026-04-24',
        decision: 'rejected',
        reason: 'Not accepted.',
        followUp: 'Fix before release.',
      },
    ]))).toEqual([
      {
        id: 'return-recap-follow-up-proxy',
        owner: 'release-owner',
        date: '2026-04-24',
        decision: 'accepted_for_1_0',
        reason: 'Accepted for the local 1.0 gate.',
        followUp: 'Track after release.',
      },
    ]);
  });
});

describe('resolveManualDecisionIssues', () => {
  it('blocks manual findings without an accepted decision', () => {
    expect(resolveManualDecisionIssues([manualFinding], [])).toEqual([
      'manual decision missing for return-recap-follow-up-proxy',
    ]);
  });

  it('accepts manual findings with an owner decision', () => {
    const decisions = parseManualDecisions(JSON.stringify([{
      id: 'return-recap-follow-up-proxy',
      owner: 'release-owner',
      date: '2026-04-24',
      decision: 'accepted_for_1_0',
      reason: 'Accepted for release.',
      followUp: 'Revisit after 1.0.',
    }]));

    expect(resolveManualDecisionIssues([manualFinding], decisions)).toEqual([]);
  });
});

describe('findReleaseDocumentIssues', () => {
  it('blocks red markers in release docs', () => {
    expect(findReleaseDocumentIssues([
      {
        path: 'PLAN.md',
        content: 'release:gate\nTODO закрыть позже',
      },
    ])).toContain('PLAN.md contains red marker TODO');
  });

  it('blocks internal words in the manual playtest guide', () => {
    expect(findReleaseDocumentIssues([
      {
        path: 'docs/testing/manual-playtest-1-0.md',
        content: [
          '# Manual Playtest 1.0',
          '## Первый запуск',
          '| Шаг | Нажми | Ожидай |',
          '| 1 | start | payload виден |',
        ].join('\n'),
      },
    ])).toContain('docs/testing/manual-playtest-1-0.md contains internal word payload');
  });

  it('blocks missing economy contours', () => {
    expect(findReleaseDocumentIssues([
      {
        path: 'docs/release/economy-source-sink-1-0.md',
        content: '| Контур | Источники | Стоки |\n| квесты | награды | нет |',
      },
    ])).toContain('docs/release/economy-source-sink-1-0.md missing contour daily trace');
  });

  it('blocks doc-sync without the canonical gate command list', () => {
    expect(findReleaseDocumentIssues([
      {
        path: 'docs/release/release-doc-sync-1-0.md',
        content: [
          '## Что 1.0 обещает',
          '## Что уже сделано',
          '## Что остаётся после релиза',
          '## Какие команды запускать',
          'npm run check',
        ].join('\n'),
      },
    ])).toContain('docs/release/release-doc-sync-1-0.md missing command npm run db:generate');
  });
});

describe('evaluateReleaseGate', () => {
  it('blocks a failed step', () => {
    expect(evaluateReleaseGate({
      stepResults: [{ script: 'check', exitCode: 1 }],
      evidenceFindings: [],
      manualDecisions: [],
      documentIssues: [],
    })).toEqual({
      exitCode: 1,
      blockingReasons: ['step check failed with exit code 1'],
    });
  });

  it('blocks evidence blockers', () => {
    expect(evaluateReleaseGate({
      stepResults: [],
      evidenceFindings: [blockerFinding],
      manualDecisions: [],
      documentIssues: [],
    }).blockingReasons).toContain('evidence blocker duplicate-reward-ledger-keys');
  });

  it('passes info-only evidence and accepted manual decisions', () => {
    const decisions = parseManualDecisions(JSON.stringify([{
      id: 'return-recap-follow-up-proxy',
      owner: 'release-owner',
      date: '2026-04-24',
      decision: 'accepted_for_1_0',
      reason: 'Accepted for release.',
      followUp: 'Revisit after 1.0.',
    }]));

    expect(evaluateReleaseGate({
      stepResults: [],
      evidenceFindings: [
        manualFinding,
        {
          id: 'lightweight-proxy',
          severity: 'info',
          message: 'This metric is a lightweight proxy.',
        },
      ],
      manualDecisions: decisions,
      documentIssues: [],
    })).toEqual({
      exitCode: 0,
      blockingReasons: [],
    });
  });
});

describe('release gate CLI helpers', () => {
  it('builds a platform-aware npm run command', () => {
    expect(buildNpmRunCommand('release:evidence', 'win32')).toEqual({
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm run release:evidence'],
    });
    expect(buildNpmRunCommand('release:evidence', 'linux')).toEqual({
      command: 'npm',
      args: ['run', 'release:evidence'],
    });
  });

  it('runs scripts in order and stops after the first failure', () => {
    const calls: string[] = [];
    const results = runReleaseGateSteps((script) => {
      calls.push(script);
      return {
        script,
        exitCode: script === 'check' ? 1 : 0,
      };
    });

    expect(calls).toEqual(['db:generate', 'db:deploy', 'check']);
    expect(results).toEqual([
      { script: 'db:generate', exitCode: 0 },
      { script: 'db:deploy', exitCode: 0 },
      { script: 'check', exitCode: 1 },
    ]);
  });
});
