import { gameBalance } from '../../config/game-balance';
import {
  derivePlayerStats,
  getEquippedRune,
  getSelectedRune,
  isPlayerInTutorial,
  resolveAdaptiveAdventureLocationLevel,
} from '../../modules/player/domain/player-stats';
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

const renderSchoolFirstLoopLine = (): string => 'Путь первого входа: базовая атака → первая боевая руна → школа рун → новый стиль боя.';
const renderSchoolFirstRarityLine = (): string => 'Сначала первая руна открывает школу рун, а новая редкость позже расширяет сборку.';

const resolvePlayerObjectiveBody = (player: PlayerState): string => {
  if (player.tutorialState === 'ACTIVE') {
    return 'пройдите учебный бой, заберите первую боевую руну и откройте свою школу рун';
  }

  if (player.unspentStatPoints > 0) {
    return 'откройте профиль и распределите свободные очки, чтобы усилить стиль боя';
  }

  if (player.runes.length === 0) {
    return 'получите первую руну, чтобы открыть школу рун и новый стиль боя';
  }

  const equippedRune = getEquippedRune(player);
  if (!equippedRune) {
    return 'откройте «🔮 Руны» и наденьте руну перед следующим боем';
  }

  if (describeRuneContent(equippedRune).activeAbilities.length > 0 && player.victories <= 2) {
    return 'войдите в бой и примените активное действие экипированной руны';
  }

  return 'усиливайте руну и пробуйте более высокий уровень угрозы дальше';
};

const resolvePlayerObjective = (player: PlayerState): string => `🎯 Следующая цель: ${resolvePlayerObjectiveBody(player)}.`;

const resolvePrimaryAction = (player: PlayerState): string => {
  if (player.tutorialState === 'ACTIVE') {
    return '⚔️ Учебный бой';
  }

  if (player.runes.length === 0) {
    return '⚔️ Исследовать';
  }

  if (!getEquippedRune(player)) {
    return '🔮 Руны';
  }

  if (player.unspentStatPoints > 0) {
    return '👤 Профиль';
  }

  return '⚔️ Исследовать';
};

