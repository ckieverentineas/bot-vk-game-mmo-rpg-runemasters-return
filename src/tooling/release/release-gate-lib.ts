import type { ReleaseEvidenceFinding } from './release-evidence-generator';

export const releaseGateSteps = [
  'db:generate',
  'db:deploy',
  'check',
  'release:local-playtest',
  'release:school-evidence',
  'release:evidence',
  'release:preflight',
] as const;

export type ReleaseGateStep = typeof releaseGateSteps[number];

export interface ReleaseGateStepResult {
  readonly script: ReleaseGateStep | string;
  readonly exitCode: number;
}

export interface ManualReleaseDecision {
  readonly id: string;
  readonly owner: string;
  readonly date: string;
  readonly decision: 'accepted_for_1_0';
  readonly reason: string;
  readonly followUp: string;
}

export interface ReleaseDocumentInput {
  readonly path: string;
  readonly content: string;
}

export interface ReleaseGateEvaluationInput {
  readonly stepResults: readonly ReleaseGateStepResult[];
  readonly evidenceFindings: readonly ReleaseEvidenceFinding[];
  readonly manualDecisions: readonly ManualReleaseDecision[];
  readonly documentIssues: readonly string[];
}

export interface ReleaseGateEvaluation {
  readonly exitCode: number;
  readonly blockingReasons: readonly string[];
}

const redMarkers = [
  'TODO',
  'TBD',
  'FIXME',
  'insufficient_evidence',
  'Not covered',
  'не проверено',
  'не закрыто',
  'релиз не готов',
  'warn и ладно',
] as const;

const manualPlaytestSections = [
  'Первый запуск',
  'Исследование',
  'Бой',
  'Поражение и восстановление',
  'Награды',
  'Руны',
  'Бестиарий',
  'Квесты',
  'Алхимия и мастерская',
  'Пати',
  'Экономика',
] as const;

const internalManualPlaytestWords = [
  'payload',
  'stateKey',
  'GameLog',
  'handler',
  'ledger',
  'telemetry',
] as const;

const economyContours = [
  'квесты',
  'daily trace',
  'бой/трофеи',
  'расходники',
  'руны',
  'мастерская',
] as const;

const docSyncSections = [
  'Что 1.0 обещает',
  'Что уже сделано',
  'Что остаётся после релиза',
  'Какие команды запускать',
] as const;

const canonicalGateCommands = releaseGateSteps.map((step) => `npm run ${step}`);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const hasText = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const isAcceptedManualDecision = (value: unknown): value is ManualReleaseDecision => (
  isRecord(value)
  && hasText(value.id)
  && hasText(value.owner)
  && hasText(value.date)
  && value.decision === 'accepted_for_1_0'
  && hasText(value.reason)
  && hasText(value.followUp)
);

export const parseManualDecisions = (content: string): readonly ManualReleaseDecision[] => {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed.filter(isAcceptedManualDecision) : [];
  } catch {
    return [];
  }
};

export const resolveManualDecisionIssues = (
  findings: readonly ReleaseEvidenceFinding[],
  decisions: readonly ManualReleaseDecision[],
): readonly string[] => {
  const acceptedDecisionIds = new Set(decisions.map((decision) => decision.id));

  return findings
    .filter((finding) => finding.severity === 'manual_decision')
    .filter((finding) => !acceptedDecisionIds.has(finding.id))
    .map((finding) => `manual decision missing for ${finding.id}`);
};

const findRedMarkerIssues = (document: ReleaseDocumentInput): readonly string[] => (
  redMarkers
    .filter((marker) => document.content.includes(marker))
    .map((marker) => `${document.path} contains red marker ${marker}`)
);

const findManualPlaytestIssues = (document: ReleaseDocumentInput): readonly string[] => {
  if (document.path !== 'docs/testing/manual-playtest-1-0.md') {
    return [];
  }

  const missingSections = manualPlaytestSections
    .filter((section) => !document.content.includes(section))
    .map((section) => `${document.path} missing section ${section}`);

  const lowerContent = document.content.toLowerCase();
  const internalWords = internalManualPlaytestWords
    .filter((word) => lowerContent.includes(word.toLowerCase()))
    .map((word) => `${document.path} contains internal word ${word}`);

  return [...missingSections, ...internalWords];
};

const findEconomyIssues = (document: ReleaseDocumentInput): readonly string[] => {
  if (document.path !== 'docs/release/economy-source-sink-1-0.md') {
    return [];
  }

  const lowerContent = document.content.toLowerCase();

  return economyContours
    .filter((contour) => !lowerContent.includes(contour))
    .map((contour) => `${document.path} missing contour ${contour}`);
};

const findDocSyncIssues = (document: ReleaseDocumentInput): readonly string[] => {
  if (document.path !== 'docs/release/release-doc-sync-1-0.md') {
    return [];
  }

  const sectionIssues = docSyncSections
    .filter((section) => !document.content.includes(section))
    .map((section) => `${document.path} missing section ${section}`);

  const commandIssues = canonicalGateCommands
    .filter((command) => !document.content.includes(command))
    .map((command) => `${document.path} missing command ${command}`);

  return [...sectionIssues, ...commandIssues];
};

const findCanonicalCommandIssues = (document: ReleaseDocumentInput): readonly string[] => {
  if (!['README.md', 'CHANGELOG.md', 'PLAN.md', 'RELEASE_CHECKLIST.md'].includes(document.path)) {
    return [];
  }

  return document.content.includes('npm run release:gate')
    ? []
    : [`${document.path} missing command npm run release:gate`];
};

export const findReleaseDocumentIssues = (
  documents: readonly ReleaseDocumentInput[],
): readonly string[] => documents.flatMap((document) => [
  ...findRedMarkerIssues(document),
  ...findManualPlaytestIssues(document),
  ...findEconomyIssues(document),
  ...findDocSyncIssues(document),
  ...findCanonicalCommandIssues(document),
]);

export const evaluateReleaseGate = (input: ReleaseGateEvaluationInput): ReleaseGateEvaluation => {
  const failedStepReasons = input.stepResults
    .filter((result) => result.exitCode !== 0)
    .map((result) => `step ${result.script} failed with exit code ${result.exitCode}`);

  const evidenceBlockers = input.evidenceFindings
    .filter((finding) => finding.severity === 'blocker')
    .map((finding) => `evidence blocker ${finding.id}`);

  const manualDecisionIssues = resolveManualDecisionIssues(input.evidenceFindings, input.manualDecisions);
  const blockingReasons = [
    ...failedStepReasons,
    ...evidenceBlockers,
    ...manualDecisionIssues,
    ...input.documentIssues,
  ];

  return {
    exitCode: blockingReasons.length > 0 ? 1 : 0,
    blockingReasons,
  };
};
