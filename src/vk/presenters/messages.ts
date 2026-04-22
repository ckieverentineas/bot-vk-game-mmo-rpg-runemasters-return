import { gameBalance } from '../../config/game-balance';
import {
  derivePlayerStats,
  getEquippedRune,
  getUnlockedRuneSlotCount,
  isPlayerInTutorial,
  resolveAdaptiveAdventureLocationLevel,
} from '../../modules/player/domain/player-stats';
import {
  getPlayerSchoolMasteryForArchetype,
  getSchoolMasteryDefinition,
  resolveNextSchoolMasteryThreshold,
} from '../../modules/player/domain/school-mastery';
import { buildPlayerNextGoalView } from '../../modules/player/application/read-models/next-goal';
import { buildPlayerSchoolRecognitionView } from '../../modules/player/application/read-models/school-recognition';
import {
  getRuneSchoolPresentation,
} from '../../modules/runes/domain/rune-schools';
import {
  getPlayerSkillDefinition,
  resolveNextPlayerSkillThreshold,
} from '../../modules/player/domain/player-skills';
import {
  getExplorationSceneEffectLine,
  type ExplorationSceneView,
} from '../../modules/world/domain/exploration-events';
import type { PlayerState, StatBlock } from '../../shared/types/game';
import {
  formatRuneDisplayName,
  renderNextGoalSummary,
  renderStarterSchoolLine,
  withSentencePeriod,
} from './message-formatting';

export { renderBattle } from './battleMessages';

export {
  renderAltar,
  renderRuneDetailScreen,
  renderRuneScreen,
} from './runeMessages';

export {
  renderCollectedPendingReward,
  renderPendingReward,
} from './rewardMessages';

const formatStatBlock = (stats: StatBlock): string => [
  `❤️ Здоровье: ${stats.health}`,
  `⚔️ Атака: ${stats.attack}`,
  `🛡️ Физ. защита: ${stats.defence}`,
  `🔮 Маг. защита: ${stats.magicDefence}`,
  `💨 Ловкость: ${stats.dexterity}`,
  `🧠 Интеллект: ${stats.intelligence}`,
].join('\n');

const renderSchoolFirstLoopLine = (): string => 'Путь первого входа: базовая атака → первая боевая руна → школа рун → новый стиль боя.';
const renderSchoolFirstRarityLine = (): string => 'Сначала первая руна открывает школу рун, а новая редкость позже расширяет сборку.';

const formatPlayerSkillProgress = (skill: NonNullable<PlayerState['skills']>[number]): string => {
  const definition = getPlayerSkillDefinition(skill.skillCode);
  const nextThreshold = resolveNextPlayerSkillThreshold(skill.rank);
  const progress = nextThreshold === null
    ? `${skill.experience} опыта`
    : `${skill.experience}/${nextThreshold}`;

  return `${definition?.title ?? skill.skillCode}: ранг ${skill.rank} · ${progress}`;
};

const renderPlayerSkillsBlock = (player: PlayerState): readonly string[] => {
  const skills = [...(player.skills ?? [])].sort((left, right) => (
    right.experience - left.experience || left.skillCode.localeCompare(right.skillCode)
  ));

  if (skills.length === 0) {
    return ['Навыки: пока нет опыта обработки трофеев.'];
  }

  return [
    'Навыки:',
    ...skills.map(formatPlayerSkillProgress),
  ];
};

const renderSchoolMasteryLine = (player: PlayerState): string => {
  if (player.runes.length === 0) {
    return 'Мастерство школы: откроется после первой боевой руны.';
  }

  const equippedRune = getEquippedRune(player);
  const equippedSchool = getRuneSchoolPresentation(equippedRune?.archetypeCode);
  const mastery = getPlayerSchoolMasteryForArchetype(player, equippedRune?.archetypeCode);
  if (!equippedRune || !equippedSchool || !mastery) {
    return 'Мастерство школы: наденьте руну, чтобы начать путь конкретной школы.';
  }

  const definition = getSchoolMasteryDefinition(mastery.schoolCode);
  const nextThreshold = resolveNextSchoolMasteryThreshold(mastery.rank);
  const nextUnlock = definition?.unlocks.find((entry) => entry.rank === mastery.rank + 1) ?? null;
  const currentUnlock = definition?.unlocks.find((entry) => entry.rank === mastery.rank) ?? null;

  if (nextThreshold === null) {
    return `Мастерство школы: ${equippedSchool.name} · ранг ${mastery.rank}${currentUnlock ? ` · открыто: ${currentUnlock.title}.` : '.'}`;
  }

  return `Мастерство школы: ${equippedSchool.name} · ранг ${mastery.rank} · ${mastery.experience}/${nextThreshold} до «${nextUnlock?.title ?? 'новой вехи'}».`;
};

