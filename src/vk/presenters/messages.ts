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
import { buildBattleClarityView } from '../../modules/combat/application/read-models/battle-clarity';
import { listBattleRuneLoadouts } from '../../modules/combat/domain/battle-rune-loadouts';
import {
  buildBattleResultNextGoalView,
  buildPlayerNextGoalView,
} from '../../modules/player/application/read-models/next-goal';
import { buildPlayerSchoolRecognitionView } from '../../modules/player/application/read-models/school-recognition';
import { resolveDefendGuardGain } from '../../modules/combat/domain/battle-tactics';
import { describeRuneContent } from '../../modules/runes/domain/rune-abilities';
import { buildRuneCollectionPage } from '../../modules/runes/domain/rune-collection';
import { getRuneSchoolPresentation, listSchoolDefinitions } from '../../modules/runes/domain/rune-schools';
import type { ExplorationSceneView } from '../../modules/world/domain/exploration-events';
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
    ...(summary.nextStepLine ? [`👉 Дальше: ${withSentencePeriod(summary.nextStepLine)}`] : []),
  ];
};

const renderCompactRecognitionLine = (recognition: ReturnType<typeof buildPlayerSchoolRecognitionView>): string | null => {
  if (!recognition) {
    return null;
  }

  return recognition.signEquipped
    ? `⭐ ${recognition.title}: активен.`
    : `⭐ ${recognition.title}: ждёт в рунах.`;
};

