import type {
  BattleEnemyThreatRank,
  BattleEnemyThreatSnapshot,
  RuneRarity,
} from '../../../shared/types/game';

export interface EnemyThreatGrowthInput {
  readonly enemyName: string;
  readonly survivalCount: number;
  readonly experience: number;
  readonly levelBonus: number;
}

export interface EnemyThreatBountyReward {
  readonly experience: number;
  readonly gold: number;
  readonly shards: Partial<Record<RuneRarity, number>>;
}

const namedThreatSurvivalCount = 3;
const namedThreatLevelBonus = 3;
const namedThreatExperience = 24;

const calamityThreatSurvivalCount = 6;
const calamityThreatLevelBonus = 6;
const calamityThreatExperience = 60;

const emptyBountyReward: EnemyThreatBountyReward = {
  experience: 0,
  gold: 0,
  shards: {},
};

const rankBountyBase: Readonly<Record<Exclude<BattleEnemyThreatRank, 'SURVIVOR'>, EnemyThreatBountyReward>> = {
  NAMED: {
    experience: 4,
    gold: 8,
    shards: {
      USUAL: 1,
      UNUSUAL: 1,
    },
  },
  CALAMITY: {
    experience: 12,
    gold: 25,
    shards: {
      USUAL: 3,
      UNUSUAL: 2,
      RARE: 1,
    },
  },
};

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

export const resolveEnemyThreatBountyReward = (threat: EnemyThreatGrowthInput): EnemyThreatBountyReward => {
  const rank = resolveEnemyThreatRank(threat);
  if (rank === 'SURVIVOR') {
    return emptyBountyReward;
  }

  const base = rankBountyBase[rank];
  return {
    experience: base.experience
      + threat.levelBonus
      + threat.survivalCount
      + Math.floor(threat.experience / 12),
    gold: base.gold
      + threat.survivalCount * 3
      + threat.levelBonus * 4
      + Math.floor(threat.experience / 6),
    shards: { ...base.shards },
  };
};

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