const resolveReturnStateLine = (player: PlayerState): string => {
  if (player.tutorialState === 'ACTIVE') {
    return 'Путь: учебная тропа ещё горит · до первой руны и школы остался один бой.';
  }

  if (isPlayerInTutorial(player)) {
    return 'Путь: учебная зона остаётся безопасной стоянкой, но настоящая сила ждёт в приключениях.';
  }

  return `Путь: уровень ${player.level} · зов угрозы ${resolveAdaptiveAdventureLocationLevel(player)} · самый дальний след ${player.highestLocationLevel}.`;
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
  if (created) {
    const nextGoal = buildPlayerNextGoalView(player);

    return [
      '🎮 Добро пожаловать в Runemasters Return!',
      '',
      'Ваш мастер создан.',
      'Сначала — короткий учебный бой.',
      renderSchoolFirstLoopLine(),
      renderSchoolFirstRarityLine(),
      renderStarterSchoolLine(),
      `Стартовые осколки: обычные ${player.inventory.usualShards}, необычные ${player.inventory.unusualShards}, редкие ${player.inventory.rareShards}.`,
      '',
      ...renderNextGoalSummary(nextGoal, '▶ Начать'),
    ].join('\n');
  }

  return renderReturnRecap(player);
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
    ...(player.tutorialState === 'ACTIVE' ? ['🜂 Первый бой ведёт к первой руне, а первая руна открывает школу рун.'] : []),
    ...(equippedSchool ? [`🜂 Ваш путь: ${equippedSchool.schoolLine} · роль ${equippedSchool.roleName.toLowerCase()}.`] : []),
    player.defeatStreak > 0
      ? `🛡️ Поражений подряд: ${player.defeatStreak}. Сложность уже смягчена.`
      : `🔥 Побед подряд: ${player.victoryStreak}`,
    ...(recognition ? [`⭐ ${recognition.title}: ${withSentencePeriod(recognition.statusLine)}`] : []),
    ...renderNextGoalSummary(nextGoal),
    '',
    `⚔️ Боевая мощь: АТК ${stats.attack} / ЗДР ${stats.health}`,
  ].join('\n');
};

export const renderProfile = (player: PlayerState): string => {
  const stats = derivePlayerStats(player);
  const nextLevelXp = gameBalance.progression.experienceForNextLevel(player.level);

  return [
    '👤 Летопись рунного мастера',
    '',
    `⭐ Уровень: ${player.level}`,
    `📊 Опыт: ${player.experience}/${nextLevelXp}`,
    `💰 Руная пыль: ${player.gold}`,
    `🏆 Победы / Поражения: ${player.victories}/${player.defeats}`,
    `🧩 Слоты рун: ${getUnlockedRuneSlotCount(player)} открыто`,
    renderSchoolMasteryLine(player),
    'Сила растёт через руны, школу и мастерство, а не через сухую раздачу чисел.',
    '',
    ...renderPlayerSkillsBlock(player),
    '',
    formatStatBlock(stats),
  ].join('\n');
};

export const renderInventory = (player: PlayerState): string => [
  '🎒 Инвентарь',
  '',
  `Обычные осколки: ${player.inventory.usualShards}`,
  `Необычные осколки: ${player.inventory.unusualShards}`,
  `Редкие осколки: ${player.inventory.rareShards}`,
  `Эпические осколки: ${player.inventory.epicShards}`,
  `Легендарные осколки: ${player.inventory.legendaryShards}`,
  `Мифические осколки: ${player.inventory.mythicalShards}`,
  '',
  `Кожа: ${player.inventory.leather}, Кость: ${player.inventory.bone}, Трава: ${player.inventory.herb}`,
  `Эссенция: ${player.inventory.essence}, Металл: ${player.inventory.metal}, Кристалл: ${player.inventory.crystal}`,
].join('\n');

export const renderLocation = (player: PlayerState): string => [
  '📘 Учебный круг',
  '',
  player.tutorialState === 'ACTIVE'
    ? 'Учебный круг ещё открыт: первый бой безопасен, а первая руна покажет школу.'
    : player.tutorialState === 'SKIPPED'
      ? 'Учебный круг оставлен позади. Дорога силы идёт через «⚔️ Исследовать».'
      : 'Учебный круг завершён. Дорога силы идёт через «⚔️ Исследовать».',
  '',
  player.tutorialState === 'ACTIVE'
    ? `Сначала мастер проходит бой базовой атакой, затем забирает первую руну и видит, как школа меняет стиль боя. ${renderStarterSchoolLine()}`
    : 'Старые учебные тропы больше не тянут героя назад. Дальше идут обычные приключения.',
  '',
  isPlayerInTutorial(player)
    ? 'Учебная зона тише большого мира: здесь удобно почувствовать первый бой.'
    : 'Дороги открыты. Угроза подстраивается под вашу силу и след последних боёв.',
  `🎯 Зов угрозы: ${resolveAdaptiveAdventureLocationLevel(player)}`,
  `🧭 Максимально пройденная сложность: ${player.highestLocationLevel}`,
  player.defeatStreak > 0
    ? `🛡️ После поражений подряд (${player.defeatStreak}) враги становятся слабее, чтобы следующий бой читался спокойнее.`
    : `🔥 Серия побед подряд: ${player.victoryStreak}`,
  ...renderNextGoalSummary(buildPlayerNextGoalView(player)),
].join('\n');

export const renderExplorationEvent = (event: ExplorationSceneView, player: PlayerState): string => {
  const effectLine = getExplorationSceneEffectLine(event);

  return [
    '🧭 Исследование',
    '',
    event.title,
    ...(event.kindLabel ? [`Знак: ${event.kindLabel}`] : []),
    ...(event.directorLine ? [event.directorLine] : []),
    event.description,
    '',
    event.outcomeLine,
    ...(effectLine ? [effectLine] : []),
    event.nextStepLine,
    '',
    ...renderNextGoalSummary(buildPlayerNextGoalView(player), '👉 Продолжить'),
  ].join('\n');
};
