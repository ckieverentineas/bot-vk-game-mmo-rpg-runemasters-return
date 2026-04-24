import type {
  BestiaryEnemyView,
  BestiaryLocationDetailView,
  BestiaryLocationSummaryView,
  BestiaryOverviewView,
} from '../../modules/world/application/read-models/bestiary';
import type { ResourceReward, StatBlock } from '../../shared/types/game';
import {
  formatInventoryDelta,
  formatResourceReward,
} from './message-formatting';

const statOrder: readonly (keyof StatBlock)[] = [
  'health',
  'attack',
  'defence',
  'magicDefence',
  'dexterity',
  'intelligence',
];

const statLabels: Readonly<Record<keyof StatBlock, string>> = {
  health: 'ЗДР',
  attack: 'АТК',
  defence: 'ФЗАЩ',
  magicDefence: 'МЗАЩ',
  dexterity: 'ЛВК',
  intelligence: 'ИНТ',
};

const enemyKindLabels: Readonly<Record<string, string>> = {
  slime: 'слизь',
  wolf: 'зверь',
  mage: 'заклинатель',
  spirit: 'дух',
  boar: 'натиск',
  knight: 'доспех',
  goblin: 'налетчик',
  troll: 'громила',
  lich: 'нежить',
  demon: 'бездна',
  dragon: 'дракон',
};

const formatBiomeLevels = (location: BestiaryLocationSummaryView): string => {
  if (location.biome.minLevel === location.biome.maxLevel) {
    return `ур. ${location.biome.minLevel}`;
  }

  return `ур. ${location.biome.minLevel}-${location.biome.maxLevel}`;
};

const formatReward = (reward: ResourceReward): string => formatResourceReward(reward).replace(/^\+/, '+');

const formatDiscoveryRewardStatus = (location: BestiaryLocationSummaryView): string => {
  if (location.discoveryReward.claimedNow) {
    return 'получено сейчас';
  }

  if (location.discoveryReward.isClaimed) {
    return 'получено';
  }

  if (location.isUnlocked) {
    return 'доступно';
  }

  return `откроется с ур. ${location.unlockLocationLevel}`;
};

const formatLocationOverview = (location: BestiaryLocationSummaryView): string => {
  const marker = location.isUnlocked ? '📍' : '🔒';

  return [
    `${marker} ${location.biome.name} · ${formatBiomeLevels(location)}`,
    `   🧭 ${location.discoveredEnemyCount}/${location.totalEnemyCount} · 🎁 ${location.revealedDropCount}/${location.totalEnemyCount}`,
    `   🏁 ${formatReward(location.discoveryReward.reward)} · ${formatDiscoveryRewardStatus(location)}`,
  ].join('\n');
};

const formatEnemyRole = (enemy: BestiaryEnemyView): string => {
  if (enemy.template.isBoss) {
    return 'босс';
  }

  if (enemy.template.isElite) {
    return 'элита';
  }

  return 'обычный';
};

const formatEnemyKind = (kind: string): string => enemyKindLabels[kind] ?? kind;

const formatStats = (stats: StatBlock): string => (
  statOrder.map((key) => `${statLabels[key]} ${stats[key]}`).join(' · ')
);

const formatDropLine = (enemy: BestiaryEnemyView): string => {
  if (!enemy.isDropRevealed) {
    return '🎁 добыча скрыта';
  }

  return [
    `🎁 ${formatInventoryDelta(enemy.template.lootTable)}`,
    `🔮 руна ${enemy.template.runeDropChance}%`,
  ].join(' · ');
};

const formatTacticalProfile = (enemy: BestiaryEnemyView): string => {
  if (!enemy.tacticalProfile) {
    return '⚠️ след ещё не изучен';
  }

  return [
    `⚠️ ${enemy.tacticalProfile.habitLine}`,
    `✅ ${enemy.tacticalProfile.answerLine}`,
  ].join('\n   ');
};

const formatKillMilestoneStatus = (milestone: BestiaryEnemyView['killMilestones'][number]): string => {
  if (milestone.claimedNow) {
    return 'получено сейчас';
  }

  if (milestone.isClaimed) {
    return 'получено';
  }

  return milestone.isCompleted ? 'доступно' : 'впереди';
};

const formatKillMilestoneLine = (enemy: BestiaryEnemyView): string => {
  const milestones = enemy.killMilestones.map((milestone) => (
    `${milestone.threshold} побед: ${formatReward(milestone.reward)} · ${formatKillMilestoneStatus(milestone)}`
  ));

  return milestones.length > 0
    ? `🏁 ${milestones.join('; ')}`
    : '🏁 наград пока нет';
};

const formatEnemyLine = (enemy: BestiaryEnemyView, index: number): string => {
  if (!enemy.isDiscovered) {
    return `${index + 1}. ??? · след не встречен`;
  }

  return [
    `${index + 1}. ${enemy.template.name} · ${formatEnemyRole(enemy)} · ${formatEnemyKind(enemy.template.kind)}`,
    `   🏆 ${enemy.victoryCount} · 📊 ${formatStats(enemy.template.baseStats)}`,
    `   ${formatTacticalProfile(enemy)}`,
    `   ${formatDropLine(enemy)}`,
    `   ${formatKillMilestoneLine(enemy)}`,
  ].join('\n');
};

export const renderBestiaryOverview = (bestiary: BestiaryOverviewView): string => [
  '📖 Бестиарий',
  '',
  ...bestiary.locations.map(formatLocationOverview).flatMap((location, index) => (
    index === 0 ? [location] : ['', location]
  )),
  '',
  `📄 ${bestiary.pageNumber}/${bestiary.totalPages} · локаций: ${bestiary.totalLocations}`,
].join('\n');

export const renderBestiaryLocationDetail = (detail: BestiaryLocationDetailView): string => [
  `📖 Бестиарий / ${detail.location.biome.name}`,
  `${formatBiomeLevels(detail.location)} · 🏁 ${formatReward(detail.location.discoveryReward.reward)} · ${formatDiscoveryRewardStatus(detail.location)}`,
  `🧭 ${detail.location.discoveredEnemyCount}/${detail.location.totalEnemyCount} · 🎁 ${detail.location.revealedDropCount}/${detail.location.totalEnemyCount}`,
  '',
  ...detail.enemies.map(formatEnemyLine).flatMap((enemy, index) => (
    index === 0 ? [enemy] : ['', enemy]
  )),
].join('\n');

export const renderBestiary = renderBestiaryOverview;
