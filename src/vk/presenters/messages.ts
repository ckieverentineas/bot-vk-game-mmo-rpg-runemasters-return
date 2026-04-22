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
import { type AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import { buildBattleClarityView } from '../../modules/combat/application/read-models/battle-clarity';
import { isBattleEncounterOffered } from '../../modules/combat/domain/battle-encounter';
import { listBattleRuneLoadouts } from '../../modules/combat/domain/battle-rune-loadouts';
import {
  buildBattleResultNextGoalView,
  buildPlayerNextGoalView,
} from '../../modules/player/application/read-models/next-goal';
import { buildPlayerSchoolRecognitionView } from '../../modules/player/application/read-models/school-recognition';
import { resolveDefendGuardGain } from '../../modules/combat/domain/battle-tactics';
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
import type { BattleView, PlayerState, StatBlock } from '../../shared/types/game';
import {
  formatRuneDisplayName,
  renderAcquisitionSummary,
  renderNextGoalSummary,
  renderStarterSchoolLine,
  withSentencePeriod,
} from './message-formatting';

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
  `📊 Черты: ⚔️ ${actor.attack} · 🛡️ ${actor.defence} · 🔮 ${actor.magicDefence} · 💨 ${actor.dexterity} · 🧠 ${actor.intelligence}`
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
    return '🔮 Руна молчит: остаётся сталь и простой удар.';
  }

  return runeLoadouts.map(({ slot, loadout }) => {
    const activeAbility = loadout.activeAbility;
    if (!activeAbility) {
      return `🔮 Слот ${slot + 1}: ${loadout.runeName} · тихий знак держит силу.`;
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

  return `⚠️ Враг выдаёт замысел: ${intent.title}. ${intent.description}`;
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

  return `⚔️ Ответ мастера: ${actions.join(' · ')}`;
};

const resolveBattleEnemyRankLabel = (battle: BattleView): string => {
  if (battle.enemy.isBoss) {
    return 'босс';
  }

  if (battle.enemy.isElite) {
    return 'элита';
  }

  return 'обычный враг';
};

const renderBattleEncounterChoice = (battle: BattleView): string[] => {
  const fleeChancePercent = battle.encounter?.fleeChancePercent ?? 0;
  const firstMoveLine = battle.encounter?.initialTurnOwner === 'PLAYER'
    ? 'Если вступить в бой, первый ход будет за вами.'
    : 'Если вступить в бой, враг успеет начать первым.';

  return [
    `👁️ Встреча: ${battle.enemy.name} замечает вас на маршруте.`,
    `Угроза: ${resolveBattleEnemyRankLabel(battle)} · ${battle.enemy.kind}.`,
    `💨 Тропа назад: ${fleeChancePercent}% · ваша ЛВК ${battle.player.dexterity}, враг ${battle.enemy.dexterity}.`,
    firstMoveLine,
    'До первой стычки ещё можно принять бой или уйти в сторону.',
  ];
};

const renderBattleNextGoal = (battle: BattleView, player?: PlayerState): string[] => {
  const nextGoal = buildBattleResultNextGoalView(battle, player);
  if (!nextGoal) {
    return [];
  }

  return [
    `🎯 След: ${withSentencePeriod(nextGoal.objectiveText)}`,
    `👉 Дальше: «${nextGoal.primaryActionLabel}».`,
  ];
};

type BattleLogPresentationLine =
  | { readonly kind: 'entry'; readonly text: string }
  | { readonly kind: 'omission'; readonly omittedCount: number };

const visibleBattleLogEntryLimit = 8;
const leadingBattleLogEntryCount = 1;

const formatBattleEventWord = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'событие';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'события';
  }

  return 'событий';
};

const toBattleLogEntryLine = (text: string): BattleLogPresentationLine => ({
  kind: 'entry',
  text,
});

const selectBattleLogLines = (log: readonly string[]): readonly BattleLogPresentationLine[] => {
  if (log.length === 0) {
    return [toBattleLogEntryLine('Поле ещё молчит.')];
  }

  if (log.length <= visibleBattleLogEntryLimit) {
    return [...log].reverse().map(toBattleLogEntryLine);
  }

  const trailingEntryCount = visibleBattleLogEntryLimit - leadingBattleLogEntryCount;
  const omittedCount = log.length - visibleBattleLogEntryLimit;

  return [
    ...log.slice(-trailingEntryCount).reverse().map(toBattleLogEntryLine),
    { kind: 'omission', omittedCount },
    ...log.slice(0, leadingBattleLogEntryCount).reverse().map(toBattleLogEntryLine),
  ];
};

const renderBattleLogLine = (line: BattleLogPresentationLine): string => {
  if (line.kind === 'omission') {
    return `… ещё ${line.omittedCount} ${formatBattleEventWord(line.omittedCount)} между нынешним мигом и началом схватки`;
  }

  return `• ${line.text}`;
};

export const renderBattle = (battle: BattleView, player?: PlayerState, acquisitionSummary?: AcquisitionSummaryView | null): string => {
  const battleLogLines = selectBattleLogLines(battle.log);
  const clarity = buildBattleClarityView(battle);
  const enemyIntentLine = renderBattleEnemyIntent(battle);
  const isEncounterOffered = battle.status === 'ACTIVE' && isBattleEncounterOffered(battle);
  const battleStateLine = isEncounterOffered
    ? '🧭 Встреча'
    : battle.status === 'ACTIVE'
    ? battle.turnOwner === 'PLAYER'
      ? '⚔️ Бой — ваш ход'
      : '⚔️ Бой — ход врага'
    : battle.result === 'VICTORY'
      ? '🏁 Победа'
      : battle.result === 'FLED'
        ? '💨 Отступление'
        : '💥 Поражение';

  const rewardLines = battle.status === 'COMPLETED' && battle.rewards
    ? [
        '',
        `Добыча: +${battle.rewards.experience} опыта · +${battle.rewards.gold} пыли`,
        ...(battle.rewards.droppedRune ? (() => {
          const droppedSchool = getRuneSchoolPresentation(battle.rewards?.droppedRune?.archetypeCode);
          return [
            `Руна: ${formatRuneDisplayName(battle.rewards.droppedRune)}`,
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
    'Поле боя',
    renderBattleActorBlock('Вы', battle.player, { guardPoints: battle.player.guardPoints }),
    renderBattleActorBlock('Враг', battle.enemy),
    '',
    ...(isEncounterOffered
      ? [
          'Развилка',
          ...renderBattleEncounterChoice(battle),
          '',
        ]
      : battle.status === 'ACTIVE'
      ? [
          'Чтение боя',
          ...(enemyIntentLine ? [enemyIntentLine] : []),
          ...(clarity.schoolHintLine ? [clarity.schoolHintLine] : []),
          renderBattleRuneState(battle),
          ...(battle.turnOwner === 'PLAYER' ? [renderBattleActionState(battle)] : []),
          '',
        ]
      : []),
    'Летопись схватки',
    ...battleLogLines.map(renderBattleLogLine),
    ...rewardLines,
    ...renderAcquisitionSummary(acquisitionSummary),
    ...postSessionLines,
  ].join('\n');
};
