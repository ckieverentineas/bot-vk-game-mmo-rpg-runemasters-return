import { gameBalance } from '../../config/game-balance';
import type { AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import {
  getEquippedRune,
  getRuneEquippedSlot,
  getSelectedRune,
  getUnlockedRuneSlotCount,
  normalizeRuneIndex,
} from '../../modules/player/domain/player-stats';
import { describeRuneContent } from '../../modules/runes/domain/rune-abilities';
import { buildRuneCollectionPage } from '../../modules/runes/domain/rune-collection';
import {
  getRuneSchoolPresentation,
  getSchoolDefinitionForArchetype,
} from '../../modules/runes/domain/rune-schools';
import type { AbilityDefinition, PlayerState, RuneView, StatBlock } from '../../shared/types/game';
import {
  formatRuneDisplayName,
  renderAcquisitionSummary,
  renderStarterSchoolLine,
  withSentencePeriod,
} from './message-formatting';

const runeStatSummaryOrder: readonly (keyof StatBlock)[] = [
  'attack',
  'health',
  'defence',
  'dexterity',
  'magicDefence',
  'intelligence',
];

const runeStatSummaryLabels: Record<keyof StatBlock, string> = {
  health: 'ЗДР',
  attack: 'АТК',
  defence: 'ФЗАЩ',
  magicDefence: 'МЗАЩ',
  dexterity: 'ЛВК',
  intelligence: 'ИНТ',
};

const schoolIconByCode: Readonly<Record<string, string>> = {
  ember: '🔥',
  stone: '🪨',
  gale: '🌪️',
  echo: '🧠',
};

const archetypeIconByCode: Readonly<Record<string, string>> = {
  ember: '⚔️',
  stone: '🛡️',
  gale: '💨',
  echo: '👁️',
};

const formatRuneStatSummary = (stats: StatBlock, limit = 3): string => {
  const parts = runeStatSummaryOrder
    .filter((key) => stats[key] > 0)
    .sort((left, right) => stats[right] - stats[left])
    .slice(0, limit)
    .map((key) => `${runeStatSummaryLabels[key]} +${stats[key]}`);

  return parts.length > 0 ? parts.join(' · ') : 'Без бонусов';
};

const resolveRuneSchoolIcon = (rune: Pick<RuneView, 'archetypeCode'>): string => {
  const school = getSchoolDefinitionForArchetype(rune.archetypeCode);
  return school ? schoolIconByCode[school.code] ?? '🔹' : '🔹';
};

const resolveRuneArchetypeIcon = (rune: Pick<RuneView, 'archetypeCode'>): string | null => {
  if (!rune.archetypeCode) {
    return null;
  }

  return archetypeIconByCode[rune.archetypeCode] ?? null;
};

const formatActiveAbilityCost = (ability: AbilityDefinition): string => [
  `${ability.manaCost} маны`,
  ability.cooldownTurns > 0 ? `КД ${ability.cooldownTurns}` : null,
].filter((part): part is string => part !== null).join(' · ');

const formatActiveAbilityDetails = (ability: AbilityDefinition): string => (
  `🌀 ${ability.name} · ${formatActiveAbilityCost(ability)}\n${withSentencePeriod(ability.description)}`
);

const formatPassiveAbilityDetails = (ability: AbilityDefinition): string => (
  `🛡️ ${ability.name}\n${withSentencePeriod(ability.description)}`
);

const formatRuneStatDetails = (stats: StatBlock): string[] => {
  const lines = runeStatSummaryOrder
    .filter((key) => stats[key] > 0)
    .map((key) => `${runeStatSummaryLabels[key]} +${stats[key]}`);

  return lines.length > 0
    ? ['Бонусы:', ...lines]
    : ['Бонусы: нет'];
};

const formatRuneAbilityDetails = (runeContent: ReturnType<typeof describeRuneContent>): string[] => [
  ...(runeContent.activeAbilities.length > 0
    ? ['Активный навык:', ...runeContent.activeAbilities.map(formatActiveAbilityDetails)]
    : []),
  ...(runeContent.passiveAbilities.length > 0
    ? ['Пассивные эффекты:', ...runeContent.passiveAbilities.map(formatPassiveAbilityDetails)]
    : []),
];

const formatRune = (rune: RuneView | null): string => {
  if (!rune) {
    return 'Выбрано: нет руны.';
  }

  const runeContent = describeRuneContent(rune);
  const school = getRuneSchoolPresentation(rune.archetypeCode);

  return [
    (() => {
      const equippedSlot = getRuneEquippedSlot(rune);
      if (equippedSlot !== null) {
        return `✅ Надета: слот ${equippedSlot + 1}`;
      }
      return '🎯 Выбрана';
    })(),
    `Руна: ${formatRuneDisplayName(rune)}`,
    `Редкость: ${gameBalance.runes.profiles[rune.rarity].title}${school ? ` · ${school.name}` : ''}`,
    ...(school ? [`Стиль: ${school.playPatternLine}`] : []),
    ...formatRuneStatDetails({
      health: rune.health,
      attack: rune.attack,
      defence: rune.defence,
      magicDefence: rune.magicDefence,
      dexterity: rune.dexterity,
      intelligence: rune.intelligence,
    }),
    ...formatRuneAbilityDetails(runeContent),
  ].join('\n');
};

const formatRunePageEntryStatus = (equippedSlot: number | null): string | null => {
  if (equippedSlot !== null) {
    return `✅ слот ${equippedSlot + 1}`;
  }

  return null;
};

const formatRunePageEntryRole = (rune: RuneView): string | null => {
  const school = getRuneSchoolPresentation(rune.archetypeCode);
  const archetypeIcon = resolveRuneArchetypeIcon(rune);

  if (!school) {
    return null;
  }

  return archetypeIcon ? `${archetypeIcon} ${school.roleName}` : school.roleName;
};

const formatRunePageEntry = (
  slot: number,
  rune: RuneView,
): string => {
  const school = getRuneSchoolPresentation(rune.archetypeCode);
  const status = formatRunePageEntryStatus(getRuneEquippedSlot(rune));

  return [
    `${slot + 1}. ${resolveRuneSchoolIcon(rune)} ${formatRuneDisplayName(rune)}`,
    ...(status ? [status] : []),
    school?.name ?? 'без школы',
    formatRunePageEntryRole(rune),
    formatRuneStatSummary(rune),
  ].filter((part): part is string => Boolean(part)).join(' · ');
};

const renderEquippedRuneSlots = (player: PlayerState): string => {
  const slotLines = Array.from({ length: getUnlockedRuneSlotCount(player) }, (_, slot) => {
    const rune = getEquippedRune(player, slot);
    return `${slot + 1}. ${rune ? formatRuneDisplayName(rune) : 'пусто'}`;
  });

  return `Надето: ${slotLines.join(' · ')}`;
};

const countEquippedRunes = (player: PlayerState): number => (
  Array.from({ length: getUnlockedRuneSlotCount(player) }, (_, slot) => getEquippedRune(player, slot))
    .filter((rune): rune is RuneView => rune !== null)
    .length
);

const renderEquippedRuneCounter = (player: PlayerState): string => {
  const unlockedSlotCount = getUnlockedRuneSlotCount(player);
  return `🧩 Рун надето ✅${countEquippedRunes(player)}/${unlockedSlotCount}`;
};

export const renderRuneScreen = (
  player: PlayerState,
  acquisitionSummary?: AcquisitionSummaryView | null,
): string => {
  const page = buildRuneCollectionPage(player);

  if (player.runes.length === 0) {
    return [
      '🔮 Руны',
      '',
      'У вас пока нет рун.',
      'Первая боевая руна откроет школу рун и задаст ваш ранний стиль боя.',
      renderStarterSchoolLine(),
      `Создание руны стоит ${gameBalance.runes.craftCost} осколков одной редкости.`,
      'Новая редкость позже расширит сборку, а сейчас важнее открыть первую школу рун.',
      'Победы и алтарь помогут собрать первую руну.',
    ].join('\n');
  }

  return [
    '🔮 Руны:',
    renderEquippedRuneCounter(player),
    ...renderAcquisitionSummary(acquisitionSummary),
    '',
    ...page.entries.map((entry) => formatRunePageEntry(entry.slot, entry.rune)),
    '',
    `Страница ${page.pageNumber} из ${page.totalPages}`,
  ].join('\n');
};

export const renderRuneDetailScreen = (
  player: PlayerState,
  acquisitionSummary?: AcquisitionSummaryView | null,
): string => {
  if (player.runes.length === 0) {
    return renderRuneScreen(player, acquisitionSummary);
  }

  const selectedRune = getSelectedRune(player);
  const selectedRuneNumber = normalizeRuneIndex(player.currentRuneIndex, player.runes.length) + 1;

  return [
    '🔮 Руна',
    '',
    `Руна ${selectedRuneNumber} из ${player.runes.length}`,
    renderEquippedRuneSlots(player),
    ...renderAcquisitionSummary(acquisitionSummary),
    '',
    formatRune(selectedRune),
  ].join('\n');
};

export const renderAltar = (
  player: PlayerState,
  acquisitionSummary?: AcquisitionSummaryView | null,
): string => (
  renderRuneDetailScreen(player, acquisitionSummary)
);
