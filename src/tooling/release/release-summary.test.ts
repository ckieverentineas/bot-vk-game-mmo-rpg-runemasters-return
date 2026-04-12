import { describe, expect, it } from 'vitest';

import {
  buildReleaseSummaryMarkdown,
  buildReleaseSummarySections,
  extractLatestReleasedVersion,
  inferCommitRangeFromChangelog,
  releaseVersionToCommitCount,
} from './release-summary-generator';

describe('extractLatestReleasedVersion', () => {
  it('берёт последнюю реальную changelog-версию и игнорирует шаблон', () => {
    const changelog = [
      '## [0.03] - 2026-04-12',
      '',
      '## [0.04] - 2026-04-12',
      '',
      '## [0.05] - YYYY-MM-DD',
    ].join('\n');

    expect(extractLatestReleasedVersion(changelog)).toBe('0.04');
  });
});

describe('releaseVersionToCommitCount', () => {
  it('переводит commit-based версию обратно в количество коммитов', () => {
    expect(releaseVersionToCommitCount('2.45')).toBe(245);
  });
});

describe('inferCommitRangeFromChangelog', () => {
  it('вычисляет диапазон только для недокументированных коммитов', () => {
    const changelog = '## [0.04] - 2026-04-12';

    expect(inferCommitRangeFromChangelog(7, changelog)).toBe('HEAD~3..HEAD');
  });

  it('возвращает null если новых коммитов после changelog нет', () => {
    const changelog = '## [0.04] - 2026-04-12';

    expect(inferCommitRangeFromChangelog(4, changelog)).toBeNull();
  });

  it('игнорирует changelog-версии, которые опережают текущую git-историю', () => {
    const changelog = [
      '## [0.04] - 2026-04-12',
      '',
      '## [0.08] - 2026-04-12',
    ].join('\n');

    expect(inferCommitRangeFromChangelog(5, changelog)).toBe('HEAD~1..HEAD');
  });
});

describe('buildReleaseSummarySections', () => {
  it('группирует conventional commits по пользовательским категориям', () => {
    const sections = buildReleaseSummarySections([
      { hash: '1', subject: 'feat: add rune archetype sync' },
      { hash: '2', subject: 'fix: preserve rune abilities in persistence' },
      { hash: '3', subject: 'docs: update release checklist' },
      { hash: '4', subject: 'refactor: tighten content transport bridge' },
    ]);

    expect(sections).toEqual([
      {
        title: '✨ Новые возможности',
        items: ['Add rune archetype sync'],
      },
      {
        title: '🐛 Исправления',
        items: ['Preserve rune abilities in persistence'],
      },
      {
        title: '🔧 Улучшения',
        items: ['Tighten content transport bridge'],
      },
      {
        title: '📝 Документация',
        items: ['Update release checklist'],
      },
    ]);
  });
});

describe('buildReleaseSummaryMarkdown', () => {
  it('строит markdown summary для релизных заметок', () => {
    const markdown = buildReleaseSummaryMarkdown({
      version: '0.05',
      commitCount: 5,
      range: 'HEAD~1..HEAD',
      sections: [
        {
          title: '✨ Новые возможности',
          items: ['Add rune archetype sync'],
        },
      ],
    });

    expect(markdown).toContain('# Release Summary');
    expect(markdown).toContain('## ✨ Новые возможности');
    expect(markdown).toContain('- Add rune archetype sync');
  });
});
