import { execSync } from 'node:child_process';

import { formatReleaseVersion, resolveCommitsUntilNextRelease, resolveNextReleaseCommitTarget } from './versioning';

const readCommitCount = (): number => {
  try {
    const rawValue = execSync('git rev-list --count HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    const parsedCount = Number.parseInt(rawValue, 10);
    return Number.isNaN(parsedCount) ? 0 : parsedCount;
  } catch {
    return 0;
  }
};

const commitCount = readCommitCount();
const nextReleaseTarget = resolveNextReleaseCommitTarget(commitCount);

console.log(
  [
    'Runemasters Return — release status',
    '',
    `Коммитов в истории: ${commitCount}`,
    `Публичная версия по changelog-политике: ${formatReleaseVersion(commitCount)}`,
    `Следующий релизный рубеж: ${nextReleaseTarget} коммитов`,
    `Осталось коммитов до следующего рубежа: ${resolveCommitsUntilNextRelease(commitCount)}`,
    '',
    'Правило релизов: каждые 100 коммитов дают новую версию формата M.nn, поэтому 100 коммитов = 1.00.',
  ].join('\n'),
);
