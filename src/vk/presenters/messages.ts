import { gameBalance } from '../../config/game-balance';
import { derivePlayerStats, getEquippedRune, getSelectedRune, isPlayerInTutorial, resolveAdaptiveAdventureLocationLevel } from '../../modules/player/domain/player-stats';
import type { BattleView, PlayerState, RuneView, StatBlock } from '../../shared/types/game';

const formatStatBlock = (stats: StatBlock): string => [
  `❤️ Здоровье: ${stats.health}`,
  `⚔️ Атака: ${stats.attack}`,
  `🛡️ Физ. защита: ${stats.defence}`,
  `🔮 Маг. защита: ${stats.magicDefence}`,
  `💨 Ловкость: ${stats.dexterity}`,
  `🧠 Интеллект: ${stats.intelligence}`,
].join('\n');

const formatRune = (rune: RuneView | null): string => {
  if (!rune) {
    return 'Руна не выбрана.';
  }

  return [
    `${rune.isEquipped ? '✅' : '💎'} ${rune.name}`,
    `Редкость: ${rune.rarity}`,
    formatStatBlock({
      health: rune.health,
      attack: rune.attack,
      defence: rune.defence,
      magicDefence: rune.magicDefence,
      dexterity: rune.dexterity,
      intelligence: rune.intelligence,
    }),
  ].join('\n');
};

export const renderWelcome = (player: PlayerState, created: boolean): string => created
  ? [
      '🎮 Добро пожаловать в Runemasters Return!',
      '',
      `Создан новый рунный мастер #${player.vkId}.`,
      'Старт: нулевой интро-биом обучения.',
      `Стартовые осколки: обычные ${player.inventory.usualShards}, необычные ${player.inventory.unusualShards}, редкие ${player.inventory.rareShards}.`,
    ].join('\n')
  : [
      '🎮 Ваш мастер уже существует.',
      '',
      `Уровень: ${player.level}`,
      isPlayerInTutorial(player)
        ? 'Режим: обучение в нулевом биоме.'
        : `Уровень текущей угрозы: ${resolveAdaptiveAdventureLocationLevel(player)}.`,
      `Свободные очки: ${player.unspentStatPoints}`,
    ].join('\n');

export const renderMainMenu = (player: PlayerState): string => {
  const stats = derivePlayerStats(player);
  const equippedRune = getEquippedRune(player);
  const inTutorial = isPlayerInTutorial(player);

  return [
    '🏰 Главное меню RuneMasters Return',
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
  '📘 Обучение и умная сложность',
  '',
  player.tutorialState === 'ACTIVE'
    ? 'Обучение ещё не завершено. Нулевой биом подготовлен как безопасный вход в игру.'
    : player.tutorialState === 'SKIPPED'
      ? 'Обучение было пропущено. При желании его можно снова пройти как тренировку.'
      : 'Обучение завершено. Вы можете вернуться в него для повторной тренировки.',
  '',
  isPlayerInTutorial(player)
    ? 'Сейчас активен интро-биом. Здесь противники должны быть по зубам даже после серии поражений.'
    : 'Сейчас активен режим приключений. Сложность подбирается автоматически по статам, уровню и серии боёв.',
  `🎯 Рекомендуемая угроза в приключениях: ${resolveAdaptiveAdventureLocationLevel(player)}`,
  `🧭 Максимально пройденная угроза: ${player.highestLocationLevel}`,
  player.defeatStreak > 0
    ? `🛡️ После поражений подряд (${player.defeatStreak}) игра снижает давление и подбирает более мягких мобов.`
    : `🔥 Серия побед подряд: ${player.victoryStreak}`,
].join('\n');

export const renderRuneScreen = (player: PlayerState): string => {
  const selectedRune = getSelectedRune(player);

  return [
    '🔮 Коллекция рун',
    '',
    `Всего рун: ${player.runes.length}`,
    `Текущий индекс: ${player.runes.length > 0 ? player.currentRuneIndex + 1 : 0}/${player.runes.length}`,
    '',
    formatRune(selectedRune),
  ].join('\n');
};

export const renderAltar = (player: PlayerState): string => [
  '🕯️ Алтарь рун',
  '',
  renderRuneScreen(player),
  '',
  `Создание руны стоит ${gameBalance.runes.craftCost} осколков одной редкости.`,
  'Изменение стата требует 1 осколок той же редкости.',
].join('\n');

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
  `❤️ HP: ${actor.currentHealth}/${actor.maxHealth}`,
  `🟥 ${renderBar(actor.currentHealth, actor.maxHealth, '█', '░')}`,
  `💙 Мана: ${actor.currentMana}/${actor.maxMana}`,
  `🟦 ${renderBar(actor.currentMana, actor.maxMana, '█', '░')}`,
  `⚔️ АТК: ${actor.attack}`,
  `🛡️ ФЗАЩ: ${actor.defence}`,
  `✨ МЗАЩ: ${actor.magicDefence}`,
  `💨 ЛВК: ${actor.dexterity}`,
  `🧠 ИНТ: ${actor.intelligence}`,
].join('\n');

export const renderBattle = (battle: BattleView): string => {
  const log = [...battle.log].slice(-6).reverse().join('\n');

  const rewardLines = battle.status === 'COMPLETED' && battle.rewards
    ? [
        '',
        `Результат: ${battle.result === 'VICTORY' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}`,
        `Опыт: ${battle.rewards.experience}`,
        `Пыль: ${battle.rewards.gold}`,
        ...(battle.rewards.droppedRune ? [`Руна: ${battle.rewards.droppedRune.name}`] : []),
      ]
    : [];

  return [
    `${battle.status === 'COMPLETED' ? '🏁 Завершённый бой' : '⚔️ Активный бой'}`,
    '',
    renderBattleActorStats('👤 Ваши боевые статы', battle.player),
    '',
    renderBattleActorStats('👾 Статы врага', battle.enemy),
    '',
    `Ход: ${battle.turnOwner === 'PLAYER' ? 'игрок' : 'враг'}`,
    '',
    'Журнал боя: новое сверху, старое снизу',
    log || 'Пока без событий.',
    ...rewardLines,
  ].join('\n');
};
