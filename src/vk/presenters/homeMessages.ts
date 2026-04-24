import { buildPlayerNextGoalView } from '../../modules/player/application/read-models/next-goal';
import { buildPlayerSchoolRecognitionView } from '../../modules/player/application/read-models/school-recognition';
import {
  derivePlayerStats,
  derivePlayerVitals,
  getEquippedRune,
  getUnlockedRuneSlotCount,
  isPlayerInTutorial,
  resolveAdaptiveAdventureLocationLevel,
} from '../../modules/player/domain/player-stats';
import { getRuneSchoolPresentation } from '../../modules/runes/domain/rune-schools';
import type { PlayerState } from '../../shared/types/game';
import {
  formatCurrencyBalance,
  formatRuneDisplayName,
  renderHintBlock,
  renderNextGoalSummary,
  renderStarterSchoolLine,
  withSentencePeriod,
} from './message-formatting';

const renderSchoolFirstLoopLine = (): string => (
  'Маршрут: удар -> первая руна -> школа -> стиль боя.'
);

const renderSchoolFirstRarityLine = (): string => (
  'Редкость позже откроет новые рунные связки.'
);

const renderPlayerVitalsLine = (player: PlayerState): string => {
  const vitals = derivePlayerVitals(player, derivePlayerStats(player));

  return `❤️ ${vitals.currentHealth}/${vitals.maxHealth} HP · 🔷 ${vitals.currentMana}/${vitals.maxMana} маны`;
};

const resolveReturnStateLine = (player: PlayerState): string => {
  if (player.tutorialState === 'ACTIVE') {
    return '📘 Учебный бой · до первой руны один шаг.';
  }

  if (isPlayerInTutorial(player)) {
    return '📘 Учебный круг · безопасная стоянка.';
  }

  return [
    `⭐ ур. ${player.level}`,
    `🎯 угроза ${resolveAdaptiveAdventureLocationLevel(player)}`,
    `🧭 след ${player.highestLocationLevel}`,
  ].join(' · ');
};

const resolveReturnStyleLine = (player: PlayerState): string => {
  const equippedRune = getEquippedRune(player);
  const equippedSchool = getRuneSchoolPresentation(equippedRune?.archetypeCode);

  if (!player.runes.length) {
    return '🔮 Стиль: первая руна ещё впереди.';
  }

  if (!equippedRune) {
    return '🔮 Стиль: руны есть, но ничего не надето.';
  }

  if (equippedSchool) {
    return `🔮 ${equippedSchool.schoolLine} · ${equippedSchool.roleName.toLowerCase()}.`;
  }

  return `🔮 Руна: ${formatRuneDisplayName(equippedRune)}.`;
};

export const renderReturnRecap = (player: PlayerState, title = '🧭 Возвращение'): string => {
  const nextGoal = buildPlayerNextGoalView(player);
  const recognition = buildPlayerSchoolRecognitionView(player);

  return [
    title,
    '',
    resolveReturnStateLine(player),
    resolveReturnStyleLine(player),
    ...(recognition ? [`⭐ ${withSentencePeriod(recognition.statusLine)}`] : []),
    ...renderNextGoalSummary(nextGoal, '🧭 Дальше'),
  ].join('\n');
};

export const renderWelcome = (player: PlayerState, created: boolean): string => {
  if (!created) {
    return renderReturnRecap(player);
  }

  const nextGoal = buildPlayerNextGoalView(player);
  const starterShardLine = [
    `Стартовые осколки: обычные ${player.inventory.usualShards}`,
    `необычные ${player.inventory.unusualShards}`,
    `редкие ${player.inventory.rareShards}.`,
  ].join(', ');

  return [
    '🎮 Runemasters Return',
    '',
    'Предел зовёт. В ладони тёплый осколок.',
    'Рядом дрожит Учебный огонёк.',
    renderStarterSchoolLine(),
    `🎒 ${starterShardLine}`,
    ...renderHintBlock([
      renderSchoolFirstLoopLine(),
      renderSchoolFirstRarityLine(),
    ]),
    '',
    ...renderNextGoalSummary(nextGoal, '▶ Начать'),
  ].join('\n');
};

export const renderMainMenu = (player: PlayerState): string => {
  const stats = derivePlayerStats(player);
  const equippedRune = getEquippedRune(player);
  const inTutorial = isPlayerInTutorial(player);
  const equippedSchool = getRuneSchoolPresentation(equippedRune?.archetypeCode);
  const nextGoal = buildPlayerNextGoalView(player);
  const recognition = buildPlayerSchoolRecognitionView(player);

  return [
    '🏰 Стоянка',
    '',
    `⭐ Ур. ${player.level} · ${inTutorial ? '📘 обучение' : `🎯 угроза ${resolveAdaptiveAdventureLocationLevel(player)}`} · 🧭 след ${player.highestLocationLevel}`,
    formatCurrencyBalance(player),
    renderPlayerVitalsLine(player),
    `🧩 Слоты: ${getUnlockedRuneSlotCount(player)} · 🔮 ${formatRuneDisplayName(equippedRune)}`,
    player.defeatStreak > 0
      ? `🛡️ Поражений: ${player.defeatStreak} · маршрут мягче`
      : `🔥 Серия побед: ${player.victoryStreak}`,
    ...(recognition ? [`⭐ ${recognition.title}: ${withSentencePeriod(recognition.statusLine)}`] : []),
    ...renderNextGoalSummary(nextGoal),
    ...renderHintBlock([
      player.tutorialState === 'ACTIVE' ? 'Первый бой откроет руну и школу.' : null,
      equippedSchool ? `${equippedSchool.schoolLine} · ${equippedSchool.roleName.toLowerCase()}.` : null,
    ]),
    '',
    `⚔️ АТК ${stats.attack} · ❤️ ЗДР ${stats.health}`,
  ].join('\n');
};

export const renderLocation = (player: PlayerState): string => {
  const tutorialStateLine = player.tutorialState === 'ACTIVE'
    ? '📘 Учебный круг открыт.'
    : player.tutorialState === 'SKIPPED'
      ? '📘 Обучение пропущено.'
      : '📘 Обучение завершено.';

  const tutorialProgressLine = player.tutorialState === 'ACTIVE'
    ? [
        'Цель: победить Учебный огонёк.',
        'Награда: первая руна и школа.',
        renderStarterSchoolLine(),
      ].join(' ')
    : 'Дальше: обычное исследование.';

  const defeatStreakLine = player.defeatStreak > 0
    ? `🛡️ Поражений: ${player.defeatStreak} · враги мягче`
    : `🔥 Серия побед подряд: ${player.victoryStreak}`;

  return [
    '📘 Учебный круг',
    '',
    tutorialStateLine,
    tutorialProgressLine,
    '',
    `🎯 Зов угрозы: ${resolveAdaptiveAdventureLocationLevel(player)}`,
    renderPlayerVitalsLine(player),
    `🧭 Дальний след: ${player.highestLocationLevel}`,
    defeatStreakLine,
    ...renderNextGoalSummary(buildPlayerNextGoalView(player)),
  ].join('\n');
};
