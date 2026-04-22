import { buildPlayerNextGoalView } from '../../modules/player/application/read-models/next-goal';
import { buildPlayerSchoolRecognitionView } from '../../modules/player/application/read-models/school-recognition';
import {
  derivePlayerStats,
  getEquippedRune,
  getUnlockedRuneSlotCount,
  isPlayerInTutorial,
  resolveAdaptiveAdventureLocationLevel,
} from '../../modules/player/domain/player-stats';
import { getRuneSchoolPresentation } from '../../modules/runes/domain/rune-schools';
import type { PlayerState } from '../../shared/types/game';
import {
  formatRuneDisplayName,
  renderNextGoalSummary,
  renderStarterSchoolLine,
  withSentencePeriod,
} from './message-formatting';
import { renderSchoolMasteryLine } from './player-progress-formatting';

const renderSchoolFirstLoopLine = (): string => (
  'Путь первого входа: базовая атака → первая боевая руна → школа рун → новый стиль боя.'
);

const renderSchoolFirstRarityLine = (): string => (
  'Сначала первая руна открывает школу рун, а новая редкость позже расширяет сборку.'
);

const resolveReturnStateLine = (player: PlayerState): string => {
  if (player.tutorialState === 'ACTIVE') {
    return 'Путь: учебная тропа ещё горит · до первой руны и школы остался один бой.';
  }

  if (isPlayerInTutorial(player)) {
    return 'Путь: учебная зона остаётся безопасной стоянкой, но настоящая сила ждёт в приключениях.';
  }

  return [
    `Путь: уровень ${player.level}`,
    `зов угрозы ${resolveAdaptiveAdventureLocationLevel(player)}`,
    `самый дальний след ${player.highestLocationLevel}.`,
  ].join(' · ');
};

const resolveReturnStyleLine = (player: PlayerState): string => {
  const equippedRune = getEquippedRune(player);
  const equippedSchool = getRuneSchoolPresentation(equippedRune?.archetypeCode);

  if (!player.runes.length) {
    return 'Стиль: первая школа рун откроется после первой боевой руны.';
  }

  if (!equippedRune) {
    return 'Стиль: руны уже собраны, но ни одна ещё не надета.';
  }

  if (equippedSchool) {
    return `Стиль: ${equippedSchool.schoolLine} · роль ${equippedSchool.roleName.toLowerCase()}.`;
  }

  return `Стиль: экипирована руна ${formatRuneDisplayName(equippedRune)}.`;
};

export const renderReturnRecap = (player: PlayerState, title = '🧭 Возвращение'): string => {
  const nextGoal = buildPlayerNextGoalView(player);
  const recognition = buildPlayerSchoolRecognitionView(player);

  return [
    title,
    '',
    resolveReturnStateLine(player),
    resolveReturnStyleLine(player),
    ...(recognition ? [`Статус школы: ${withSentencePeriod(recognition.statusLine)}`] : []),
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
    'Добро пожаловать в мир мастеров рун.',
    '',
    'Ты помнишь холодный свет экрана.',
    'Последнее сообщение пришло без имени: «Если услышишь руну, не отвечай голосом. Ответь выбором».',
    'Потом мир погас.',
    '',
    'Ты просыпаешься на чёрной земле Рунного Предела. В ладони лежит тёплый осколок: он не светится, он дышит.',
    'Осколок шепчет: «Ты ещё не герой. Ты Пустой мастер. Именно поэтому руны могут ответить».',
    '',
    'Рядом дрожит Учебный огонёк. Учебный бой придётся пройти простым ударом.',
    renderSchoolFirstLoopLine(),
    renderSchoolFirstRarityLine(),
    renderStarterSchoolLine(),
    starterShardLine,
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
    '🏰 Стоянка рунного мастера',
    '',
    `⭐ Уровень: ${player.level}`,
    inTutorial
      ? '📘 Учебный круг: открыт'
      : `🎯 Зов угрозы: ${resolveAdaptiveAdventureLocationLevel(player)}`,
    `💰 Руная пыль: ${player.gold}`,
    `🧭 Самый дальний след: ${player.highestLocationLevel}`,
    `🧩 Слоты рун: ${getUnlockedRuneSlotCount(player)} открыто`,
    `🔮 Экипирована: ${formatRuneDisplayName(equippedRune)}`,
    renderSchoolMasteryLine(player),
    ...(player.tutorialState === 'ACTIVE'
      ? ['🜂 Первый бой ведёт к первой руне, а первая руна открывает школу рун.']
      : []),
    ...(equippedSchool
      ? [`🜂 Ваш путь: ${equippedSchool.schoolLine} · роль ${equippedSchool.roleName.toLowerCase()}.`]
      : []),
    player.defeatStreak > 0
      ? `🛡️ Поражений подряд: ${player.defeatStreak}. Сложность уже смягчена.`
      : `🔥 Побед подряд: ${player.victoryStreak}`,
    ...(recognition ? [`⭐ ${recognition.title}: ${withSentencePeriod(recognition.statusLine)}`] : []),
    ...renderNextGoalSummary(nextGoal),
    '',
    `⚔️ Боевая мощь: АТК ${stats.attack} / ЗДР ${stats.health}`,
  ].join('\n');
};

export const renderLocation = (player: PlayerState): string => {
  const tutorialStateLine = player.tutorialState === 'ACTIVE'
    ? 'Учебный круг ещё открыт: мир пока не знает твоего имени, а первая руна молчит до победы.'
    : player.tutorialState === 'SKIPPED'
      ? 'Учебный круг оставлен позади. Дорога силы идёт через «⚔️ Исследовать».'
      : 'Учебный круг завершён. Дорога силы идёт через «⚔️ Исследовать».';

  const tutorialProgressLine = player.tutorialState === 'ACTIVE'
    ? [
        'Перед тобой дрожит Учебный огонёк — слабый дух, который сторожит первую руну.',
        'Победи базовой атакой, забери первый знак и дай школе проявиться в бою.',
        renderStarterSchoolLine(),
      ].join(' ')
    : 'Старые учебные тропы больше не тянут героя назад. Дальше идут обычные приключения.';

  const defeatStreakLine = player.defeatStreak > 0
    ? [
        `🛡️ После поражений подряд (${player.defeatStreak}) враги становятся слабее,`,
        'чтобы следующий бой читался спокойнее.',
      ].join(' ')
    : `🔥 Серия побед подряд: ${player.victoryStreak}`;

  return [
    '📘 Учебный круг',
    '',
    tutorialStateLine,
    '',
    tutorialProgressLine,
    '',
    isPlayerInTutorial(player)
      ? 'Учебная зона тише большого мира: здесь удобно почувствовать первый бой.'
      : 'Дороги открыты. Угроза подстраивается под вашу силу и след последних боёв.',
    `🎯 Зов угрозы: ${resolveAdaptiveAdventureLocationLevel(player)}`,
    `🧭 Максимально пройденная сложность: ${player.highestLocationLevel}`,
    defeatStreakLine,
    ...renderNextGoalSummary(buildPlayerNextGoalView(player)),
  ].join('\n');
};
