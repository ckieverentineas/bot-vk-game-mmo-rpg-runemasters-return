import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { readGitCommitCount } from './read-git-commit-count';
import { resolveReleaseStatus } from './versioning';

interface RequiredDocument {
  readonly fileName: 'README.md' | 'CHANGELOG.md' | 'PLAN.md' | 'ARCHITECTURE.md';
  readonly purpose: string;
}

interface DocumentCheckResult {
  readonly fileName: RequiredDocument['fileName'];
  readonly isValid: boolean;
  readonly statusLine: string;
}

const projectRoot = resolve(__dirname, '..', '..', '..');

const requiredDocuments: readonly RequiredDocument[] = [
  {
    fileName: 'README.md',
    purpose: 'пользовательское описание проекта',
  },
  {
    fileName: 'CHANGELOG.md',
    purpose: 'история пользовательских изменений',
  },
  {
    fileName: 'PLAN.md',
    purpose: 'план поставки и масштабирования контента',
  },
  {
    fileName: 'ARCHITECTURE.md',
    purpose: 'архитектурные границы и правила расширения',
  },
];

const validateRequiredDocument = (requiredDocument: RequiredDocument): DocumentCheckResult => {
  const filePath = resolve(projectRoot, requiredDocument.fileName);

  if (!existsSync(filePath)) {
    return {
      fileName: requiredDocument.fileName,
      isValid: false,
      statusLine: `✗ ${requiredDocument.fileName} — отсутствует (${requiredDocument.purpose})`,
    };
  }

  if (statSync(filePath).size === 0) {
    return {
      fileName: requiredDocument.fileName,
      isValid: false,
      statusLine: `✗ ${requiredDocument.fileName} — пустой файл (${requiredDocument.purpose})`,
    };
  }

  return {
    fileName: requiredDocument.fileName,
    isValid: true,
    statusLine: `✓ ${requiredDocument.fileName}`,
  };
};

const releaseStatus = resolveReleaseStatus(readGitCommitCount());
const documentChecks = requiredDocuments.map(validateRequiredDocument);
const hasBlockingDocumentIssues = documentChecks.some(({ isValid }) => !isValid);

const preflightStatusMessage = hasBlockingDocumentIssues
  ? 'Статус: preflight не пройден. Исправьте обязательные документы перед релизом.'
  : 'Статус: preflight пройден.';

console.log(
  [
    'Runemasters Return — release preflight',
    '',
    `Коммитов в истории: ${releaseStatus.commitCount}`,
    `Публичная версия: ${releaseStatus.currentVersion}`,
    `До следующего релизного рубежа: ${releaseStatus.commitsUntilNextRelease} коммитов`,
    '',
    'Обязательные документы:',
    ...documentChecks.map(({ statusLine }) => statusLine),
    '',
    preflightStatusMessage,
    '',
    'Перед быстрой выкладкой:',
    '1. npm run check',
    '2. npm run release:status',
    '3. Синхронизировать README.md, CHANGELOG.md и PLAN.md, если менялось пользовательское поведение.',
  ].join('\n'),
);

if (hasBlockingDocumentIssues) {
  process.exitCode = 1;
}
