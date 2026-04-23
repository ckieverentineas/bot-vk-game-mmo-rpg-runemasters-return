import type { ResourceReward } from '../../../../shared/types/game';

import { hasSchemaVersion } from './versioned-contract';
import { isResourceRewardSnapshot } from './resource-reward-contract';

export const DAILY_ACTIVITY_LEDGER_SCHEMA_VERSION = 1 as const;
export const DAILY_TRACE_SOURCE_TYPE = 'DAILY_TRACE' as const;

export interface DailyActivityLedgerEntryV1 {
  readonly schemaVersion: typeof DAILY_ACTIVITY_LEDGER_SCHEMA_VERSION;
  readonly kind: typeof DAILY_TRACE_SOURCE_TYPE;
  readonly status: 'APPLIED';
  readonly playerId: number;
  readonly ledgerKey: string;
  readonly sourceType: typeof DAILY_TRACE_SOURCE_TYPE;
  readonly sourceId: string;
  readonly activityCode: string;
  readonly gameDay: string;
  readonly reward: ResourceReward;
  readonly appliedAt: string;
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const buildDailyActivitySourceId = (activityCode: string, gameDay: string): string => (
  `${activityCode}:${gameDay}`
);

export const buildDailyActivityLedgerKey = (
  playerId: number,
  activityCode: string,
  gameDay: string,
): string => (
  `daily_activity:${playerId}:${buildDailyActivitySourceId(activityCode, gameDay)}`
);

export const createDailyActivityLedgerEntry = (
  playerId: number,
  activityCode: string,
  gameDay: string,
  reward: ResourceReward,
  appliedAt: string,
): DailyActivityLedgerEntryV1 => ({
  schemaVersion: DAILY_ACTIVITY_LEDGER_SCHEMA_VERSION,
  kind: DAILY_TRACE_SOURCE_TYPE,
  status: 'APPLIED',
  playerId,
  ledgerKey: buildDailyActivityLedgerKey(playerId, activityCode, gameDay),
  sourceType: DAILY_TRACE_SOURCE_TYPE,
  sourceId: buildDailyActivitySourceId(activityCode, gameDay),
  activityCode,
  gameDay,
  reward,
  appliedAt,
});

export const isDailyActivityLedgerEntry = (value: unknown): value is DailyActivityLedgerEntryV1 => {
  if (
    !hasSchemaVersion(value, DAILY_ACTIVITY_LEDGER_SCHEMA_VERSION)
    || value.kind !== DAILY_TRACE_SOURCE_TYPE
    || value.status !== 'APPLIED'
    || !isNumber(value.playerId)
    || !isString(value.ledgerKey)
    || value.sourceType !== DAILY_TRACE_SOURCE_TYPE
    || !isString(value.sourceId)
    || !isString(value.activityCode)
    || !isString(value.gameDay)
    || !isResourceRewardSnapshot(value.reward)
    || !isString(value.appliedAt)
  ) {
    return false;
  }

  return value.sourceId === buildDailyActivitySourceId(value.activityCode, value.gameDay)
    && value.ledgerKey === buildDailyActivityLedgerKey(value.playerId, value.activityCode, value.gameDay);
};
