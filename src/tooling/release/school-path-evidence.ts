import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

import { prisma } from '../../database/client';
import { buildSchoolPathEvidenceMarkdown, summarizeSchoolPathEvidence } from './school-path-evidence-generator';

const projectRoot = resolve(__dirname, '..', '..', '..');
const defaultOutputPath = resolve(projectRoot, 'docs', 'testing', 'school-path-evidence-report.md');

const parseOutputPath = (): string => {
  const outputIndex = process.argv.indexOf('--output');
  if (outputIndex === -1) {
    return defaultOutputPath;
  }

  const value = process.argv[outputIndex + 1];
  return value ? resolve(projectRoot, value) : defaultOutputPath;
};

const main = async (): Promise<void> => {
  const relevantActions = [
    'school_novice_elite_encounter_started',
    'school_novice_follow_up_action_taken',
    'reward_claim_applied',
  ];

  const logs = await prisma.gameLog.findMany({
    where: {
      action: {
        in: relevantActions,
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

  const markdown = buildSchoolPathEvidenceMarkdown(
    summarizeSchoolPathEvidence(logs),
    new Date().toISOString(),
  );
  const outputPath = parseOutputPath();
  writeFileSync(outputPath, `${markdown}\n`, 'utf8');

  console.log(markdown);
  console.log(`\nReport saved to ${outputPath}`);
};

main()
  .catch((error) => {
    console.error('School path evidence report failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
