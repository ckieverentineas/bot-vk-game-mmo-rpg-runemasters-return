import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { formatGameContentValidationReport, validateGameContent } from '../../content/validation/validate-game-content';
import { readGitCommitCount } from './read-git-commit-count';
import {
  buildDocumentCheckResult,
  evaluateReleasePreflight,
  requiredDocuments,
  type DocumentCheckResult,
  type RequiredDocument,
} from './release-preflight-lib';
import { resolveReleaseStatus } from './versioning';

const projectRoot = resolve(__dirname, '..', '..', '..');

const validateRequiredDocument = (requiredDocument: RequiredDocument): DocumentCheckResult => {
  const filePath = resolve(projectRoot, requiredDocument.fileName);

  if (!existsSync(filePath)) {
    return buildDocumentCheckResult(requiredDocument, 'missing');
  }

  if (statSync(filePath).size === 0) {
    return buildDocumentCheckResult(requiredDocument, 'empty');
  }

  return buildDocumentCheckResult(requiredDocument, 'ok');
};

const releaseStatus = resolveReleaseStatus(readGitCommitCount());
const documentChecks = requiredDocuments.map(validateRequiredDocument);
const contentValidationReport = validateGameContent();
const preflightReport = evaluateReleasePreflight(documentChecks, !contentValidationReport.isValid);

console.log(
  [
    'Runemasters Return — release preflight',
    '',
    `Коммитов в истории: ${releaseStatus.commitCount}`,
    `Публичная версия: ${releaseStatus.currentVersion}`,
    `До следующего релизного рубежа: ${releaseStatus.commitsUntilNextRelease} коммитов`,
    '',
    'Обязательные документы:',
    ...preflightReport.documentChecks.map(({ statusLine }) => statusLine),
    '',
    'Контент и баланс:',
    ...formatGameContentValidationReport(contentValidationReport),
    '',
    preflightReport.statusMessage,
    '',
    'Перед быстрой выкладкой:',
    '1. npm run check',
    '2. npm run release:local-playtest',
    '3. npm run release:status',
    '4. npm run release:summary',
    '5. npm run release:evidence',
    '6. Синхронизировать README.md, CHANGELOG.md, PLAN.md, RELEASE_CHECKLIST.md и ARCHITECTURE.md, если менялось пользовательское поведение или архитектурные границы.',
  ].join('\n'),
);

if (preflightReport.exitCode !== 0) {
  process.exitCode = preflightReport.exitCode;
}
