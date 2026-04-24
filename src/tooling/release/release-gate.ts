import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ReleaseEvidenceFinding, ReleaseEvidenceFindingSeverity } from './release-evidence-generator';
import {
  evaluateReleaseGate,
  findReleaseDocumentIssues,
  parseManualDecisions,
  releaseGateSteps,
  type ReleaseDocumentInput,
  type ReleaseGateStep,
  type ReleaseGateStepResult,
} from './release-gate-lib';

interface NpmRunCommand {
  readonly command: string;
  readonly args: readonly string[];
}

type PlatformName = NodeJS.Platform;
type ReleaseGateRunner = (script: ReleaseGateStep) => ReleaseGateStepResult;

const projectRoot = resolve(__dirname, '..', '..', '..');
const evidenceReportPath = resolve(projectRoot, 'docs', 'testing', 'release-evidence-report.md');
const manualDecisionsPath = resolve(projectRoot, 'docs', 'release', 'manual-decisions.json');

const releaseDocumentPaths = [
  'README.md',
  'CHANGELOG.md',
  'PLAN.md',
  'RELEASE_CHECKLIST.md',
  'ARCHITECTURE.md',
  'docs/testing/manual-playtest-1-0.md',
  'docs/testing/release-evidence-report.md',
  'docs/testing/school-path-evidence-report.md',
  'docs/release/economy-source-sink-1-0.md',
  'docs/release/release-doc-sync-1-0.md',
  'docs/release/manual-decisions.json',
] as const;

export const buildNpmRunCommand = (
  script: string,
  platform: PlatformName = process.platform,
): NpmRunCommand => {
  if (platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', `npm run ${script}`],
    };
  }

  return {
    command: 'npm',
    args: ['run', script],
  };
};

export const runReleaseGateSteps = (
  runner: ReleaseGateRunner,
): readonly ReleaseGateStepResult[] => {
  const results: ReleaseGateStepResult[] = [];

  for (const script of releaseGateSteps) {
    const result = runner(script);
    results.push(result);

    if (result.exitCode !== 0) {
      break;
    }
  }

  return results;
};

const runNpmScript = (script: ReleaseGateStep): ReleaseGateStepResult => {
  const { command, args } = buildNpmRunCommand(script);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
  });

  if (result.error !== undefined) {
    console.error(`Не удалось запустить npm script ${script}: ${result.error.message}`);
  }

  return {
    script,
    exitCode: result.status ?? 1,
  };
};

const extractMarkdownSection = (markdown: string, title: string): string => {
  const sectionStart = markdown.indexOf(title);
  if (sectionStart < 0) {
    return '';
  }

  const afterTitle = markdown.slice(sectionStart + title.length);
  const nextSectionStart = afterTitle.search(/\n## /u);

  return nextSectionStart < 0 ? afterTitle : afterTitle.slice(0, nextSectionStart);
};

const parseMarkdownFindings = (
  markdown: string,
  title: string,
  severity: ReleaseEvidenceFindingSeverity,
): readonly ReleaseEvidenceFinding[] => (
  extractMarkdownSection(markdown, title)
    .split(/\r?\n/u)
    .map((line) => line.match(/^- `([^`]+)` [—-] (.+)$/u))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({
      id: match[1]!,
      severity,
      message: match[2]!,
    }))
);

const parseEvidenceFindingsFromMarkdown = (markdown: string): readonly ReleaseEvidenceFinding[] => {
  const parsedFindings = [
    ...parseMarkdownFindings(markdown, '## Blockers', 'blocker'),
    ...parseMarkdownFindings(markdown, '## Manual release-owner decisions', 'manual_decision'),
  ];

  if (parsedFindings.length > 0) {
    return parsedFindings;
  }

  if (markdown.includes('Статус: `insufficient_evidence`')) {
    return [{
      id: 'legacy-insufficient-evidence',
      severity: 'blocker',
      message: 'Legacy evidence report has insufficient_evidence status.',
    }];
  }

  if (markdown.includes('Статус: `warn`')) {
    return [{
      id: 'legacy-warn-evidence',
      severity: 'manual_decision',
      message: 'Legacy evidence report has warn status without explicit findings.',
    }];
  }

  return [];
};

const readManualDecisions = (): ReturnType<typeof parseManualDecisions> => (
  existsSync(manualDecisionsPath)
    ? parseManualDecisions(readFileSync(manualDecisionsPath, 'utf8'))
    : []
);

const readReleaseDocuments = (): {
  readonly documents: readonly ReleaseDocumentInput[];
  readonly issues: readonly string[];
} => {
  const documents: ReleaseDocumentInput[] = [];
  const issues: string[] = [];

  for (const relativePath of releaseDocumentPaths) {
    const absolutePath = resolve(projectRoot, relativePath);

    if (!existsSync(absolutePath)) {
      issues.push(`${relativePath} is missing`);
      continue;
    }

    if (statSync(absolutePath).size === 0) {
      issues.push(`${relativePath} is empty`);
      continue;
    }

    documents.push({
      path: relativePath,
      content: readFileSync(absolutePath, 'utf8'),
    });
  }

  return {
    documents,
    issues: [...issues, ...findReleaseDocumentIssues(documents)],
  };
};

const readEvidenceFindings = (): readonly ReleaseEvidenceFinding[] => {
  if (!existsSync(evidenceReportPath)) {
    return [{
      id: 'release-evidence-report-missing',
      severity: 'blocker',
      message: 'docs/testing/release-evidence-report.md is missing.',
    }];
  }

  return parseEvidenceFindingsFromMarkdown(readFileSync(evidenceReportPath, 'utf8'));
};

const printGateSummary = (
  stepResults: readonly ReleaseGateStepResult[],
  blockingReasons: readonly string[],
): void => {
  console.log('');
  console.log('Runemasters Return — release gate');
  console.log('');
  console.log('Шаги:');
  for (const result of stepResults) {
    console.log(`- ${result.script}: ${result.exitCode === 0 ? 'ok' : `failed (${result.exitCode})`}`);
  }
  console.log('');

  if (blockingReasons.length === 0) {
    console.log('Статус: release:gate пройден.');
    return;
  }

  console.log('Статус: release:gate не пройден.');
  console.log('Причины:');
  for (const reason of blockingReasons) {
    console.log(`- ${reason}`);
  }
};

const main = (): void => {
  const stepResults = runReleaseGateSteps(runNpmScript);
  const hasFailedStep = stepResults.some((result) => result.exitCode !== 0);
  const documentState = hasFailedStep
    ? { documents: [], issues: [] }
    : readReleaseDocuments();
  const evidenceFindings = hasFailedStep ? [] : readEvidenceFindings();
  const manualDecisions = hasFailedStep ? [] : readManualDecisions();
  const gate = evaluateReleaseGate({
    stepResults,
    evidenceFindings,
    manualDecisions,
    documentIssues: documentState.issues,
  });

  printGateSummary(stepResults, gate.blockingReasons);
  process.exitCode = gate.exitCode;
};

if (require.main === module) {
  main();
}
