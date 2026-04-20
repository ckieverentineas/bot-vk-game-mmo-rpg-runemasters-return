import { gameBalance } from '../../config/game-balance';
import {
  derivePlayerStats,
  getEquippedRune,
  getRuneEquippedSlot,
  getSelectedRune,
  getUnlockedRuneSlotCount,
  isPlayerInTutorial,
  resolveAdaptiveAdventureLocationLevel,
} from '../../modules/player/domain/player-stats';
import {
  getPlayerSchoolMasteryForArchetype,
  getSchoolMasteryDefinition,
  resolveNextSchoolMasteryThreshold,
} from '../../modules/player/domain/school-mastery';
import { type AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import {
  buildBattleResultNextGoalView,
  buildPlayerNextGoalView,
} from '../../modules/player/application/read-models/next-goal';
import { resolveDefendGuardGain } from '../../modules/combat/domain/battle-tactics';
import { describeRuneContent } from '../../modules/runes/domain/rune-abilities';
import { buildRuneCollectionPage } from '../../modules/runes/domain/rune-collection';
import { getRuneSchoolPresentation, listSchoolDefinitions } from '../../modules/runes/domain/rune-schools';
import type { BattleView, PlayerState, RuneView, StatBlock } from '../../shared/types/game';

const formatStatBlock = (stats: StatBlock): string => [
  `❤️ Здоровье: ${stats.health}`,
  `⚔️ Атака: ${stats.attack}`,
  `🛡️ Физ. защита: ${stats.defence}`,
  `🔮 Маг. защита: ${stats.magicDefence}`,
  `💨 Ловкость: ${stats.dexterity}`,
  `🧠 Интеллект: ${stats.intelligence}`,
].join('\n');

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

const formatRuneStatSummary = (stats: StatBlock, limit = 3): string => {
  const parts = runeStatSummaryOrder
    .filter((key) => stats[key] > 0)
    .sort((left, right) => stats[right] - stats[left])
    .slice(0, limit)
    .map((key) => `${runeStatSummaryLabels[key]} +${stats[key]}`);

  return parts.length > 0 ? parts.join(' · ') : 'Без бонусов';
};

const formatAbilityLine = (prefix: string, name: string, details: string[]): string => (
  `${prefix} ${name}${details.length > 0 ? ` · ${details.join(' · ')}` : ''}`
);

const renderStarterSchoolLine = (): string => {
  const schoolNames = listSchoolDefinitions().map(({ name }) => name);
  return schoolNames.length > 0
    ? `Стартовые школы: ${schoolNames.join(', ')}.`
    : 'Стартовые школы уже ждут первую боевую руну.';
};

const withSentencePeriod = (text: string): string => /[.!?]$/.test(text) ? text : `${text}.`;

const renderAcquisitionSummary = (summary: AcquisitionSummaryView | null | undefined): string[] => {
  if (!summary) {
    return [];
  }

  return [
    '',
    `✨ Что изменилось: ${withSentencePeriod(summary.title)}`,
    `🜂 Теперь: ${withSentencePeriod(summary.changeLine)}`,
    ...(summary.nextStepLine ? [`👉 Попробовать: ${withSentencePeriod(summary.nextStepLine)}`] : []),
  ];
};

const renderSchoolFirstLoopLine = (): string => 'Путь первого входа: базовая атака → первая боевая руна → школа рун → новый стиль боя.';
const renderSchoolFirstRarityLine = (): string => 'Сначала первая руна открывает школу рун, а новая редкость позже расширяет сборку.';

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
  const slotSuffix = getUnlockedRuneSlotCount(player) > 1 ? ' · слот поддержки открыт.' : '.';

  if (nextThreshold === null) {
    return `Мастерство школы: ${equippedSchool.name} · ранг ${mastery.rank}${currentUnlock ? ` · открыто: ${currentUnlock.title}${slotSuffix}` : slotSuffix}`;
  }

  return `Мастерство школы: ${equippedSchool.name} · ранг ${mastery.rank} · ${mastery.experience}/${nextThreshold} до «${nextUnlock?.title ?? 'новой вехи'}».`;
};

