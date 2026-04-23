import type { ResourceReward } from '../../../../shared/types/game';

import { isResourceRewardSnapshot } from './resource-reward-contract';
import { hasSchemaVersion } from './versioned-contract';

export const BESTIARY_ENEMY_KILL_MILESTONE_LEDGER_SCHEMA_VERSION = 1 as const;
export const BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE = 'BESTIARY_ENEMY_KILL_MILESTONE' as const;

export interface BestiaryEnemyKillMilestoneLedgerEntryV1 {
  readonly schemaVersion: typeof BESTIARY_ENEMY_KILL_MILESTONE_LEDGER_SCHEMA_VERSION;
  readonly kind: typeof BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE;
  readonly status: 'APPLIED';
  readonly playerId: number;
  readonly ledgerKey: string;
  readonly sourceType: typeof BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE;
  readonly sourceId: string;
  readonly enemyCode: string;
  readonly threshold: number;
  readonly reward: ResourceReward;
  readonly appliedAt: string;
}

export interface BestiaryEnemyKillMilestoneSource {
  readonly enemyCode: string;
  readonly threshold: number;
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const buildBestiaryEnemyKillMilestoneSourceId = (
  enemyCode: string,
  threshold: number,
): string => `${enemyCode}:${threshold}`;

export const parseBestiaryEnemyKillMilestoneSourceId = (
  sourceId: string,
): BestiaryEnemyKillMilestoneSource | null => {
  const thresholdDelimiterIndex = sourceId.lastIndexOf(':');

  if (thresholdDelimiterIndex <= 0 || thresholdDelimiterIndex === sourceId.length - 1) {
    return null;
  }

  const enemyCode = sourceId.slice(0, thresholdDelimiterIndex);
  const threshold = Number(sourceId.slice(thresholdDelimiterIndex + 1));

  if (!Number.isInteger(threshold) || threshold <= 0) {
    return null;
  }

  return { enemyCode, threshold };
};

export const buildBestiaryEnemyKillMilestoneLedgerKey = (
  playerId: number,
  enemyCode: string,
  threshold: number,
): string => `bestiary_kill:${playerId}:${buildBestiaryEnemyKillMilestoneSourceId(enemyCode, threshold)}`;

export const createBestiaryEnemyKillMilestoneLedgerEntry = (
  playerId: number,
  enemyCode: string,
  threshold: number,
  reward: ResourceReward,
  appliedAt: string,
): BestiaryEnemyKillMilestoneLedgerEntryV1 => ({
  schemaVersion: BESTIARY_ENEMY_KILL_MILESTONE_LEDGER_SCHEMA_VERSION,
  kind: BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE,
  status: 'APPLIED',
  playerId,
  ledgerKey: buildBestiaryEnemyKillMilestoneLedgerKey(playerId, enemyCode, threshold),
  sourceType: BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE,
  sourceId: buildBestiaryEnemyKillMilestoneSourceId(enemyCode, threshold),
  enemyCode,
  threshold,
  reward,
  appliedAt,
});

export const isBestiaryEnemyKillMilestoneLedgerEntry = (
  value: unknown,
): value is BestiaryEnemyKillMilestoneLedgerEntryV1 => {
  if (
    !hasSchemaVersion(value, BESTIARY_ENEMY_KILL_MILESTONE_LEDGER_SCHEMA_VERSION)
    || value.kind !== BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE
    || value.status !== 'APPLIED'
    || !isNumber(value.playerId)
    || !isString(value.ledgerKey)
    || value.sourceType !== BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE
    || !isString(value.sourceId)
    || !isString(value.enemyCode)
    || !isNumber(value.threshold)
    || !isResourceRewardSnapshot(value.reward)
    || !isString(value.appliedAt)
  ) {
    return false;
  }

  return value.sourceId === buildBestiaryEnemyKillMilestoneSourceId(value.enemyCode, value.threshold)
    && value.ledgerKey === buildBestiaryEnemyKillMilestoneLedgerKey(
      value.playerId,
      value.enemyCode,
      value.threshold,
    );
};
