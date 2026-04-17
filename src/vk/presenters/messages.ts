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

const resolvePlayerObjective = (player: PlayerState): string => {
  if (player.tutorialState === 'ACTIVE') {
    return '🎯 Цель: пройдите учебный бой и заберите первую боевую руну.';
  }

  if (player.unspentStatPoints > 0) {
    return '🎯 Цель: откройте профиль и распределите свободное очко силы.';
  }

  if (player.runes.length === 0) {
    return '🎯 Цель: выиграйте ещё бой или создайте первую руну в мастерской.';
  }

  const equippedRune = getEquippedRune(player);
  if (!equippedRune) {
    return '🎯 Цель: откройте «🔮 Руны» и наденьте руну перед следующим боем.';
  }

  if (describeRuneContent(equippedRune).activeAbilities.length > 0 && player.victories <= 2) {
    return '🎯 Цель: войдите в бой и примените активное действие экипированной руны.';
  }

  return '🎯 Цель: ищите более сильную руну и поднимайте уровень угрозы дальше.';
};

const formatRune = (rune: RuneView | null): string => {
  if (!rune) {
    return 'Руна не выбрана.';
  }

  const runeContent = describeRuneContent(rune);
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
    ...(runeContent.archetype ? [`Архетип: ${runeContent.archetype.name}`] : []),
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

export const renderWelcome = (player: PlayerState, created: boolean): string => created
  ? [
      '🎮 Добро пожаловать в Runemasters Return!',
      '',
      'Ваш мастер создан.',
      'Сначала — короткий учебный бой.',
      `Стартовые осколки: обычные ${player.inventory.usualShards}, необычные ${player.inventory.unusualShards}, редкие ${player.inventory.rareShards}.`,
      '',
      'Нажмите «⚔️ Учебный бой», чтобы начать.',
    ].join('\n')
  : [
      '🎮 Ваш мастер уже существует.',
      '',
      `Уровень: ${player.level}`,
      isPlayerInTutorial(player)
        ? 'Сейчас доступен учебный бой в безопасной зоне.'
        : `Текущая рекомендуемая сложность: ${resolveAdaptiveAdventureLocationLevel(player)}.`,
      `Свободные очки: ${player.unspentStatPoints}`,
      '',
      `Следующий шаг: ${isPlayerInTutorial(player) ? 'нажмите «⚔️ Учебный бой».' : 'нажмите «⚔️ Исследовать».'}`,
    ].join('\n');

export const renderMainMenu = (player: PlayerState): string => {
  const stats = derivePlayerStats(player);
  const equippedRune = getEquippedRune(player);
  const inTutorial = isPlayerInTutorial(player);

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
    ? 'Обучение ещё не завершено. Это безопасная зона для первого боя и знакомства с базовой петлёй.'
    : player.tutorialState === 'SKIPPED'
      ? 'Обучение было пропущено. Сюда можно вернуться позже для тренировки.'
      : 'Обучение завершено. Сюда можно вернуться для спокойной тренировки.',
  '',
  isPlayerInTutorial(player)
    ? 'Сейчас вы в учебной зоне. Враги здесь мягче и подходят для первого боя.'
    : 'Сейчас открыт режим приключений. Сложность подстраивается под силу героя и серию боёв.',
  `🎯 Рекомендуемый уровень угрозы: ${resolveAdaptiveAdventureLocationLevel(player)}`,
  `🧭 Максимально пройденная сложность: ${player.highestLocationLevel}`,
  player.defeatStreak > 0
    ? `🛡️ После поражений подряд (${player.defeatStreak}) враги становятся слабее, чтобы вы быстрее вернулись в ритм.`
    : `🔥 Серия побед подряд: ${player.victoryStreak}`,
  resolvePlayerObjective(player),
  '',
  `Следующий шаг: ${isPlayerInTutorial(player) ? 'нажмите «⚔️ Учебный бой».' : 'нажмите «⚔️ Исследовать».'}`,
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
      `Создание руны стоит ${gameBalance.runes.craftCost} осколков одной редкости.`,
      'Побеждайте в боях или нажмите «✨ Создать», чтобы собрать первую руну.',
    ].join('\n');
  }

  return [
    '🔮 Руны и мастерская',
    '',
    `Всего рун: ${player.runes.length} · Страница ${page.pageNumber}/${page.totalPages}`,
    `Экипирована: ${equippedRune ? equippedRune.name : 'нет руны'}`,
    '',
    'Список на этой странице:',
    ...page.entries.map((entry) => {
      const runeContent = describeRuneContent(entry.rune);
      return `${entry.isSelected ? '▶️' : '▫️'} ${entry.slot + 1}. ${entry.rune.isEquipped ? '✅ ' : ''}${entry.rune.name} — ${runeContent.archetype?.name ?? 'без архетипа'} · ${formatRuneStatSummary(entry.rune)}`;
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

  const activeAbility = runeLoadout.activeAbility;
  if (!activeAbility) {
    return `🔮 ${runeLoadout.runeName}: работают только пассивные бонусы.`;
  }

  const state = activeAbility.currentCooldown > 0
    ? `откат ${activeAbility.currentCooldown} хода`
    : battle.player.currentMana < activeAbility.manaCost
      ? `нужно ${activeAbility.manaCost} маны`
      : 'готово';

  const guardLine = (battle.player.guardPoints ?? 0) > 0
    ? ` · защита ${battle.player.guardPoints}`
    : '';

  return `🔮 ${runeLoadout.runeName}: «${activeAbility.name}» · ${activeAbility.manaCost} маны · ${state}${guardLine}`;
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
  const runeLine = !activeAbility
    ? '🌀 Рунное действие — у текущей руны нет активного боевого навыка.'
    : activeAbility.currentCooldown > 0
      ? `🌀 ${activeAbility.name} — откат: ${activeAbility.currentCooldown} хода.`
      : battle.player.currentMana < activeAbility.manaCost
        ? `🌀 ${activeAbility.name} — нужно ${activeAbility.manaCost} маны.`
        : `🌀 ${activeAbility.name} — готово. ${activeAbility.manaCost} маны.`;

  return [
    'Доступные действия:',
    '⚔️ Атака — стабильный урон.',
    `🛡️ Защита — готовит ${defendGain} защиты на следующий удар.`,
    runeLine,
  ].join('\n');
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
    : battle.result === 'VICTORY'
      ? battle.rewards?.droppedRune
        ? 'Действие: Откройте «🔮 Руны», наденьте новую руну и вернитесь в бой. '
        : 'Действие: Нажмите «⚔️ Новый бой». '
      : 'Действие: усилите героя в профиле или начните бой снова.';

  const rewardLines = battle.status === 'COMPLETED' && battle.rewards
    ? [
        '',
        `Награда: +${battle.rewards.experience} опыта · +${battle.rewards.gold} пыли`,
        ...(battle.rewards.droppedRune ? [`Руна: ${battle.rewards.droppedRune.name}`] : []),
      ]
    : [];

  return [
    `${battle.status === 'COMPLETED' ? '🏁 Завершённый бой' : '⚔️ Бой'}`,
    '',
    battleStateLine,
    nextStepLine.trim(),
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
  ].join('\n');
};
