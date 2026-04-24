import type { BattleResult, BattleView } from '../../../shared/types/game';

export interface RoamingThreatSurvival {
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

const roamingThreatSurvivalResults: readonly BattleResult[] = ['DEFEAT', 'FLED'];

const isRoamingThreatSurvivalResult = (
  result: BattleResult | null,
): result is RoamingThreatSurvival['survivalResult'] => (
  result !== null && roamingThreatSurvivalResults.includes(result)
);

const resolveExperienceGain = (battle: BattleView): number => (
  Math.max(1, battle.locationLevel + (battle.enemy.roaming?.experienceBonus ?? 0))
);

export const resolveRoamingThreatSurvival = (battle: BattleView): RoamingThreatSurvival | null => {
  const roaming = battle.enemy.roaming;
  if (
    battle.status !== 'COMPLETED'
    || !isRoamingThreatSurvivalResult(battle.result)
    || battle.enemy.currentHealth <= 0
    || roaming?.direction !== 'HIGHER_BIOME'
  ) {
    return null;
  }

  return {
    battleId: battle.id,
    enemyCode: battle.enemy.code,
    enemyName: battle.enemy.name,
    originBiomeCode: roaming.originBiomeCode,
    originBiomeName: roaming.originBiomeName,
    currentBiomeCode: battle.biomeCode,
    lastSeenLocationLevel: battle.locationLevel,
    survivalResult: battle.result,
    experienceGain: resolveExperienceGain(battle),
    levelBonus: Math.max(1, roaming.levelBonus),
  };
};
