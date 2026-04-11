import { AppError } from '../../../shared/domain/AppError';
import type { BattleEnemySnapshot, BattlePlayerSnapshot, BiomeView, MobTemplateView, StatBlock, TurnOwner } from '../../../shared/types/game';

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const randomItem = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)];
const rollChance = (chancePercent: number): boolean => Math.random() * 100 < chancePercent;

const scaleStat = (base: number, scale: number, locationLevel: number): number => {
  const growthSteps = Math.max(0, locationLevel - 1) / 8;
  return Math.max(1, Math.floor(base * Math.pow(scale, growthSteps)));
};

export const pickEncounterTemplate = (templates: readonly MobTemplateView[], locationLevel: number): MobTemplateView => {
  if (templates.length === 0) {
    throw new AppError('mob_template_not_found', 'Для этой локации не найдено ни одного моба.');
  }

  const bosses = templates.filter((template) => template.isBoss);
  const elites = templates.filter((template) => template.isElite && !template.isBoss);
  const normals = templates.filter((template) => !template.isElite && !template.isBoss);

  const bossChance = locationLevel >= 20
    ? Math.min(18, 4 + Math.floor(locationLevel / 20) * 2)
    : 0;
  const eliteChance = locationLevel >= 5
    ? Math.min(35, 12 + Math.floor(locationLevel / 15) * 3)
    : 0;

  if (bosses.length > 0 && rollChance(bossChance)) {
    return randomItem(bosses);
  }

  if (elites.length > 0 && rollChance(eliteChance)) {
    return randomItem(elites);
  }

  return randomItem(normals.length > 0 ? normals : templates);
};

export const buildEnemySnapshot = (template: MobTemplateView, locationLevel: number): BattleEnemySnapshot => {
  const attack = scaleStat(template.baseStats.attack, template.scales.attack, locationLevel);
  const defence = scaleStat(template.baseStats.defence, template.scales.defence, locationLevel);
  const magicDefence = scaleStat(template.baseStats.magicDefence, template.scales.magicDefence, locationLevel);
  const dexterity = scaleStat(template.baseStats.dexterity, template.scales.dexterity, locationLevel);
  const intelligence = scaleStat(template.baseStats.intelligence, template.scales.intelligence, locationLevel);
  const health = scaleStat(template.baseStats.health, template.scales.health, locationLevel);

  return {
    code: template.code,
    name: template.name,
    kind: template.kind,
    isElite: template.isElite,
    isBoss: template.isBoss,
    attack,
    defence,
    magicDefence,
    dexterity,
    intelligence,
    maxHealth: health,
    currentHealth: health,
    maxMana: intelligence * 4,
    currentMana: intelligence * 4,
    experienceReward: Math.max(template.baseExperience, Math.floor(template.baseExperience + locationLevel * 1.5)),
    goldReward: Math.max(template.baseGold, Math.floor(template.baseGold + locationLevel)),
    runeDropChance: template.runeDropChance,
    attackText: template.attackText,
  };
};

export const buildPlayerSnapshot = (playerId: number, vkId: number, stats: StatBlock): BattlePlayerSnapshot => ({
  playerId,
  name: `Рунный мастер #${vkId}`,
  attack: stats.attack,
  defence: stats.defence,
  magicDefence: stats.magicDefence,
  dexterity: stats.dexterity,
  intelligence: stats.intelligence,
  maxHealth: stats.health,
  currentHealth: stats.health,
  maxMana: stats.intelligence * 4,
  currentMana: stats.intelligence * 4,
});

export const resolveInitialTurnOwner = (playerDexterity: number, enemyDexterity: number): TurnOwner => (
  playerDexterity >= enemyDexterity ? 'PLAYER' : 'ENEMY'
);

export const describeEncounter = (biome: BiomeView, enemy: BattleEnemySnapshot): string => (
  `🗺️ ${biome.name}: на вас выходит ${enemy.isBoss ? 'босс' : enemy.isElite ? 'элитный враг' : 'обычный враг'} ${enemy.name}.`
);
