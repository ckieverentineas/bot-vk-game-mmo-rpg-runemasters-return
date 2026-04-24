import type { BattleEnemyKnowledgeSnapshot, BattleEnemySnapshot } from '../../../shared/types/game';
import type { BestiaryDiscoveryState } from './bestiary';

const findVictoryCount = (
  enemyCode: string,
  discovery: BestiaryDiscoveryState,
): number => (
  discovery.enemyVictoryCounts
    ?.find((entry) => entry.enemyCode === enemyCode)
    ?.victoryCount ?? 0
);

export const buildEnemyKnowledgeSnapshot = (
  enemyCode: string,
  discovery: BestiaryDiscoveryState,
): BattleEnemyKnowledgeSnapshot => {
  const victoryCount = Math.max(0, Math.floor(findVictoryCount(enemyCode, discovery)));

  return {
    isDiscovered: discovery.discoveredEnemyCodes.includes(enemyCode),
    hasTrophyStudy: discovery.rewardedEnemyCodes.includes(enemyCode) || victoryCount > 0,
    victoryCount,
  };
};

export const attachEnemyKnowledgeSnapshot = (
  enemy: BattleEnemySnapshot,
  discovery: BestiaryDiscoveryState,
): BattleEnemySnapshot => ({
  ...enemy,
  knowledge: buildEnemyKnowledgeSnapshot(enemy.code, discovery),
});

export const mergeEnemyKnowledgeSnapshots = (
  snapshots: readonly BattleEnemyKnowledgeSnapshot[],
): BattleEnemyKnowledgeSnapshot | undefined => {
  if (snapshots.length === 0) {
    return undefined;
  }

  return {
    isDiscovered: snapshots.some((snapshot) => snapshot.isDiscovered),
    hasTrophyStudy: snapshots.some((snapshot) => snapshot.hasTrophyStudy),
    victoryCount: Math.max(...snapshots.map((snapshot) => snapshot.victoryCount)),
  };
};
