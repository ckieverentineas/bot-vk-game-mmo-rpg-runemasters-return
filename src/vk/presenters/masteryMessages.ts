import {
  buildSchoolMasteryOverviewView,
  type SchoolMasteryMilestoneOverview,
  type SchoolMasteryOverviewStatus,
  type SchoolMasterySchoolOverview,
} from '../../modules/player/application/read-models/school-mastery-overview';
import type { PlayerState } from '../../shared/types/game';

const schoolIconByCode: Readonly<Record<string, string>> = {
  ember: '🔥',
  stone: '🪨',
  gale: '🌪️',
  echo: '🧠',
};

const statusLabelByStatus: Readonly<Record<SchoolMasteryOverviewStatus, string>> = {
  current: 'текущая',
  opened: 'открыта',
  closed: 'закрыта',
};

const milestoneMarkerByStatus: Readonly<Record<SchoolMasteryMilestoneOverview['status'], string>> = {
  unlocked: '✓',
  next: '→',
  locked: '·',
};

const formatSchoolHeader = (school: SchoolMasterySchoolOverview): string => {
  const icon = schoolIconByCode[school.schoolCode] ?? '📜';
  const status = statusLabelByStatus[school.status];

  return `${icon} ${school.name} · ${status} · ранг ${school.rank} · ${school.experience} опыта`;
};

const formatMilestoneLine = (milestone: SchoolMasteryMilestoneOverview): string => {
  const marker = milestoneMarkerByStatus[milestone.status];
  return `${marker} ${milestone.progressText} · ${milestone.title}: ${milestone.description}`;
};

const formatSchoolBlock = (school: SchoolMasterySchoolOverview): readonly string[] => [
  formatSchoolHeader(school),
  ...school.milestones.map(formatMilestoneLine),
];

export const renderSchoolMastery = (player: PlayerState): string => {
  const overview = buildSchoolMasteryOverviewView(player);

  return [
    '📜 Мастерство',
    '',
    'Школы растут от побед с надетой руной. Здесь видно, что уже открыто, что ближе всего и что пока закрыто.',
    '',
    ...overview.schools.flatMap((school, index): readonly string[] => [
      ...formatSchoolBlock(school),
      ...(index < overview.schools.length - 1 ? [''] : []),
    ]),
  ].join('\n');
};
