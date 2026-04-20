import { AppError } from '../../../shared/domain/AppError';
import type { BattleEnemySnapshot, BattlePlayerSnapshot, BiomeView, MobTemplateView, StatBlock, TurnOwner } from '../../../shared/types/game';

interface EncounterRandomSource {
  rollPercentage(chancePercent: number): boolean;
  pickOne<T>(items: readonly T[]): T;
}

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const randomItem = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)];
const rollChance = (chancePercent: number): boolean => Math.random() * 100 < chancePercent;

const defaultEncounterRandom: EncounterRandomSource = {
  rollPercentage: rollChance,
  pickOne: randomItem,
};

const preferredSchoolEliteCodes: Partial<Record<string, string>> = {
  ember: 'ash-seer',
  stone: 'stonehorn-ram',
};

const encounterHintByEnemyCode: Partial<Record<string, { schoolCode: string; genericHint: string; schoolHint: string }>> = {
  'ash-seer': {
    schoolCode: 'ember',
    genericHint: 'Подсказка: этот элитный враг позже попробует пробить защиту, так что давление и дожим здесь ценнее пассивной стойки.',
    schoolHint: 'Подсказка: это первое испытание школы Пламени — этого врага выгоднее дожимать и давить уроном, чем уходить в глухую защиту.',
  },
  'stonehorn-ram': {
    schoolCode: 'stone',
    genericHint: 'Подсказка: этот элитный враг позже готовит тяжёлый удар, так что защита и ответный ход здесь особенно ценны.',
    schoolHint: 'Подсказка: это первое испытание школы Тверди — защита и каменный ответ помогают пережить его разгон и наказать в окно после удара.',
  },
};

const scaleStat = (base: number, scale: number, locationLevel: number): number => {
  const growthSteps = Math.max(0, locationLevel - 1) / 8;
  return Math.max(1, Math.floor(base * Math.pow(scale, growthSteps)));
};

export const pickEncounterTemplate = (
  templates: readonly MobTemplateView[],
  locationLevel: number,
  preferredSchoolCode: string | null = null,
  random: EncounterRandomSource = defaultEncounterRandom,
): MobTemplateView => {
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
  const preferredEliteCode = preferredSchoolCode ? preferredSchoolEliteCodes[preferredSchoolCode] ?? null : null;
  const preferredElite = preferredEliteCode
    ? elites.find((template) => template.code === preferredEliteCode) ?? null
    : null;
  const preferredEliteChance = locationLevel >= 3 ? 50 : 0;

  if (bosses.length > 0 && random.rollPercentage(bossChance)) {
    return random.pickOne(bosses);
  }

  if (preferredElite && preferredEliteChance > 0 && random.rollPercentage(preferredEliteChance)) {
    return preferredElite;
  }

  if (elites.length > 0 && random.rollPercentage(eliteChance)) {
    return random.pickOne(elites);
  }

  return random.pickOne(normals.length > 0 ? normals : templates);
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
    intent: null,
    hasUsedSignatureMove: false,
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
  playerDexterity + 1 >= enemyDexterity ? 'PLAYER' : 'ENEMY'
);

export const describeEncounter = (
  biome: BiomeView,
  enemy: BattleEnemySnapshot,
  currentSchoolCode: string | null = null,
): string => {
  const baseLine = `🗺️ ${biome.name}: на вас выходит ${enemy.isBoss ? 'босс' : enemy.isElite ? 'элитный враг' : 'обычный враг'} ${enemy.name}.`;
  const encounterHint = encounterHintByEnemyCode[enemy.code];
  if (!encounterHint) {
    return baseLine;
  }

  return `${baseLine} ${currentSchoolCode === encounterHint.schoolCode ? encounterHint.schoolHint : encounterHint.genericHint}`;
};
