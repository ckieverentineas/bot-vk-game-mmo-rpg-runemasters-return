import type { BattleResult, BattleView } from '../../../shared/types/game';

export interface EnemyThreatSurvival {
  readonly battleId: string;
  readonly enemyCode: string;
  readonly enemyName: string;
  readonly originBiomeCode: string;
  readonly originBiomeName: string;
  readonly currentBiomeCode: string;
  readonly lastSeenLocationLevel: number;
  readonly survivalResult: Extract<BattleResult, 'DEFEAT' | 'FLED'>;
  readonly experienceGain: number;
  readonly levelBonus: number;
}

export interface EnemyThreatDefeat {
  readonly battleId: string;
  readonly enemyCode: string;
  readonly originBiomeCode: string;
  readonly currentBiomeCode: string;
  readonly lastSeenLocationLevel: number;
}

const enemyThreatSurvivalResults: readonly BattleResult[] = ['DEFEAT', 'FLED'];

const isEnemyThreatSurvivalResult = (
  result: BattleResult | null,
): result is EnemyThreatSurvival['survivalResult'] => (
  result !== null && enemyThreatSurvivalResults.includes(result)
);

const resolveThreatOrigin = (
  battle: BattleView,
): Pick<EnemyThreatSurvival, 'originBiomeCode' | 'originBiomeName' | 'levelBonus'> => {
  const roaming = battle.enemy.roaming;
  if (!roaming) {
    return {
      originBiomeCode: battle.biomeCode,
      originBiomeName: battle.biomeCode,
      levelBonus: 1,
    };
  }

  return {
    originBiomeCode: roaming.originBiomeCode,
    originBiomeName: roaming.originBiomeName,
    levelBonus: Math.max(1, roaming.levelBonus),
  };
};

const resolveExperienceGain = (battle: BattleView): number => (
  Math.max(1, battle.locationLevel + (battle.enemy.roaming?.experienceBonus ?? 0))
);

export const resolveEnemyThreatSurvival = (battle: BattleView): EnemyThreatSurvival | null => {
  if (
    battle.status !== 'COMPLETED'
    || !isEnemyThreatSurvivalResult(battle.result)
    || battle.enemy.currentHealth <= 0
  ) {
    return null;
  }

  const origin = resolveThreatOrigin(battle);

  return {
    battleId: battle.id,
    enemyCode: battle.enemy.code,
    enemyName: battle.enemy.name,
    originBiomeCode: origin.originBiomeCode,
    originBiomeName: origin.originBiomeName,
    currentBiomeCode: battle.biomeCode,
    lastSeenLocationLevel: battle.locationLevel,
    survivalResult: battle.result,
    experienceGain: resolveExperienceGain(battle),
    levelBonus: origin.levelBonus,
  };
};

export const resolveEnemyThreatDefeat = (battle: BattleView): EnemyThreatDefeat | null => {
  if (
    battle.status !== 'COMPLETED'
    || battle.result !== 'VICTORY'
    || battle.enemy.currentHealth > 0
  ) {
    return null;
  }

  const origin = resolveThreatOrigin(battle);

  return {
    battleId: battle.id,
    enemyCode: battle.enemy.code,
    originBiomeCode: origin.originBiomeCode,
    currentBiomeCode: battle.biomeCode,
    lastSeenLocationLevel: battle.locationLevel,
  };
};
