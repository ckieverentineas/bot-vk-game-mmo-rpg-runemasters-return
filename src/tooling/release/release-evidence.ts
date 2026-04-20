import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

import { prisma } from '../../database/client';
import { parsePositiveIntegerArgument, resolveReleaseEvidenceWindow } from './release-evidence-cli-lib';
import {
  buildReleaseEvidenceMarkdown,
  releaseEvidenceTrackedActions,
  summarizeReleaseEvidence,
} from './release-evidence-generator';

const projectRoot = resolve(__dirname, '..', '..', '..');
const defaultOutputPath = resolve(projectRoot, 'docs', 'testing', 'release-evidence-report.md');

interface CliOptions {
  readonly outputPath: string;
  readonly sinceInput: string | null;
  readonly untilInput: string | null;
  readonly days: number | null;
}

const parseOutputArgument = (value: string | undefined): string => {
  if (!value) {
    throw new Error('Нужно передать путь после `--output`.');
  }

  return resolve(projectRoot, value);
};

const parseCliOptions = (): CliOptions => {
  const args = process.argv.slice(2);
  let outputPath = defaultOutputPath;
  let sinceInput: string | null = null;
  let untilInput: string | null = null;
  let days: number | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--output') {
      outputPath = parseOutputArgument(args[index + 1]);
      index += 1;
      continue;
    }

    if (argument === '--since') {
      sinceInput = args[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (argument === '--until') {
      untilInput = args[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (argument === '--days') {
      days = parsePositiveIntegerArgument(args[index + 1], '--days');
      index += 1;
    }
  }

  return {
    outputPath,
    sinceInput,
    untilInput,
    days,
  };
};

const main = async (): Promise<void> => {
  const options = parseCliOptions();
  const window = resolveReleaseEvidenceWindow({
    since: options.sinceInput,
    until: options.untilInput,
    days: options.days,
  });

  const logs = await prisma.gameLog.findMany({
    where: {
      action: {
        in: [...releaseEvidenceTrackedActions],
      },
      createdAt: {
        gte: window.since,
        lte: window.until,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      userId: true,
      action: true,
      details: true,
      createdAt: true,
    },
  });

  const markdown = buildReleaseEvidenceMarkdown(
    summarizeReleaseEvidence(logs, new Date().toISOString(), {
      requestedWindowStart: window.since.toISOString(),
      requestedWindowEnd: window.until.toISOString(),
    }),
  );
  writeFileSync(options.outputPath, `${markdown}\n`, 'utf8');

  console.log(markdown);
  console.log(`\nReport saved to ${options.outputPath}`);
};

main()
  .catch((error) => {
    console.error('Release evidence report failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
