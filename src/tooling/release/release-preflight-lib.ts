export interface RequiredDocument {
  readonly fileName: 'README.md' | 'CHANGELOG.md' | 'PLAN.md' | 'ARCHITECTURE.md' | 'RELEASE_CHECKLIST.md';
  readonly purpose: string;
}

export interface DocumentCheckResult {
  readonly fileName: RequiredDocument['fileName'];
  readonly isValid: boolean;
  readonly statusLine: string;
}

export interface ReleasePreflightReport {
  readonly documentChecks: readonly DocumentCheckResult[];
  readonly hasBlockingDocumentIssues: boolean;
  readonly hasBlockingContentIssues: boolean;
  readonly statusMessage: string;
  readonly exitCode: number;
}

export const requiredDocuments: readonly RequiredDocument[] = [
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
  {
    fileName: 'RELEASE_CHECKLIST.md',
    purpose: 'единый чек-лист локальной поставки и CI',
  },
];

export const buildDocumentCheckResult = (
  requiredDocument: RequiredDocument,
  status: 'missing' | 'empty' | 'ok',
): DocumentCheckResult => {
  switch (status) {
    case 'missing':
      return {
        fileName: requiredDocument.fileName,
        isValid: false,
        statusLine: `✗ ${requiredDocument.fileName} — отсутствует (${requiredDocument.purpose})`,
      };
    case 'empty':
      return {
        fileName: requiredDocument.fileName,
        isValid: false,
        statusLine: `✗ ${requiredDocument.fileName} — пустой файл (${requiredDocument.purpose})`,
      };
    case 'ok':
    default:
      return {
        fileName: requiredDocument.fileName,
        isValid: true,
        statusLine: `✓ ${requiredDocument.fileName}`,
      };
  }
};

export const resolvePreflightStatusMessage = (
  hasBlockingDocumentIssues: boolean,
  hasBlockingContentIssues: boolean,
): string => {
  if (hasBlockingDocumentIssues && hasBlockingContentIssues) {
    return 'Статус: preflight не пройден. Исправьте обязательные документы, контентные данные и баланс перед релизом.';
  }

  if (hasBlockingDocumentIssues) {
    return 'Статус: preflight не пройден. Исправьте обязательные документы перед релизом.';
  }

  if (hasBlockingContentIssues) {
    return 'Статус: preflight не пройден. Исправьте контентные данные и баланс перед релизом.';
  }

  return 'Статус: preflight пройден.';
};

export const evaluateReleasePreflight = (
  documentChecks: readonly DocumentCheckResult[],
  hasBlockingContentIssues: boolean,
): ReleasePreflightReport => {
  const hasBlockingDocumentIssues = documentChecks.some(({ isValid }) => !isValid);
  const statusMessage = resolvePreflightStatusMessage(hasBlockingDocumentIssues, hasBlockingContentIssues);

  return {
    documentChecks,
    hasBlockingDocumentIssues,
    hasBlockingContentIssues,
    statusMessage,
    exitCode: hasBlockingDocumentIssues || hasBlockingContentIssues ? 1 : 0,
  };
};