const resolveReturnStateLine = (player: PlayerState): string => {
  if (player.tutorialState === 'ACTIVE') {
    return 'Сейчас: обучение активно · до первой руны и школы рун остался один шаг.';
  }

  if (isPlayerInTutorial(player)) {
    return 'Сейчас: учебная зона доступна для спокойной тренировки, а основной прогресс идёт через приключения.';
  }

  return `Сейчас: уровень ${player.level} · рекомендуемая угроза ${resolveAdaptiveAdventureLocationLevel(player)} · лучший проход ${player.highestLocationLevel}.`;
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

  return `Стиль: экипирована руна ${equippedRune.name}.`;
};

export const renderReturnRecap = (player: PlayerState, title = '🧭 Возвращение'): string => {
  const nextGoal = buildPlayerNextGoalView(player);

  return [
    title,
    '',
    resolveReturnStateLine(player),
    resolveReturnStyleLine(player),
    `Фокус: ${withSentencePeriod(nextGoal.objectiveText)}`,
    ...(nextGoal.whyText ? [`Почему это важно: ${withSentencePeriod(nextGoal.whyText)}`] : []),
    `Дальше: нажмите «${nextGoal.primaryActionLabel}».`,
  ].join('\n');
};

const formatRune = (rune: RuneView | null): string => {
  if (!rune) {
    return 'Руна не выбрана.';
  }

  const runeContent = describeRuneContent(rune);
  const school = getRuneSchoolPresentation(rune.archetypeCode);
  const passiveLines = runeContent.passiveAbilities.map((ability) => formatAbilityLine('🛡️', ability.name, []));
  const activeLines = runeContent.activeAbilities.map((ability) => formatAbilityLine(
    '🌀',
    ability.name,
    [
      `${ability.manaCost} маны`,
      ability.cooldownTurns > 0 ? `откат ${ability.cooldownTurns} хода` : 'без отката',
    ],
  ));

  return [
    `${(() => {
      const equippedSlot = getRuneEquippedSlot(rune);
      if (equippedSlot === 0) {
        return '🛡️ В основе';
      }
      if (equippedSlot === 1) {
        return '🧩 В поддержке';
      }
      return '💠 Выбрана';
    })()}: ${rune.name}`,
    `Редкость: ${gameBalance.runes.profiles[rune.rarity].title}`,
    ...(school ? [`Школа: ${school.name}`, `Роль: ${school.roleName}`, school.styleLine, school.playPatternLine, school.battleLine] : []),
    `Бонусы: ${formatRuneStatSummary({
      health: rune.health,
      attack: rune.attack,
      defence: rune.defence,
      magicDefence: rune.magicDefence,
      dexterity: rune.dexterity,
      intelligence: rune.intelligence,
    }, 4)}`,
    ...(passiveLines.length > 0 ? ['', 'Пассивно:', ...passiveLines] : []),
    ...(activeLines.length > 0 ? ['', 'Активно:', ...activeLines] : []),
  ].join('\n');
};

const formatRunePageEntryStatus = (isSelected: boolean, equippedSlot: number | null): string => {
  if (isSelected && equippedSlot === 0) {
    return '🎯🛡️ Основа';
  }

  if (isSelected && equippedSlot === 1) {
    return '🎯🧩 Поддержка';
  }

  if (isSelected) {
    return '🎯 Выбрана';
  }

  if (equippedSlot === 0) {
    return '🛡️ Основа';
  }

  if (equippedSlot === 1) {
    return '🧩 Поддержка';
  }

  return '▫️ В запасе';
};