const renderNextGoalSummary = (
  nextGoal: ReturnType<typeof buildPlayerNextGoalView>,
  actionPrefix = '👉 Сделать шаг',
): string[] => [
  `🎯 Следующая цель: ${withSentencePeriod(nextGoal.objectiveText)}`,
  ...(nextGoal.whyText ? [`🜂 Что это даст: ${withSentencePeriod(nextGoal.whyText)}`] : []),
  `${actionPrefix}: нажмите «${nextGoal.primaryActionLabel}».`,
];

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

  if (nextThreshold === null) {
    return `Мастерство школы: ${equippedSchool.name} · ранг ${mastery.rank}${currentUnlock ? ` · открыто: ${currentUnlock.title}.` : '.'}`;
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

const formatRune = (rune: RuneView | null): string => {
  if (!rune) {
    return 'Выбрано: нет руны.';
  }

  const runeContent = describeRuneContent(rune);
  const school = getRuneSchoolPresentation(rune.archetypeCode);
  const passiveLine = runeContent.passiveAbilities.length > 0
    ? `🛡️ ${runeContent.passiveAbilities.map((ability) => ability.name).join(' · ')}`
    : null;
  const activeLine = runeContent.activeAbilities.length > 0
    ? `🌀 ${runeContent.activeAbilities.map((ability) => [
        ability.name,
        `${ability.manaCost} маны`,
        ability.cooldownTurns > 0 ? `КД ${ability.cooldownTurns}` : null,
      ].filter((part) => part).join(' · ')).join(' · ')}`
    : null;

  return [
    `${(() => {
      const equippedSlot = getRuneEquippedSlot(rune);
      if (equippedSlot !== null) {
        return `✅ Надета: слот ${equippedSlot + 1}`;
      }
      return '🎯 Выбрана';
    })()}: ${rune.name}`,
    `Редкость: ${gameBalance.runes.profiles[rune.rarity].title}${school ? ` · ${school.name}` : ''}`,
    ...(school ? [`Стиль: ${school.playPatternLine}`] : []),
    `Бонусы: ${formatRuneStatSummary({
      health: rune.health,
      attack: rune.attack,
      defence: rune.defence,
      magicDefence: rune.magicDefence,
      dexterity: rune.dexterity,
      intelligence: rune.intelligence,
    }, 4)}`,
    ...(passiveLine ? [passiveLine] : []),
    ...(activeLine ? [activeLine] : []),
  ].join('\n');
};

const formatRunePageEntryStatus = (isSelected: boolean, equippedSlot: number | null): string => {
  if (isSelected && equippedSlot !== null) {
    return `🎯✅ Надета ${equippedSlot + 1}`;
  }

  if (isSelected) {
    return '🎯 Выбрана';
  }

  if (equippedSlot !== null) {
    return `✅ Надета ${equippedSlot + 1}`;
  }

  return '▫️ В коллекции';
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
    '🏰 Главное меню Runemasters Return',
    '',
    `⭐ Уровень: ${player.level}`,
    inTutorial
      ? '📘 Режим: обучение'
      : `🎯 Уровень угрозы: ${resolveAdaptiveAdventureLocationLevel(player)}`,
    `💰 Руная пыль: ${player.gold}`,
    `🧭 Максимально пройденная угроза: ${player.highestLocationLevel}`,
    `🧩 Слоты рун: ${getUnlockedRuneSlotCount(player)} открыто`,
    `🔮 Экипирована: ${equippedRune ? equippedRune.name : 'нет руны'}`,
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
    '👤 Профиль рунного мастера',
    '',
    `⭐ Уровень: ${player.level}`,
    `📊 Опыт: ${player.experience}/${nextLevelXp}`,
    `💰 Руная пыль: ${player.gold}`,
    `🏆 Победы / Поражения: ${player.victories}/${player.defeats}`,
    `🧩 Слоты рун: ${getUnlockedRuneSlotCount(player)} открыто`,
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
  ...renderNextGoalSummary(buildPlayerNextGoalView(player)),
].join('\n');

export const renderExplorationEvent = (event: ExplorationSceneView, player: PlayerState): string => [
  '🧭 Исследование',
  '',
  event.title,
  event.description,
  '',
  event.outcomeLine,
  event.nextStepLine,
  '',
  ...renderNextGoalSummary(buildPlayerNextGoalView(player), '👉 Продолжить'),
].join('\n');

const renderEquippedRuneSlots = (player: PlayerState): string => {
  const slotLines = Array.from({ length: getUnlockedRuneSlotCount(player) }, (_, slot) => {
    const rune = getEquippedRune(player, slot);
    return `${slot + 1}. ${rune ? rune.name : 'пусто'}`;
  });

  return `Надето: ${slotLines.join(' · ')}`;
};

export const renderRuneScreen = (player: PlayerState, acquisitionSummary?: AcquisitionSummaryView | null): string => {
  const selectedRune = getSelectedRune(player);
  const equippedRune = getEquippedRune(player);
  const page = buildRuneCollectionPage(player);
  const nextGoal = buildPlayerNextGoalView(player);
  const recognition = buildPlayerSchoolRecognitionView(player);

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
    `Руны: ${player.runes.length} · карусель ${page.pageNumber}/${page.totalPages} · по 5`,
    `🧩 Слоты рун: ${getUnlockedRuneSlotCount(player)} открыто сейчас.`,
    renderEquippedRuneSlots(player),
    `🎯 Выбрана: ${selectedRune ? selectedRune.name : 'нет руны'}`,
    ...(equippedRune ? (() => {
      const school = getRuneSchoolPresentation(equippedRune.archetypeCode);
      return school ? [`Стиль: ${school.schoolLine}.`] : [];
    })() : []),
    ...(renderCompactRecognitionLine(recognition) ? [renderCompactRecognitionLine(recognition)!] : []),
    ...renderAcquisitionSummary(acquisitionSummary),
    ...(['hunt_school_elite', 'equip_school_sign', 'challenge_school_miniboss', 'reach_next_school_mastery', 'fill_support_slot'].includes(nextGoal.goalType)
      ? [
          `🎯 Ближайшая веха: ${withSentencePeriod(nextGoal.milestoneProgressText ?? nextGoal.objectiveText)}`,
          `👉 Сделать шаг: нажмите «${nextGoal.primaryActionLabel}».`,
        ]
      : []),
    '',
    'Карусель рун:',
    ...page.entries.map((entry) => {
      const school = getRuneSchoolPresentation(entry.rune.archetypeCode);
      return `${entry.slot + 1}. ${formatRunePageEntryStatus(entry.isSelected, getRuneEquippedSlot(entry.rune))} · ${entry.rune.name} · ${school?.name ?? 'без школы'} · ${formatRuneStatSummary(entry.rune)}`;
    }),
    '',
    formatRune(selectedRune),
  ].join('\n');
};

export const renderAltar = (player: PlayerState, acquisitionSummary?: AcquisitionSummaryView | null): string => renderRuneScreen(player, acquisitionSummary);

const meterEmptySegment = '⬛';

const renderMeter = (current: number, max: number, width: number, filledSegment: string): string => {
  if (max <= 0) {
    return meterEmptySegment.repeat(width);
  }

  const filled = Math.max(0, Math.min(width, Math.round((current / max) * width)));
  return `${filledSegment.repeat(filled)}${meterEmptySegment.repeat(width - filled)}`;
};

const resolveHealthMeterSegment = (current: number, max: number): string => {
  if (max <= 0) {
    return '🟥';
  }

  const ratio = current / max;
  if (ratio <= 0.25) {
    return '🟥';
  }

  if (ratio <= 0.5) {
    return '🟨';
  }

  return '🟩';
};

const renderBattleActorStats = (actor: Pick<StatBlock, 'attack' | 'defence' | 'magicDefence' | 'dexterity' | 'intelligence'>): string => (
  `📊 Статы: ⚔️ ${actor.attack} · 🛡️ ${actor.defence} · 🔮 ${actor.magicDefence} · 💨 ${actor.dexterity} · 🧠 ${actor.intelligence}`
);

