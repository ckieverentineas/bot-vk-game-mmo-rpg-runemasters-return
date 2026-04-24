import { gameBalance } from '../../config/game-balance';
import {
  derivePlayerStats,
  derivePlayerVitals,
  getUnlockedRuneSlotCount,
} from '../../modules/player/domain/player-stats';
import type { PlayerState, StatBlock } from '../../shared/types/game';
import { formatPlayerSkillProgressLine } from './player-skill-formatting';

const formatStatBlock = (stats: StatBlock): string => [
  `❤️ ${stats.health}`,
  `⚔️ ${stats.attack}`,
  `🛡️ ${stats.defence}`,
  `🔮 ${stats.magicDefence}`,
  `💨 ${stats.dexterity}`,
  `🧠 ${stats.intelligence}`,
].join(' · ');

const renderPlayerSkillsBlock = (player: PlayerState): readonly string[] => {
  const skills = [...(player.skills ?? [])].sort((left, right) => (
    right.experience - left.experience || left.skillCode.localeCompare(right.skillCode)
  ));

  if (skills.length === 0) {
    return ['🧰 Навыки: пока пусто'];
  }

  return [
    '🧰 Навыки',
    ...skills.map(formatPlayerSkillProgressLine),
  ];
};

export const renderProfile = (player: PlayerState): string => {
  const stats = derivePlayerStats(player);
  const vitals = derivePlayerVitals(player, stats);
  const nextLevelXp = gameBalance.progression.experienceForNextLevel(player.level);

  return [
    '👤 Профиль',
    '',
    `⭐ Ур. ${player.level} · 📊 ${player.experience}/${nextLevelXp}`,
    `💰 ${player.gold} пыли · ✨ ${player.radiance} сияния`,
    `❤️ ${vitals.currentHealth}/${vitals.maxHealth} HP · 🔷 ${vitals.currentMana}/${vitals.maxMana} маны`,
    `🏆 ${player.victories} побед · 💥 ${player.defeats} поражений`,
    `🧩 Слоты рун: ${getUnlockedRuneSlotCount(player)}`,
    '📜 Школы: в «Мастерстве»',
    '',
    ...renderPlayerSkillsBlock(player),
    '',
    `📊 Черты: ${formatStatBlock(stats)}`,
  ].join('\n');
};

export const renderInventory = (player: PlayerState): string => [
  '🎒 Инвентарь',
  '',
  `✨ ${player.radiance} сияния · 💰 ${player.gold} пыли`,
  '',
  `🧩 Осколки: обычн. ${player.inventory.usualShards} · необычн. ${player.inventory.unusualShards} · редк. ${player.inventory.rareShards}`,
  `💎 Выше: эпик ${player.inventory.epicShards} · легенд. ${player.inventory.legendaryShards} · миф. ${player.inventory.mythicalShards}`,
  '',
  `🧵 Материалы: кожа ${player.inventory.leather} · кость ${player.inventory.bone} · трава ${player.inventory.herb}`,
  `⚙️ Редкое: эссенция ${player.inventory.essence} · металл ${player.inventory.metal} · кристалл ${player.inventory.crystal}`,
  '',
  `🧪 Пилюли: HP ${player.inventory.healingPills ?? 0} · фокус ${player.inventory.focusPills ?? 0} · щит ${player.inventory.guardPills ?? 0} · ясность ${player.inventory.clarityPills ?? 0}`,
].join('\n');
