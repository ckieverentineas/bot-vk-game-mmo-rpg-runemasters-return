import type {
  BattleEnemyThreatRank,
  BattleEnemyThreatSnapshot,
} from '../../../shared/types/game';

export interface EnemyThreatGrowthInput {
  readonly enemyName: string;
  readonly survivalCount: number;
  readonly experience: number;
  readonly levelBonus: number;
}

const namedThreatSurvivalCount = 3;
const namedThreatLevelBonus = 3;
const namedThreatExperience = 24;

const calamityThreatSurvivalCount = 6;
const calamityThreatLevelBonus = 6;
const calamityThreatExperience = 60;

export const resolveEnemyThreatRank = (threat: EnemyThreatGrowthInput): BattleEnemyThreatRank => {
  if (
    threat.survivalCount >= calamityThreatSurvivalCount
    || threat.levelBonus >= calamityThreatLevelBonus
    || threat.experience >= calamityThreatExperience
  ) {
    return 'CALAMITY';
  }

  if (
    threat.survivalCount >= namedThreatSurvivalCount
    || threat.levelBonus >= namedThreatLevelBonus
    || threat.experience >= namedThreatExperience
  ) {
    return 'NAMED';
  }

  return 'SURVIVOR';
};

export const resolveEnemyThreatDisplayName = (threat: EnemyThreatGrowthInput): string => {
  const rank = resolveEnemyThreatRank(threat);

  if (rank === 'CALAMITY') {
    return `Бедствие «${threat.enemyName}»`;
  }

  if (rank === 'NAMED') {
    return `Упрямый ${threat.enemyName}`;
  }

  return threat.enemyName;
};

export const buildEnemyThreatSnapshot = (threat: EnemyThreatGrowthInput): BattleEnemyThreatSnapshot => ({
  rank: resolveEnemyThreatRank(threat),
  baseEnemyName: threat.enemyName,
  survivalCount: threat.survivalCount,
  experience: threat.experience,
  levelBonus: threat.levelBonus,
});

export const resolveEnemyThreatEncounterLine = (threat: EnemyThreatGrowthInput): string => {
  const displayName = resolveEnemyThreatDisplayName(threat);
  const rank = resolveEnemyThreatRank(threat);

  if (rank === 'CALAMITY') {
    return `⚠️ Бедствие на дороге: ${displayName} пережил ${threat.survivalCount} встречи и стал целью для сильных игроков.`;
  }

  if (rank === 'NAMED') {
    return `⚠️ Именная угроза: ${displayName} пережил ${threat.survivalCount} встречи и вернулся сильнее.`;
  }

  return `⚠️ Угроза вернулась: ${displayName} пережил ${threat.survivalCount} встречи, стал сильнее и снова держит этот путь.`;
};