const renderBattleActorBlock = (
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
    currentMana?: number;
    maxMana?: number;
  },
  options: { guardPoints?: number } = {},
): string => {
  const healthLine = `❤️ ${renderMeter(actor.currentHealth, actor.maxHealth, 10, resolveHealthMeterSegment(actor.currentHealth, actor.maxHealth))} ${actor.currentHealth}/${actor.maxHealth} HP`;
  const manaLine = typeof actor.currentMana === 'number' && typeof actor.maxMana === 'number'
    ? `🔷 ${renderMeter(actor.currentMana, actor.maxMana, 6, '🟦')} ${actor.currentMana}/${actor.maxMana} маны`
    : null;
  const guardLine = options.guardPoints && options.guardPoints > 0
    ? ` · 🛡️ щит ${options.guardPoints}`
    : '';

  return [
    `${title}: ${actor.name}`,
    `${healthLine}${guardLine}`,
    ...(manaLine ? [manaLine] : []),
    renderBattleActorStats(actor),
  ].join('\n');
};

const renderBattleRuneState = (battle: BattleView): string => {
  const runeLoadouts = listBattleRuneLoadouts(battle.player);
  if (runeLoadouts.length === 0) {
    return '🔮 Без руны: доступна базовая атака.';
  }

  return runeLoadouts.map(({ slot, loadout }) => {
    const activeAbility = loadout.activeAbility;
    if (!activeAbility) {
      return `🔮 Слот ${slot + 1}: ${loadout.runeName} · пассивы активны.`;
    }

    const state = activeAbility.currentCooldown > 0
      ? `откат ${activeAbility.currentCooldown} хода`
      : battle.player.currentMana < activeAbility.manaCost
        ? `нужно ${activeAbility.manaCost} маны`
        : 'готово';

    return `🌀 Слот ${slot + 1}: ${activeAbility.name} — ${state}`;
  }).join('\n');
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
  const actions = ['⚔️ Атака', `🛡️ Защита (+${defendGain} щит)`];

  actions.push(
    ...listBattleRuneLoadouts(battle.player)
      .flatMap(({ slot, loadout }) => (
        loadout.activeAbility ? [`🌀 ${slot + 1}: ${loadout.activeAbility.name}`] : []
      )),
  );

  return `🎮 Действия: ${actions.join(' · ')}`;
};

const renderBattleNextGoal = (battle: BattleView, player?: PlayerState): string[] => {
  const nextGoal = buildBattleResultNextGoalView(battle, player);
  if (!nextGoal) {
    return [];
  }

  return [
    `🎯 Следующая цель: ${withSentencePeriod(nextGoal.objectiveText)}`,
    `👉 Дальше: нажмите «${nextGoal.primaryActionLabel}».`,
  ];
};

export const renderBattle = (battle: BattleView, player?: PlayerState, acquisitionSummary?: AcquisitionSummaryView | null): string => {
  const latestLogLines = battle.log.length > 0 ? battle.log.slice(-2) : ['Пока без событий.'];
  const clarity = buildBattleClarityView(battle);
  const enemyIntentLine = renderBattleEnemyIntent(battle);
  const battleStateLine = battle.status === 'ACTIVE'
    ? battle.turnOwner === 'PLAYER'
      ? '⚔️ Бой — ваш ход'
      : '⚔️ Бой — ход врага'
    : battle.result === 'VICTORY'
      ? '🏁 Победа'
      : '💥 Поражение';

  const rewardLines = battle.status === 'COMPLETED' && battle.rewards
    ? [
        '',
        `Награда: +${battle.rewards.experience} опыта · +${battle.rewards.gold} пыли`,
        ...(battle.rewards.droppedRune ? (() => {
          const droppedSchool = getRuneSchoolPresentation(battle.rewards?.droppedRune?.archetypeCode);
          return [
            `Руна: ${battle.rewards.droppedRune.name}`,
            ...(droppedSchool ? [`Школа: ${droppedSchool.name}.`] : []),
          ];
        })() : []),
      ]
    : [];

  const postSessionLines = battle.status === 'COMPLETED'
    ? ['', ...renderBattleNextGoal(battle, player)]
    : [];

  return [
    battleStateLine,
    '',
    'Состояние',
    renderBattleActorBlock('Вы', battle.player, { guardPoints: battle.player.guardPoints }),
    renderBattleActorBlock('Враг', battle.enemy),
    '',
    ...(battle.status === 'ACTIVE'
      ? [
          'Тактика',
          ...(enemyIntentLine ? [enemyIntentLine] : []),
          ...(clarity.schoolHintLine ? [clarity.schoolHintLine] : []),
          renderBattleRuneState(battle),
          ...(battle.turnOwner === 'PLAYER' ? [renderBattleActionState(battle)] : []),
          '',
        ]
      : []),
    'Ход событий',
    ...latestLogLines.map((entry) => `• ${entry}`),
    ...rewardLines,
    ...renderAcquisitionSummary(acquisitionSummary),
    ...postSessionLines,
  ].join('\n');
};