const resolveReturnFocusBody = (player: PlayerState): string => {
  if (player.tutorialState === 'ACTIVE') {
    return resolvePlayerObjectiveBody(player);
  }

  if (player.runes.length === 0) {
    return 'сделайте первый шаг в приключениях и получите первую руну для открытия школы';
  }

  if (!getEquippedRune(player)) {
    return 'откройте «🔮 Руны» и наденьте лучшую руну перед следующим боем';
  }

  if (player.unspentStatPoints > 0) {
    return 'откройте профиль и распределите свободные очки, чтобы усилить текущую сборку';
  }

  return 'идите в приключения и развивайте текущую школу рун дальше';
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
  const primaryAction = resolvePrimaryAction(player);

  return [
    title,
    '',
    resolveReturnStateLine(player),
    resolveReturnStyleLine(player),
    `Фокус: ${resolveReturnFocusBody(player)}.`,
    `Дальше: нажмите «${primaryAction}».`,
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
    `${rune.isEquipped ? '✅ Экипирована' : '💠 Выбрана'}: ${rune.name}`,
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

  return [
    '🏰 Главное меню Runemasters Return',
    '',
    `⭐ Уровень: ${player.level}`,
    inTutorial
      ? '📘 Режим: обучение'
      : `🎯 Уровень угрозы: ${resolveAdaptiveAdventureLocationLevel(player)}`,
    `💰 Руная пыль: ${player.gold}`,
    `🎯 Свободные очки: ${player.unspentStatPoints}`,
    `🧭 Максимально пройденная угроза: ${player.highestLocationLevel}`,
    `🔮 Экипирована: ${equippedRune ? equippedRune.name : 'нет руны'}`,
    ...(player.tutorialState === 'ACTIVE' ? ['🜂 Первый бой ведёт к первой руне, а первая руна открывает школу рун.'] : []),
    ...(equippedSchool ? [`🜂 Ваш путь: ${equippedSchool.schoolLine} · роль ${equippedSchool.roleName.toLowerCase()}.`] : []),
    player.defeatStreak > 0
      ? `🛡️ Поражений подряд: ${player.defeatStreak}. Сложность уже смягчена.`
      : `🔥 Побед подряд: ${player.victoryStreak}`,
    resolvePlayerObjective(player),
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
    `🎯 Свободные очки: ${player.unspentStatPoints}`,
    `🏆 Победы / Поражения: ${player.victories}/${player.defeats}`,
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
  resolvePlayerObjective(player),
  '',
  `Следующий шаг: ${player.tutorialState === 'ACTIVE'
    ? 'нажмите «⚔️ Учебный бой».'
    : isPlayerInTutorial(player)
      ? 'нажмите «⚔️ Исследовать» для прогресса или «⚔️ Учебный бой» для тренировки.'
      : 'нажмите «⚔️ Исследовать».'}`,
].join('\n');

export const renderRuneScreen = (player: PlayerState): string => {
  const selectedRune = getSelectedRune(player);
  const equippedRune = getEquippedRune(player);
  const page = buildRuneCollectionPage(player);

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
    `Всего рун: ${player.runes.length} · Страница ${page.pageNumber}/${page.totalPages}`,
    `Экипирована: ${equippedRune ? equippedRune.name : 'нет руны'}`,
    ...(equippedRune ? (() => {
      const school = getRuneSchoolPresentation(equippedRune.archetypeCode);
      return school ? [`Текущий стиль: ${school.schoolLine} · роль ${school.roleName.toLowerCase()}.`] : [];
    })() : []),
    '',
    'Список на этой странице:',
    ...page.entries.map((entry) => {
      const school = getRuneSchoolPresentation(entry.rune.archetypeCode);
      return `${entry.isSelected ? '▶️' : '▫️'} ${entry.slot + 1}. ${entry.rune.isEquipped ? '✅ ' : ''}${entry.rune.name} — ${school?.name ?? 'без школы'} · роль ${school?.roleName.toLowerCase() ?? 'неизвестна'} · ${formatRuneStatSummary(entry.rune)}`;
    }),
    '',
    formatRune(selectedRune),
    '',
    ...(selectedRune && !selectedRune.isEquipped && (selectedRune.activeAbilityCodes?.length ?? 0) > 0
      ? ['Подсказка: наденьте эту руну, чтобы её активное действие появилось прямо в бою.', '']
      : []),
    `Создать руну: ${gameBalance.runes.craftCost} одинаковых осколков.`,
    'Перековка свойства: 1 осколок той же редкости.',
    'Распыление: возвращает часть осколков выбранной руны.',
    'Выберите слот 1-4, чтобы открыть руну. Кнопки ◀️/▶️ листают страницы.',
  ].join('\n');
};

export const renderAltar = (player: PlayerState): string => renderRuneScreen(player);

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

  return `🔮 ${runeLoadout.runeName}: ${school?.schoolLine ?? 'школа неизвестна'} · роль ${school?.roleName.toLowerCase() ?? 'неизвестна'} · «${activeAbility.name}» · ${activeAbility.manaCost} маны · ${state}${guardLine}`;
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
  ].join('\n');
};

const renderBattleNextGoal = (battle: BattleView): string[] => {
  if (battle.status !== 'COMPLETED') {
    return [];
  }

  if (battle.result === 'VICTORY') {
    if (battle.rewards?.droppedRune) {
      return [
        '🎯 Следующая цель: откройте «🔮 Руны» и наденьте новую руну.',
        'Так вы усилите стиль боя перед следующим боем.',
      ];
    }

    return [
      '🎯 Следующая цель: начните «⚔️ Новый бой» и продолжайте усиливать сборку.',
      'Сейчас полезнее искать следующую полезную руну и расширять сборку.',
    ];
  }

  return [
    '🎯 Следующая цель: усилите героя в «👤 Профиль» или начните новый бой снова.',
    'Так вы спокойнее подготовитесь к следующему бою без лишнего давления.',
  ];
};

export const renderBattle = (battle: BattleView): string => {
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
    ? ['', ...renderBattleNextGoal(battle)]
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
    ...postSessionLines,
  ].join('\n');
};
