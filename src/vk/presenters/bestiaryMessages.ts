import type { BestiaryEnemyView, BestiaryLocationView, BestiaryView } from '../../modules/world/application/read-models/bestiary';
import type { StatBlock } from '../../shared/types/game';
import { formatInventoryDelta } from './message-formatting';

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
  goblin: 'налётчик',
  troll: 'громила',
  lich: 'нежить',
  demon: 'бездна',
  dragon: 'дракон',
};

const formatBiomeLevels = (location: BestiaryLocationView): string => {
  if (location.biome.minLevel === location.biome.maxLevel) {
    return `ур. ${location.biome.minLevel}`;
  }

  return `ур. ${location.biome.minLevel}-${location.biome.maxLevel}`;
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
    return 'добыча скрыта до первого разобранного трофея';
  }

  return [
    `добыча: ${formatInventoryDelta(enemy.template.lootTable)}`,
    `шанс руны: ${enemy.template.runeDropChance}%`,
  ].join(' · ');
};

const formatTacticalProfile = (enemy: BestiaryEnemyView): string => {
  if (!enemy.tacticalProfile) {
    return 'опасность: след ещё не изучен';
  }

  return [
    `опасность: ${enemy.tacticalProfile.habitLine}`,
    `ответ: ${enemy.tacticalProfile.answerLine}`,
  ].join('\n   ');
};

const formatEnemyLine = (enemy: BestiaryEnemyView, index: number): string => {
  if (!enemy.isDiscovered) {
    return `${index + 1}. ??? — след не встречен`;
  }

  return [
    `${index + 1}. ${enemy.template.name} · ${formatEnemyRole(enemy)} · ${formatEnemyKind(enemy.template.kind)}`,
    `   база: ${formatStats(enemy.template.baseStats)}`,
    `   ${formatTacticalProfile(enemy)}`,
    `   ${formatDropLine(enemy)}`,
  ].join('\n');
};

const formatLocation = (location: BestiaryLocationView): string => [
  `📍 ${location.biome.name} · ${formatBiomeLevels(location)}`,
  `Следы: ${location.discoveredEnemyCount}/${location.totalEnemyCount} · добыча: ${location.revealedDropCount}/${location.totalEnemyCount}`,
  ...location.enemies.map(formatEnemyLine),
].join('\n');

export const renderBestiary = (bestiary: BestiaryView): string => [
  '📖 Бестиарий',
  '',
  'След и повадка открываются после первой встречи. Добыча проявляется после первого разобранного трофея.',
  '',
  ...bestiary.locations.map(formatLocation).flatMap((location, index) => (
    index === 0 ? [location] : ['', location]
  )),
  '',
  `Страница ${bestiary.pageNumber} из ${bestiary.totalPages} · локаций: ${bestiary.totalLocations}`,
].join('\n');
