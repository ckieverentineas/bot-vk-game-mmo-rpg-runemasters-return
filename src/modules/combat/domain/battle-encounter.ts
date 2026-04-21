import type { BattleEncounterView, BattlePlayerSnapshot, BattleView, TurnOwner } from '../../../shared/types/game';

const minimumFleeChancePercent = 15;
const maximumFleeChancePercent = 85;
const baseFleeChancePercent = 45;
const dexterityFleeChanceStep = 7;
const eliteFleePenaltyPercent = 10;
const bossFleePenaltyPercent = 20;

const clampFleeChance = (chancePercent: number): number => (
  Math.max(minimumFleeChancePercent, Math.min(maximumFleeChancePercent, chancePercent))
);

const resolveEnemyRankFleePenalty = (enemy: Pick<BattleView['enemy'], 'isElite' | 'isBoss'>): number => {
  if (enemy.isBoss) {
    return bossFleePenaltyPercent;
  }

  if (enemy.isElite) {
    return eliteFleePenaltyPercent;
  }

  return 0;
};

export const resolveFleeChancePercent = (
  player: Pick<BattlePlayerSnapshot, 'dexterity'>,
  enemy: Pick<BattleView['enemy'], 'dexterity' | 'isElite' | 'isBoss'>,
): number => {
  const dexterityDifference = player.dexterity - enemy.dexterity;
  const rankPenalty = resolveEnemyRankFleePenalty(enemy);

  return clampFleeChance(baseFleeChancePercent + dexterityDifference * dexterityFleeChanceStep - rankPenalty);
};

export const createBattleEncounter = (
  player: Pick<BattlePlayerSnapshot, 'dexterity'>,
  enemy: Pick<BattleView['enemy'], 'dexterity' | 'isElite' | 'isBoss'>,
  initialTurnOwner: TurnOwner,
): BattleEncounterView => ({
  status: 'OFFERED',
  initialTurnOwner,
  canFlee: true,
  fleeChancePercent: resolveFleeChancePercent(player, enemy),
});

export const isBattleEncounterOffered = (battle: Pick<BattleView, 'encounter'>): boolean => (
  battle.encounter?.status === 'OFFERED'
);
