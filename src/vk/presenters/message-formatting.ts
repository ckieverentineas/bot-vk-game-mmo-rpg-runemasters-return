import type { AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import type { NextGoalView } from '../../modules/player/application/read-models/next-goal';
import { listSchoolDefinitions } from '../../modules/runes/domain/rune-schools';
import type { RuneDraft } from '../../shared/types/game';

export const withSentencePeriod = (text: string): string => /[.!?]$/.test(text) ? text : `${text}.`;

export const normalizeRuneDisplayName = (name: string): string => (
  name.replace(/руна\s+руна/gi, 'руна')
);

export const formatRuneDisplayName = (rune: Pick<RuneDraft, 'name'> | null | undefined): string => (
  rune ? normalizeRuneDisplayName(rune.name) : 'нет руны'
);

export const renderAcquisitionSummary = (
  summary: AcquisitionSummaryView | null | undefined,
): string[] => {
  if (!summary) {
    return [];
  }

  return [
    '',
    `✨ Перемена: ${withSentencePeriod(summary.title)}`,
    ...(summary.nextStepLine ? [`👉 Следом: ${withSentencePeriod(summary.nextStepLine)}`] : []),
  ];
};

export const renderNextGoalSummary = (
  nextGoal: NextGoalView,
  actionPrefix = '👉 Сделать шаг',
): string[] => [
  `🎯 След: ${withSentencePeriod(nextGoal.objectiveText)}`,
  ...(nextGoal.whyText ? [`🜂 Зачем идти: ${withSentencePeriod(nextGoal.whyText)}`] : []),
  `${actionPrefix}: «${nextGoal.primaryActionLabel}».`,
];

export const renderStarterSchoolLine = (): string => {
  const schoolNames = listSchoolDefinitions().map(({ name }) => name);
  return schoolNames.length > 0
    ? `Стартовые школы: ${schoolNames.join(', ')}.`
    : 'Стартовые школы уже ждут первую боевую руну.';
};
