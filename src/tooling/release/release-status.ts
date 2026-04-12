import { readGitCommitCount } from './read-git-commit-count';
import { releaseCommitWindowSize, resolveReleaseStatus } from './versioning';

const releaseStatus = resolveReleaseStatus(readGitCommitCount());

console.log(
  [
    'Runemasters Return — release status',
    '',
    `Коммитов в истории: ${releaseStatus.commitCount}`,
    `Публичная версия по changelog-политике: ${releaseStatus.currentVersion}`,
    `Следующий релизный рубеж: ${releaseStatus.nextReleaseCommitTarget} коммитов`,
    `Осталось коммитов до следующего рубежа: ${releaseStatus.commitsUntilNextRelease}`,
    '',
    `Правило релизов: каждые ${releaseCommitWindowSize} коммитов дают новую версию формата M.nn, поэтому ${releaseCommitWindowSize} коммитов = 1.00.`,
  ].join('\n'),
);
