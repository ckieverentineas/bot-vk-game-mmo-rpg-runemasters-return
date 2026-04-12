import { releaseCommitWindowSize } from './versioning';

export interface GitCommitEntry {
  readonly hash: string;
  readonly subject: string;
}

export interface ReleaseSummarySection {
  readonly title: string;
  readonly items: readonly string[];
}

export interface ReleaseSummaryDocument {
  readonly version: string;
  readonly commitCount: number;
  readonly range: string | null;
  readonly sections: readonly ReleaseSummarySection[];
}

type CommitCategory = 'features' | 'fixes' | 'improvements' | 'documentation';

const conventionalCommitPattern = /^(?<type>[a-z]+)(?:\([^)]+\))?!?:\s*(?<body>.+)$/i;
const releaseVersionPattern = /^## \[(\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/gm;

const sectionTitles: Readonly<Record<CommitCategory, string>> = {
  features: '✨ Новые возможности',
  fixes: '🐛 Исправления',
  improvements: '🔧 Улучшения',
  documentation: '📝 Документация',
};

const sectionOrder: readonly CommitCategory[] = ['features', 'fixes', 'improvements', 'documentation'];

const listReleasedVersions = (changelogContent: string): readonly string[] => (
  [...changelogContent.matchAll(releaseVersionPattern)].flatMap((match) => {
    const version = match[1];
    return version ? [version] : [];
  })
);

const humanizeCommitBody = (value: string): string => {
  const normalized = value
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[.]$/, '');

  if (!normalized) {
    return 'Изменения без описания';
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const parseConventionalCommit = (subject: string): { type: string | null; body: string } => {
  const match = conventionalCommitPattern.exec(subject.trim());

  if (!match?.groups) {
    return {
      type: null,
      body: subject,
    };
  }

  return {
    type: match.groups.type.toLowerCase(),
    body: match.groups.body,
  };
};

const resolveCommitCategory = (type: string | null, body: string): CommitCategory | null => {
  if (type === 'feat') {
    return 'features';
  }

  if (type === 'fix') {
    return 'fixes';
  }

  if (type === 'docs') {
    return 'documentation';
  }

  if (type === 'test') {
    return null;
  }

  const normalizedBody = body.toLowerCase();

  if (normalizedBody.includes('fix') || normalizedBody.includes('bug')) {
    return 'fixes';
  }

  if (normalizedBody.includes('doc')) {
    return 'documentation';
  }

  return 'improvements';
};

export const extractLatestReleasedVersion = (changelogContent: string): string | null => {
  const versions = listReleasedVersions(changelogContent);

  return versions.length > 0
    ? versions[versions.length - 1] ?? null
    : null;
};

export const releaseVersionToCommitCount = (version: string): number => {
  const [majorPart, minorPart] = version.split('.');
  const major = Number.parseInt(majorPart ?? '', 10);
  const minor = Number.parseInt(minorPart ?? '', 10);

  if (Number.isNaN(major) || Number.isNaN(minor)) {
    throw new Error(`Некорректный релизный номер: ${version}`);
  }

  return major * releaseCommitWindowSize + minor;
};

const resolveLatestDocumentedCommitCount = (currentCommitCount: number, changelogContent: string): number | null => {
  const versions = listReleasedVersions(changelogContent);

  for (let index = versions.length - 1; index >= 0; index -= 1) {
    const version = versions[index];
    const documentedCommitCount = releaseVersionToCommitCount(version);

    if (documentedCommitCount <= currentCommitCount) {
      return documentedCommitCount;
    }
  }

  return null;
};

export const inferCommitRangeFromChangelog = (currentCommitCount: number, changelogContent: string): string | null => {
  const documentedCommitCount = resolveLatestDocumentedCommitCount(currentCommitCount, changelogContent);

  if (documentedCommitCount === null) {
    return currentCommitCount > 0 ? `HEAD~${currentCommitCount}..HEAD` : null;
  }

  const undocumentedCommitCount = Math.max(0, currentCommitCount - documentedCommitCount);

  return undocumentedCommitCount > 0 ? `HEAD~${undocumentedCommitCount}..HEAD` : null;
};

export const buildReleaseSummarySections = (commits: readonly GitCommitEntry[]): readonly ReleaseSummarySection[] => {
  const groupedItems = new Map<CommitCategory, string[]>();

  commits.forEach((commit) => {
    const parsedCommit = parseConventionalCommit(commit.subject);
    const category = resolveCommitCategory(parsedCommit.type, parsedCommit.body);

    if (!category) {
      return;
    }

    const items = groupedItems.get(category) ?? [];
    items.push(humanizeCommitBody(parsedCommit.body));
    groupedItems.set(category, items);
  });

  return sectionOrder.flatMap((category) => {
    const items = groupedItems.get(category);

    if (!items || items.length === 0) {
      return [];
    }

    return [{
      title: sectionTitles[category],
      items,
    } satisfies ReleaseSummarySection];
  });
};

export const buildReleaseSummaryMarkdown = (document: ReleaseSummaryDocument): string => {
  const lines = [
    '# Release Summary',
    '',
    `- Публичная версия: ${document.version}`,
    `- Коммитов в истории: ${document.commitCount}`,
    `- Диапазон коммитов: ${document.range ?? 'новых коммитов после последней changelog-записи нет'}`,
    '',
  ];

  if (document.sections.length === 0) {
    return [
      ...lines,
      'Новых пользовательских изменений по сравнению с последней changelog-записью нет.',
    ].join('\n');
  }

  const sectionLines = document.sections.flatMap((section) => [
    `## ${section.title}`,
    '',
    ...section.items.map((item) => `- ${item}`),
    '',
  ]);

  return [...lines, ...sectionLines].join('\n').trimEnd();
};
