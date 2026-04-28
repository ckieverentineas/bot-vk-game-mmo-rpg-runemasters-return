import type { AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import type { NextGoalView } from '../../modules/player/application/read-models/next-goal';
import { listSchoolDefinitions } from '../../modules/runes/domain/rune-schools';
import { isWorkshopBlueprintCode } from '../../modules/workshop/domain/workshop-catalog';
import type { BlueprintDelta, BlueprintDrop, ResourceReward, RuneDraft } from '../../shared/types/game';
import { resolveWorkshopBlueprintTitle } from './workshopLabels';

interface AmountLabel {
  readonly one: string;
  readonly few: string;
  readonly many: string;
}

export type RussianPluralForms = readonly [one: string, few: string, many: string];
export type CurrencyBalanceOrder = 'gold-first' | 'radiance-first';

interface CurrencyBalance {
  readonly gold: number;
  readonly radiance: number;
}

interface BattleRewardLike {
  readonly experience: number;
  readonly gold: number;
  readonly shards: Partial<Record<string, number>>;
  readonly droppedRune: RuneDraft | null;
}

interface BattleRewardFormatOptions {
  readonly includeShards?: boolean;
  readonly includeDroppedRune?: boolean;
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

export const selectRussianPluralForm = (count: number, forms: RussianPluralForms): string => {
  const absoluteCount = Math.abs(count);
  const remainder100 = absoluteCount % 100;

  if (remainder100 >= 11 && remainder100 <= 14) {
    return forms[2];
  }

  const remainder10 = absoluteCount % 10;

  if (remainder10 === 1) {
    return forms[0];
  }

  if (remainder10 >= 2 && remainder10 <= 4) {
    return forms[1];
  }

  return forms[2];
};

export const formatCountPhrase = (count: number, forms: RussianPluralForms): string => (
  `${count} ${selectRussianPluralForm(count, forms)}`
);

export const formatProgressCounter = (current: number, required: number): string => (
  `${current}/${required}`
);

export const formatExperienceAmount = (experience: number): string => `${experience} опыта`;

export const formatDustAmount = (gold: number): string => `${gold} пыли`;

export const formatRadianceAmount = (radiance: number): string => `${radiance} сияния`;

export const formatExperienceReward = (experience: number): string => (
  `+${formatExperienceAmount(experience)}`
);

export const formatDustReward = (gold: number): string => (
  `+${formatDustAmount(gold)}`
);

export const formatRadianceReward = (radiance: number): string => (
  `+${formatRadianceAmount(radiance)}`
);

export const formatCurrencyBalance = (
  balance: CurrencyBalance,
  order: CurrencyBalanceOrder = 'gold-first',
): string => {
  const parts = order === 'gold-first'
    ? [`💰 ${formatDustAmount(balance.gold)}`, `✨ ${formatRadianceAmount(balance.radiance)}`]
    : [`✨ ${formatRadianceAmount(balance.radiance)}`, `💰 ${formatDustAmount(balance.gold)}`];

  return parts.join(' · ');
};

export const renderGoalLine = (objectiveText: string): string => (
  `🎯 След: ${withSentencePeriod(objectiveText)}`
);

export const renderPrimaryActionLine = (
  actionLabel: string,
  actionPrefix = '👉 Сделать шаг',
): string => (
  `${actionPrefix}: «${actionLabel}».`
);

const trimActionPrefixIcon = (actionPrefix: string): string => {
  const trimmedPrefix = actionPrefix.trim().replace(/^[^А-Яа-яA-Za-z0-9]+/u, '').trim();
  return trimmedPrefix.length > 0 ? trimmedPrefix : 'Дальше';
};

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

const normalizeBlueprintDropQuantity = (quantity: number | undefined): number => {
  if (quantity === undefined) {
    return 1;
  }

  return Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
};

const formatBlueprintDrops = (drops: readonly BlueprintDrop[]): string => {
  const parts = drops.reduce<string[]>((result, drop) => {
    if (!isWorkshopBlueprintCode(drop.blueprintCode)) {
      return result;
    }

    const quantity = normalizeBlueprintDropQuantity(drop.quantity);
    if (quantity <= 0) {
      return result;
    }

    return [
      ...result,
      `+${formatCountPhrase(quantity, ['чертеж', 'чертежа', 'чертежей'])} «${resolveWorkshopBlueprintTitle(drop.blueprintCode)}»`,
    ];
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
    reward.gold !== undefined && reward.gold > 0 ? formatDustReward(reward.gold) : null,
    reward.radiance !== undefined && reward.radiance > 0 ? formatRadianceReward(reward.radiance) : null,
    reward.inventoryDelta ? formatInventoryDelta(reward.inventoryDelta) : null,
    reward.blueprintDelta ? formatBlueprintDelta(reward.blueprintDelta) : null,
    reward.blueprintDrops ? formatBlueprintDrops(reward.blueprintDrops) : null,
  ].filter((part): part is string => (
    Boolean(part)
    && part !== 'без дополнительных материалов'
    && part !== 'без чертежей'
  ));

  return parts.length > 0 ? parts.join(' · ') : 'без награды';
};

export const formatBattleReward = (
  reward: BattleRewardLike,
  options: BattleRewardFormatOptions = {},
): string => {
  const includeShards = options.includeShards ?? true;
  const includeDroppedRune = options.includeDroppedRune ?? true;
  const shardLine = includeShards ? formatInventoryDelta(reward.shards) : null;
  const parts = [
    formatExperienceReward(reward.experience),
    formatDustReward(reward.gold),
    shardLine,
    includeDroppedRune && reward.droppedRune ? `руна: ${formatRuneDisplayName(reward.droppedRune)}` : null,
  ].filter((part): part is string => (
    Boolean(part)
    && part !== 'без дополнительных материалов'
  ));

  return parts.join(' · ');
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
    ...renderHintBlock([summary.nextStepLine, summary.changeLine]),
  ];
};

export const renderNextGoalSummary = (
  nextGoal: NextGoalView,
  actionPrefix = '👉 Сделать шаг',
): string[] => renderHintBlock([
  `След: ${withSentencePeriod(nextGoal.objectiveText)}`,
  `${trimActionPrefixIcon(actionPrefix)}: «${nextGoal.primaryActionLabel}»`,
]);

export const renderStarterSchoolLine = (): string => {
  const schoolNames = listSchoolDefinitions().map(({ name }) => name);
  return schoolNames.length > 0
    ? `🏫 Школы: ${schoolNames.join(', ')}.`
    : '🏫 Школы ждут первую руну.';
};
