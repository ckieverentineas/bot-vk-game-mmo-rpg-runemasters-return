import type {
  BattleEnemyThreatRank,
  BiomeView,
  PlayerState,
} from '../../../../shared/types/game';
import {
  resolveEnemyThreatBountyReward,
  resolveEnemyThreatDisplayName,
  resolveEnemyThreatRank,
  type EnemyThreatBountyReward,
  type EnemyThreatGrowthInput,
} from '../../../world/domain/enemy-threat-growth';

export interface RunicTavernThreatSource extends EnemyThreatGrowthInput {
  readonly enemyCode: string;
  readonly enemyName: string;
  readonly originBiomeCode: string;
  readonly originBiomeName: string;
  readonly currentBiomeCode: string;
  readonly lastSeenLocationLevel: number;
}

export interface RunicTavernThreatView {
  readonly enemyCode: string;
  readonly displayName: string;
  readonly baseEnemyName: string;
  readonly rank: Exclude<BattleEnemyThreatRank, 'SURVIVOR'>;
  readonly rankLabel: string;
  readonly currentBiomeCode: string;
  readonly currentBiomeName: string;
  readonly originBiomeName: string;
  readonly survivalCount: number;
  readonly experience: number;
  readonly levelBonus: number;
  readonly lastSeenLocationLevel: number;
  readonly dangerScore: number;
  readonly recommendedParty: boolean;
  readonly bountyReward: EnemyThreatBountyReward;
}

export interface RunicTavernBoardView {
  readonly player: PlayerState;
  readonly threats: readonly RunicTavernThreatView[];
  readonly namedCount: number;
  readonly calamityCount: number;
}

interface BuildRunicTavernBoardOptions {
  readonly player: PlayerState;
  readonly threats: readonly RunicTavernThreatSource[];
  readonly biomes: readonly BiomeView[];
}

const rankDangerBonus: Readonly<Record<Exclude<BattleEnemyThreatRank, 'SURVIVOR'>, number>> = {
  NAMED: 20,
  CALAMITY: 40,
};

const rankLabels: Readonly<Record<Exclude<BattleEnemyThreatRank, 'SURVIVOR'>, string>> = {
  NAMED: 'именная угроза',
  CALAMITY: 'бедствие',
};

const countThreatsByRank = (
  threats: readonly RunicTavernThreatView[],
  rank: RunicTavernThreatView['rank'],
): number => (
  threats.filter((threat) => threat.rank === rank).length
);

const findBiomeName = (
  biomes: readonly BiomeView[],
  biomeCode: string,
): string => (
  biomes.find((biome) => biome.code === biomeCode)?.name ?? biomeCode
);

const calculateDangerScore = (
  threat: RunicTavernThreatSource,
  rank: Exclude<BattleEnemyThreatRank, 'SURVIVOR'>,
): number => (
  rankDangerBonus[rank]
  + threat.levelBonus * 10
  + threat.survivalCount * 5
  + Math.floor(threat.experience / 3)
  + threat.lastSeenLocationLevel
);

const shouldRecommendParty = (
  threat: RunicTavernThreatSource,
  rank: Exclude<BattleEnemyThreatRank, 'SURVIVOR'>,
): boolean => (
  rank === 'CALAMITY'
  || threat.survivalCount >= 5
  || threat.levelBonus >= 5
);

const toTavernThreatView = (
  threat: RunicTavernThreatSource,
  biomes: readonly BiomeView[],
): RunicTavernThreatView | null => {
  const rank = resolveEnemyThreatRank(threat);
  if (rank === 'SURVIVOR') {
    return null;
  }

  return {
    enemyCode: threat.enemyCode,
    displayName: resolveEnemyThreatDisplayName(threat),
    baseEnemyName: threat.enemyName,
    rank,
    rankLabel: rankLabels[rank],
    currentBiomeCode: threat.currentBiomeCode,
    currentBiomeName: findBiomeName(biomes, threat.currentBiomeCode),
    originBiomeName: threat.originBiomeName,
    survivalCount: threat.survivalCount,
    experience: threat.experience,
    levelBonus: threat.levelBonus,
    lastSeenLocationLevel: threat.lastSeenLocationLevel,
    dangerScore: calculateDangerScore(threat, rank),
    recommendedParty: shouldRecommendParty(threat, rank),
    bountyReward: resolveEnemyThreatBountyReward(threat),
  };
};

export const buildRunicTavernBoardView = (
  options: BuildRunicTavernBoardOptions,
): RunicTavernBoardView => {
  const threats = options.threats
    .map((threat) => toTavernThreatView(threat, options.biomes))
    .filter((threat): threat is RunicTavernThreatView => threat !== null)
    .sort((left, right) => (
      right.dangerScore - left.dangerScore
      || left.displayName.localeCompare(right.displayName)
    ));

  return {
    player: options.player,
    threats,
    namedCount: countThreatsByRank(threats, 'NAMED'),
    calamityCount: countThreatsByRank(threats, 'CALAMITY'),
  };
};
