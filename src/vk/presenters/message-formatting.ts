import type { AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import type { NextGoalView } from '../../modules/player/application/read-models/next-goal';
import { listSchoolDefinitions } from '../../modules/runes/domain/rune-schools';
import { isWorkshopBlueprintCode } from '../../modules/workshop/domain/workshop-catalog';
import type { BlueprintDelta, ResourceReward, RuneDraft } from '../../shared/types/game';
import { resolveWorkshopBlueprintTitle } from './workshopLabels';

interface AmountLabel {
  readonly one: string;
  readonly few: string;
  readonly many: string;
}

const inventoryFieldLabels: Readonly<Record<string, AmountLabel>> = {
  USUAL: { one: 'обычный осколок', few: 'обычных осколка', many: 'обычных осколков' },
  UNUSUAL: { one: 'необычный осколок', few: 'необычных осколка', many: 'необычных осколков' },
  RARE: { one: 'редкий осколок', few: 'редких осколка', many: 'редких осколков' },
  EPIC: { one: 'эпический осколок', few: 'эпических осколка', many: 'эпических осколков' },
  LEGENDARY: { one: 'легендарный осколок', few: 'легендарных осколка', many: 'легендарных осколков' },
  MYTHICAL: { one: 'мифический осколок', few: 'мифических осколка', many: 'мифических осколков' },
  usualShards: { one: 'обычный осколок', few: 'обычных осколка', many: 'обычных осколков' },
  unusualShards: { one: 'необычный осколок', few: 'необычных осколка', many: 'необычных осколков' },
  rareShards: { one: 'редкий осколок', few: 'редких осколка', many: 'редких осколков' },
  epicShards: { one: 'эпический осколок', few: 'эпических осколка', many: 'эпических осколков' },
  legendaryShards: { one: 'легендарный осколок', few: 'легендарных осколка', many: 'легендарных осколков' },
  mythicalShards: { one: 'мифический осколок', few: 'мифических осколка', many: 'мифических осколков' },
  leather: { one: 'кожа', few: 'кожи', many: 'кожи' },
  bone: { one: 'кость', few: 'кости', many: 'костей' },
  herb: { one: 'трава', few: 'травы', many: 'трав' },
  essence: { one: 'эссенция', few: 'эссенции', many: 'эссенций' },
  metal: { one: 'металл', few: 'металла', many: 'металла' },
  crystal: { one: 'кристалл', few: 'кристалла', many: 'кристаллов' },
  healingPills: { one: 'пилюля восстановления', few: 'пилюли восстановления', many: 'пилюль восстановления' },
  focusPills: { one: 'пилюля фокуса', few: 'пилюли фокуса', many: 'пилюль фокуса' },
  guardPills: { one: 'пилюля стойкости', few: 'пилюли стойкости', many: 'пилюль стойкости' },
  clarityPills: { one: 'пилюля ясности', few: 'пилюли ясности', many: 'пилюль ясности' },
};

export const withSentencePeriod = (text: string): string => /[.!?]$/.test(text) ? text : `${text}.`;

const trimHintPrefix = (text: string): string => (
  text
    .trim()
    .replace(/^💡\s*/u, '')
    .replace(/^🜂\s*/u, '')
    .replace(/^🎲\s*/u, '')
    .replace(/^Подсказка:\s*/iu, '')
);

export const renderHintLine = (text: string): string => (
  `💡 ${withSentencePeriod(trimHintPrefix(text))}`
);

export const renderHintBlock = (
  hints: readonly (string | null | undefined)[],
): string[] => {
  const hintLines = hints
    .filter((hint): hint is string => Boolean(hint?.trim()))
    .map(renderHintLine);

  return hintLines.length > 0 ? ['', ...hintLines] : [];
};

export const normalizeRuneDisplayName = (name: string): string => (
  name.replace(/руна\s+руна/gi, 'руна')
);

export const formatRuneDisplayName = (rune: Pick<RuneDraft, 'name'> | null | undefined): string => (
  rune ? normalizeRuneDisplayName(rune.name) : 'нет руны'
);

export const formatInventoryDelta = (delta: Record<string, number | undefined>): string => {
  const parts = Object.entries(delta)
    .reduce<string[]>((result, [field, amount]) => {
      if (amount === undefined || amount <= 0) {
        return result;
      }

      const label = formatInventoryFieldLabel(field, amount);
      return [...result, `+${amount} ${label}`];
    }, []);

  return parts.length > 0 ? parts.join(' · ') : 'без дополнительных материалов';
};

const formatBlueprintDelta = (delta: BlueprintDelta): string => {
  const parts = Object.entries(delta)
    .reduce<string[]>((result, [blueprintCode, amount]) => {
      if (amount === undefined || amount <= 0 || !isWorkshopBlueprintCode(blueprintCode)) {
        return result;
      }

      return [...result, `+${amount} чертеж «${resolveWorkshopBlueprintTitle(blueprintCode)}»`];
    }, []);

  return parts.length > 0 ? parts.join(' · ') : 'без чертежей';
};

const resolveAmountForm = (amount: number): keyof AmountLabel => {
  const absolute = Math.abs(amount);
  const remainder10 = absolute % 10;
  const remainder100 = absolute % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return 'one';
  }

  if (remainder10 >= 2 && remainder10 <= 4 && (remainder100 < 12 || remainder100 > 14)) {
    return 'few';
  }

  return 'many';
};

const formatInventoryFieldLabel = (field: string, amount: number): string => {
  const labels = inventoryFieldLabels[field];
  return labels ? labels[resolveAmountForm(amount)] : field;
};

export const formatResourceReward = (reward: ResourceReward): string => {
  const parts = [
    reward.gold !== undefined && reward.gold > 0 ? `+${reward.gold} пыли` : null,
    reward.radiance !== undefined && reward.radiance > 0 ? `+${reward.radiance} сияния` : null,
    reward.inventoryDelta ? formatInventoryDelta(reward.inventoryDelta) : null,
    reward.blueprintDelta ? formatBlueprintDelta(reward.blueprintDelta) : null,
  ].filter((part): part is string => (
    Boolean(part)
    && part !== 'без дополнительных материалов'
    && part !== 'без чертежей'
  ));

  return parts.length > 0 ? parts.join(' · ') : 'без награды';
};

export const renderAcquisitionSummary = (
  summary: AcquisitionSummaryView | null | undefined,
): string[] => {
  if (!summary) {
    return [];
  }

  return [
    '',
    `✨ ${withSentencePeriod(summary.title)}`,
    ...(summary.nextStepLine ? [`👉 ${withSentencePeriod(summary.nextStepLine)}`] : []),
    ...renderHintBlock([summary.changeLine]),
  ];
};

export const renderNextGoalSummary = (
  nextGoal: NextGoalView,
  actionPrefix = '👉 Сделать шаг',
): string[] => [
  `🎯 След: ${withSentencePeriod(nextGoal.objectiveText)}`,
  `${actionPrefix}: «${nextGoal.primaryActionLabel}».`,
  ...renderHintBlock([nextGoal.whyText]),
];

export const renderStarterSchoolLine = (): string => {
  const schoolNames = listSchoolDefinitions().map(({ name }) => name);
  return schoolNames.length > 0
    ? `🏫 Школы: ${schoolNames.join(', ')}.`
    : '🏫 Школы ждут первую руну.';
};