export const renderWelcome = (player: PlayerState, created: boolean): string => {
  if (created) {
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
      'Нажмите «⚔️ Учебный бой», чтобы начать.',
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

  return [
    '🏰 Главное меню Runemasters Return',
    '',
    `⭐ Уровень: ${player.level}`,
    inTutorial
      ? '📘 Режим: обучение'
      : `🎯 Уровень угрозы: ${resolveAdaptiveAdventureLocationLevel(player)}`,
    `💰 Руная пыль: ${player.gold}`,
    `🧭 Максимально пройденная угроза: ${player.highestLocationLevel}`,
    `🧩 Слоты рун: ${getUnlockedRuneSlotCount(player)}/2`,
    `🔮 Экипирована: ${equippedRune ? equippedRune.name : 'нет руны'}`,
    renderSchoolMasteryLine(player),
    ...(player.tutorialState === 'ACTIVE' ? ['🜂 Первый бой ведёт к первой руне, а первая руна открывает школу рун.'] : []),
    ...(equippedSchool ? [`🜂 Ваш путь: ${equippedSchool.schoolLine} · роль ${equippedSchool.roleName.toLowerCase()}.`] : []),
    player.defeatStreak > 0
      ? `🛡️ Поражений подряд: ${player.defeatStreak}. Сложность уже смягчена.`
      : `🔥 Побед подряд: ${player.victoryStreak}`,
    `🎯 Следующая цель: ${withSentencePeriod(nextGoal.objectiveText)}`,
    ...(nextGoal.whyText ? [`🜂 Зачем: ${withSentencePeriod(nextGoal.whyText)}`] : []),
    '',
    `⚔️ Боевая мощь: АТК ${stats.attack} / ЗДР ${stats.health}`,
  ].join('\n');
};

export const renderProfile = (player: PlayerState): string => {
  const stats = derivePlayerStats(player);
  const nextLevelXp = gameBalance.progression.experienceForNextLevel(player.level);

  return [
    '👤 Профиль рунного мастера',
    '',
    `⭐ Уровень: ${player.level}`,
    `📊 Опыт: ${player.experience}/${nextLevelXp}`,
    `💰 Руная пыль: ${player.gold}`,
    `🏆 Победы / Поражения: ${player.victories}/${player.defeats}`,
    `🧩 Слоты рун: ${getUnlockedRuneSlotCount(player)}/2`,
    renderSchoolMasteryLine(player),
    'Дальнейший рост силы идёт через руны, школу рун и её мастерство, а не через ручное распределение статов.',
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
  '📘 Обучение',
  '',
  player.tutorialState === 'ACTIVE'
    ? 'Обучение ещё не завершено. Это безопасная зона для первого боя, базовой атаки и первой боевой руны.'
    : player.tutorialState === 'SKIPPED'
      ? 'Обучение уже пропущено. Основной прогресс идёт через «⚔️ Исследовать».'
      : 'Обучение уже завершено. Основной прогресс идёт через «⚔️ Исследовать».',
  '',
  player.tutorialState === 'ACTIVE'
    ? `Сначала вы пройдёте бой базовой атакой, затем заберёте первую руну и увидите, как школа меняет стиль боя. ${renderStarterSchoolLine()}`
    : 'Старые входы в обучение больше не возвращают героя в учебный прогресс. Для роста силы продолжайте обычные приключения.',
  '',
  isPlayerInTutorial(player)
    ? 'Сейчас вы в учебной зоне. Враги здесь мягче и подходят для первого боя.'
    : 'Сейчас открыт режим приключений. Сложность подстраивается под силу героя и серию боёв.',
  `🎯 Рекомендуемый уровень угрозы: ${resolveAdaptiveAdventureLocationLevel(player)}`,
  `🧭 Максимально пройденная сложность: ${player.highestLocationLevel}`,
  player.defeatStreak > 0
    ? `🛡️ После поражений подряд (${player.defeatStreak}) враги становятся слабее, чтобы следующий бой читался спокойнее.`
    : `🔥 Серия побед подряд: ${player.victoryStreak}`,
  `🎯 Следующая цель: ${withSentencePeriod(buildPlayerNextGoalView(player).objectiveText)}`,
  '',
  `Следующий шаг: ${player.tutorialState === 'ACTIVE'
    ? 'нажмите «⚔️ Учебный бой».'
    : isPlayerInTutorial(player)
      ? 'нажмите «⚔️ Исследовать» для прогресса или «⚔️ Учебный бой» для тренировки.'
      : 'нажмите «⚔️ Исследовать».'}`,
].join('\n');

export const renderRuneScreen = (player: PlayerState, acquisitionSummary?: AcquisitionSummaryView | null): string => {
  const selectedRune = getSelectedRune(player);
  const equippedRune = getEquippedRune(player);
  const page = buildRuneCollectionPage(player);
  const nextGoal = buildPlayerNextGoalView(player);

  if (player.runes.length === 0) {
    return [
      '🔮 Руны и мастерская',
      '',
      'У вас пока нет рун.',
      'Первая боевая руна откроет школу рун и задаст ваш ранний стиль боя.',
      renderStarterSchoolLine(),
      `Создание руны стоит ${gameBalance.runes.craftCost} осколков одной редкости.`,
      'Новая редкость позже расширит сборку, а сейчас важнее открыть первую школу рун.',
      'Побеждайте в боях или нажмите «✨ Создать», чтобы собрать первую руну.',
    ].join('\n');
  }

  return [
    '🔮 Руны и мастерская',
    '',
    `Всего рун: ${player.runes.length} · Страница ${page.pageNumber}/${page.totalPages} · Быстрый выбор 1-5`,
    `🧩 Слоты рун: ${getUnlockedRuneSlotCount(player)}/2 открыто сейчас.`,
    `🛡️ Основа: ${getEquippedRune(player, 0)?.name ?? 'пусто'}`,
    `🧩 Поддержка: ${getUnlockedRuneSlotCount(player) > 1 ? (getEquippedRune(player, 1)?.name ?? 'пусто') : '🔒 откроется на mastery-вехе'}`,
    `🎯 Выбрана: ${selectedRune ? selectedRune.name : 'нет руны'}`,
    `⚔️ Активная руна в бою: ${equippedRune ? equippedRune.name : 'нет руны'}`,
    ...(equippedRune ? (() => {
      const school = getRuneSchoolPresentation(equippedRune.archetypeCode);
      return school ? [`Текущий стиль: ${school.schoolLine} · роль ${school.roleName.toLowerCase()}.`] : [];
    })() : []),
    ...renderAcquisitionSummary(acquisitionSummary),
    ...(['hunt_school_elite', 'reach_next_school_mastery', 'fill_support_slot'].includes(nextGoal.goalType)
      ? [
          `🎯 Ближайшая веха: ${withSentencePeriod(nextGoal.milestoneProgressText ?? nextGoal.objectiveText)}`,
          ...(nextGoal.milestoneBenefitText ? [`🜂 Что даст: ${withSentencePeriod(nextGoal.milestoneBenefitText)}`] : []),
        ]
      : []),
    '',
    'Список на этой странице:',
    ...page.entries.map((entry) => {
      const school = getRuneSchoolPresentation(entry.rune.archetypeCode);
      return `${entry.slot + 1}. ${formatRunePageEntryStatus(entry.isSelected, getRuneEquippedSlot(entry.rune))} · ${entry.rune.name} — ${school?.name ?? 'без школы'} · роль ${school?.roleName.toLowerCase() ?? 'неизвестна'} · ${formatRuneStatSummary(entry.rune)}`;
    }),
    '',
    formatRune(selectedRune),
    '',
    ...(selectedRune && getRuneEquippedSlot(selectedRune) === null && (selectedRune.activeAbilityCodes?.length ?? 0) > 0
      ? ['Подсказка: наденьте эту руну, чтобы её активное действие появилось прямо в бою.', '']
      : []),
    `Создать руну: ${gameBalance.runes.craftCost} одинаковых осколков.`,
    'Перековка свойства: 1 осколок той же редкости.',
    'Распыление: возвращает часть осколков выбранной руны.',
    'Выберите слот 1-5, чтобы быстро открыть руну. «✅ В основу» задаёт единственную активную руну в бою, а «🧩 В поддержку» даёт половину статов выбранной руны без второй боевой кнопки.',
  ].join('\n');
};

export const renderAltar = (player: PlayerState, acquisitionSummary?: AcquisitionSummaryView | null): string => renderRuneScreen(player, acquisitionSummary);

const renderBar = (current: number, max: number, filled: string, empty: string, width = 10): string => {
  if (max <= 0) {
    return empty.repeat(width);
  }

  const ratio = Math.max(0, Math.min(1, current / max));
  const filledCount = Math.round(ratio * width);
  return `${filled.repeat(filledCount)}${empty.repeat(width - filledCount)}`;
};

const renderHealthMood = (current: number, max: number): string => {
  if (max <= 0) {
    return '😶';
  }

  const ratio = current / max;
  if (ratio <= 0.2) {
    return '💀';
  }

  if (ratio <= 0.5) {
    return '😵';
  }

  if (ratio <= 0.8) {
    return '😤';
  }

  return '😎';
};

const renderBattleActorStats = (
  title: string,
  actor: {
    name: string;
    attack: number;
    defence: number;
    magicDefence: number;
    dexterity: number;
    intelligence: number;
    currentHealth: number;
    maxHealth: number;
    currentMana: number;
    maxMana: number;
  },
): string => [
  `${title} ${renderHealthMood(actor.currentHealth, actor.maxHealth)}`,
  `🏷️ ${actor.name}`,
  `❤️ ${actor.currentHealth}/${actor.maxHealth} HP`,
  `🟥 ${renderBar(actor.currentHealth, actor.maxHealth, '█', '░')}`,
  `💙 ${actor.currentMana}/${actor.maxMana} маны`,
  `⚔️ АТК ${actor.attack} · 🛡️ ЗАЩ ${actor.defence} · 💨 ЛВК ${actor.dexterity}`,
].join('\n');

const renderBattleRuneState = (battle: BattleView): string => {
  const runeLoadout = battle.player.runeLoadout ?? null;
  const supportRuneLoadout = battle.player.supportRuneLoadout ?? null;
  if (!runeLoadout) {
    return '🔮 Без экипированной руны: доступна только базовая атака.';
  }

  const school = getRuneSchoolPresentation(runeLoadout.archetypeCode);

  const activeAbility = runeLoadout.activeAbility;
  if (!activeAbility) {
    return `🔮 ${runeLoadout.runeName}: ${school?.schoolLine ?? 'школа неизвестна'} · роль ${school?.roleName.toLowerCase() ?? 'неизвестна'}. ${school?.passiveLine ?? 'Эта руна играет через постоянный пассивный эффект.'}`;
  }

  const state = activeAbility.currentCooldown > 0
    ? `откат ${activeAbility.currentCooldown} хода`
    : battle.player.currentMana < activeAbility.manaCost
      ? `нужно ${activeAbility.manaCost} маны`
      : 'готово';

  const guardLine = (battle.player.guardPoints ?? 0) > 0
    ? ` · защита ${battle.player.guardPoints}`
    : '';

  const primaryLine = `🔮 ${runeLoadout.runeName}: ${school?.schoolLine ?? 'школа неизвестна'} · роль ${school?.roleName.toLowerCase() ?? 'неизвестна'} · «${activeAbility.name}» · ${activeAbility.manaCost} маны · ${state}${guardLine}`;
  if (!supportRuneLoadout) {
    return primaryLine;
  }

  const supportSchool = getRuneSchoolPresentation(supportRuneLoadout.archetypeCode);
  const supportHint = supportRuneLoadout.passiveAbilityCodes.includes('ember_heart') && runeLoadout.schoolCode === 'ember'
    ? 'усиливает давление базовой атаки'
    : supportRuneLoadout.passiveAbilityCodes.includes('stone_guard') && runeLoadout.schoolCode === 'stone'
      ? 'укрепляет guard и защитный темп'
      : 'добавляет пассивную поддержку сборке';

  return [
    primaryLine,
    `🧩 Поддержка: ${supportRuneLoadout.runeName} · ${supportSchool?.name ?? 'без школы'} · ${supportHint}.`,
  ].join('\n');
};

const renderBattleEnemyIntent = (battle: BattleView): string | null => {
  const intent = battle.enemy.intent;
  if (!intent) {
    return null;
  }

  return `⚠️ Намерение врага: ${intent.title}. ${intent.description}`;
};

const renderBattleActionState = (battle: BattleView): string => {
  const defendGain = resolveDefendGuardGain(battle.player);
  const activeAbility = battle.player.runeLoadout?.activeAbility ?? null;
  const school = getRuneSchoolPresentation(battle.player.runeLoadout?.archetypeCode);
  const supportRune = battle.player.supportRuneLoadout ?? null;
  const runeRole = !activeAbility
    ? school?.passiveLine ?? null
    : activeAbility.code === 'ember_pulse'
      ? 'сильный магический удар'
      : activeAbility.code === 'stone_bastion'
        ? 'удар + мощная защита против опасного хода'
      : activeAbility.code === 'gale_step'
        ? 'удар + защита на следующий вражеский ход'
        : 'особое действие руны';
  const runeLine = !activeAbility
    ? `🌀 ${school?.schoolLine ?? 'Школа руны'} · роль ${school?.roleName.toLowerCase() ?? 'неизвестна'} — ${runeRole ?? 'работает через постоянный пассивный эффект.'}`
    : activeAbility.currentCooldown > 0
      ? `🌀 ${activeAbility.name} — ${runeRole}. Откат: ${activeAbility.currentCooldown} хода.`
      : battle.player.currentMana < activeAbility.manaCost
        ? `🌀 ${activeAbility.name} — ${runeRole}. Нужно ${activeAbility.manaCost} маны.`
        : `🌀 ${activeAbility.name} — ${runeRole}. Готово, ${activeAbility.manaCost} маны.`;

  return [
    'Доступные действия:',
    '⚔️ Атака — стабильный урон.',
    `🛡️ Защита — готовит ${defendGain} защиты на следующий удар.`,
    runeLine,
    ...(supportRune ? ['🧩 Поддержка работает пассивно и пока не даёт вторую боевую кнопку.'] : []),
  ].join('\n');
};

const renderBattleNextGoal = (battle: BattleView, player?: PlayerState): string[] => {
  const nextGoal = buildBattleResultNextGoalView(battle, player);
  if (!nextGoal) {
    return [];
  }

  return [
    `🎯 Следующая цель: ${withSentencePeriod(nextGoal.objectiveText)}`,
    ...(nextGoal.whyText ? [`🜂 Что даст: ${withSentencePeriod(nextGoal.whyText)}`] : []),
  ];
};

export const renderBattle = (battle: BattleView, player?: PlayerState, acquisitionSummary?: AcquisitionSummaryView | null): string => {
  const log = [...battle.log].slice(-3).reverse().join('\n');
  const activeAbility = battle.player.runeLoadout?.activeAbility ?? null;
  const enemyIntentLine = renderBattleEnemyIntent(battle);
  const runeSkillReady = !!activeAbility
    && activeAbility.currentCooldown <= 0
    && battle.player.currentMana >= activeAbility.manaCost;
  const battleStateLine = battle.status === 'ACTIVE'
    ? battle.turnOwner === 'PLAYER'
      ? 'Ваш ход.'
      : 'Ход врага.'
    : battle.result === 'VICTORY'
      ? 'Победа.'
      : 'Поражение.';

  const nextStepLine = battle.status === 'ACTIVE'
    ? battle.turnOwner === 'PLAYER'
      ? enemyIntentLine
        ? 'Ваш ход: враг готовит тяжёлый удар — защита сейчас особенно полезна.'
        : runeSkillReady
          ? `Ваш ход: выберите между «⚔️ Атака», «🛡️ Защита» и «🌀 ${activeAbility?.name}».`
          : 'Ваш ход: выберите между «⚔️ Атака» и «🛡️ Защита». '
      : 'Дождитесь завершения обмена ударами.'
    : null;

  const rewardLines = battle.status === 'COMPLETED' && battle.rewards
    ? [
        '',
        `Награда за победу: +${battle.rewards.experience} опыта · +${battle.rewards.gold} пыли`,
        ...(battle.rewards.droppedRune ? (() => {
          const droppedSchool = getRuneSchoolPresentation(battle.rewards?.droppedRune?.archetypeCode);
          return [
            `Руна: ${battle.rewards.droppedRune.name}`,
            ...(droppedSchool ? [`Школа: ${droppedSchool.name} · роль ${droppedSchool.roleName.toLowerCase()}. ${droppedSchool.playPatternLine}`] : []),
          ];
        })() : []),
      ]
    : [];

  const postSessionLines = battle.status === 'COMPLETED'
    ? ['', ...renderBattleNextGoal(battle, player)]
    : [];

  return [
    `${battle.status === 'COMPLETED' ? '🏁 Завершённый бой' : '⚔️ Бой'}`,
    '',
    battleStateLine,
    ...(nextStepLine ? [nextStepLine.trim()] : []),
    ...(enemyIntentLine ? [enemyIntentLine] : []),
    renderBattleRuneState(battle),
    '',
    ...(battle.status === 'ACTIVE' && battle.turnOwner === 'PLAYER' ? [renderBattleActionState(battle), ''] : []),
    renderBattleActorStats('👤 Вы', battle.player),
    '',
    renderBattleActorStats('👾 Враг', battle.enemy),
    '',
    'Что произошло:',
    log || 'Пока без событий.',
    ...rewardLines,
    ...renderAcquisitionSummary(acquisitionSummary),
    ...postSessionLines,
  ].join('\n');
};
