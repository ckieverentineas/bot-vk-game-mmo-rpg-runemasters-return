import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { readGitCommitCount } from './read-git-commit-count';
import {
  buildReleaseSummaryMarkdown,
  buildReleaseSummarySections,
  inferCommitRangeFromChangelog,
  type GitCommitEntry,
} from './release-summary-generator';
import { formatReleaseVersion } from './versioning';

interface CliOptions {
  readonly range: string | null;
  readonly outputPath: string | null;
}

const projectRoot = resolve(__dirname, '..', '..', '..');
const changelogFileName = 'CHANGELOG.md';
const changelogPath = resolve(projectRoot, 'CHANGELOG.md');
const gitRevisionRangePattern = /^[\w@][\w./\-:^~@{}]*(?:\.{2,3}[\w@][\w./\-:^~@{}]*)?$/;

const runGitCommand = (argumentsList: readonly string[]): string => (
  execFileSync('git', argumentsList, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
);

const validateGitRevisionRange = (value: string): string => {
  const normalizedValue = value.trim();

  if (!gitRevisionRangePattern.test(normalizedValue)) {
    throw new Error(`Некорректный git-диапазон: ${value}`);
  }

  return normalizedValue;
};

const parseCliOptions = (): CliOptions => {
  const args = process.argv.slice(2);
  let range: string | null = null;
  let outputPath: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--range') {
      range = args[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (argument === '--output') {
      outputPath = args[index + 1] ?? null;
      index += 1;
    }
  }

  return { range, outputPath };
};

const readReleaseBaselineChangelog = (): string => {
  try {
    return runGitCommand(['show', `HEAD:${changelogFileName}`]);
  } catch {
    return readFileSync(changelogPath, 'utf8');
  }
};

const readCommitEntries = (range: string): GitCommitEntry[] => {
  const validatedRange = validateGitRevisionRange(range);
  const rawValue = runGitCommand(['log', '--pretty=format:%H%x09%s', validatedRange]);

  if (!rawValue) {
    return [];
  }

  return rawValue.split(/\r?\n/).flatMap((line) => {
    const [hash, subject] = line.split('\t');

    if (!hash || !subject) {
      return [];
    }

    return [{ hash, subject } satisfies GitCommitEntry];
  });
};

const currentCommitCount = readGitCommitCount();
const options = parseCliOptions();
const resolvedRange = options.range
  ? validateGitRevisionRange(options.range)
  : inferCommitRangeFromChangelog(currentCommitCount, readReleaseBaselineChangelog());
const summary = buildReleaseSummaryMarkdown({
  version: formatReleaseVersion(currentCommitCount),
  commitCount: currentCommitCount,
  range: resolvedRange,
  sections: buildReleaseSummarySections(resolvedRange ? readCommitEntries(resolvedRange) : []),
});

if (options.outputPath) {
  writeFileSync(resolve(projectRoot, options.outputPath), `${summary}\n`, 'utf8');
}

console.log(summary);
