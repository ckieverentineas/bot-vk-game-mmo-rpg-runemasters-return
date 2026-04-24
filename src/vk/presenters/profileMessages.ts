import { gameBalance } from '../../config/game-balance';
import {
  derivePlayerStats,
  derivePlayerVitals,
  getUnlockedRuneSlotCount,
} from '../../modules/player/domain/player-stats';
import type { PlayerState, StatBlock } from '../../shared/types/game';
import { formatPlayerSkillProgressLine } from './player-skill-formatting';

const formatStatBlock = (stats: StatBlock): string => [
  `❤️ Здоровье: ${stats.health}`,
  `⚔️ Атака: ${stats.attack}`,
  `🛡️ Физ. защита: ${stats.defence}`,
  `🔮 Маг. защита: ${stats.magicDefence}`,
  `💨 Ловкость: ${stats.dexterity}`,
  `🧠 Интеллект: ${stats.intelligence}`,
].join('\n');

const renderPlayerSkillsBlock = (player: PlayerState): readonly string[] => {
  const skills = [...(player.skills ?? [])].sort((left, right) => (
    right.experience - left.experience || left.skillCode.localeCompare(right.skillCode)
  ));

  if (skills.length === 0) {
    return ['Навыки: пока нет опыта обработки трофеев.'];
  }

  return [
    'Навыки:',
    ...skills.map(formatPlayerSkillProgressLine),
  ];
};

export const renderProfile = (player: PlayerState): string => {
  const stats = derivePlayerStats(player);
  const vitals = derivePlayerVitals(player, stats);
  const nextLevelXp = gameBalance.progression.experienceForNextLevel(player.level);

  return [
    '👤 Летопись рунного мастера',
    '',
    `⭐ Уровень: ${player.level}`,
    `📊 Опыт: ${player.experience}/${nextLevelXp}`,
    `💰 Руная пыль: ${player.gold}`,
    `✨ Сияние: ${player.radiance}`,
    `💓 Состояние: ${vitals.currentHealth}/${vitals.maxHealth} HP · ${vitals.currentMana}/${vitals.maxMana} маны`,
    `🏆 Победы / Поражения: ${player.victories}/${player.defeats}`,
    `🧩 Слоты рун: ${getUnlockedRuneSlotCount(player)} открыто`,
    'Путь школы: подробности в «📜 Мастерство».',
    '',
    ...renderPlayerSkillsBlock(player),
    '',
    formatStatBlock(stats),
  ].join('\n');
};

export const renderInventory = (player: PlayerState): string => [
  '🎒 Инвентарь',
  '',
  `Сияние: ${player.radiance}`,
  `Рунная пыль: ${player.gold}`,
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
  '',
  `Пилюли: восстановление ${player.inventory.healingPills ?? 0}, фокус ${player.inventory.focusPills ?? 0}`,
  `Стойкость ${player.inventory.guardPills ?? 0}, ясность ${player.inventory.clarityPills ?? 0}`,
].join('\n');
