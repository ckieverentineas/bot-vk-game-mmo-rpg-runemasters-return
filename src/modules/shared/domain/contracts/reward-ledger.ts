import { hasSchemaVersion } from './versioned-contract';
import type { RewardIntent } from './reward-intent';
import { isRewardIntent } from './reward-intent';

export const REWARD_LEDGER_SCHEMA_VERSION = 1 as const;

export interface RewardLedgerEntryV1 {
  readonly schemaVersion: typeof REWARD_LEDGER_SCHEMA_VERSION;
  readonly ledgerKey: string;
  readonly status: 'APPLIED';
  readonly sourceType: RewardIntent['sourceType'];
  readonly sourceId: string;
  readonly playerId: number;
  readonly intent: RewardIntent;
  readonly appliedAt: string;
}

export type RewardLedgerEntry = RewardLedgerEntryV1;

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const isRewardLedgerEntry = (value: unknown): value is RewardLedgerEntry => (
  hasSchemaVersion(value, REWARD_LEDGER_SCHEMA_VERSION)
  && isString(value.ledgerKey)
  && value.status === 'APPLIED'
  && value.sourceType === 'BATTLE_VICTORY'
  && isString(value.sourceId)
  && isNumber(value.playerId)
  && isRewardIntent(value.intent)
  && isString(value.appliedAt)
);

export const createAppliedRewardLedgerEntry = (
  intent: RewardIntent,
  appliedAt: string,
): RewardLedgerEntry => ({
  schemaVersion: REWARD_LEDGER_SCHEMA_VERSION,
  ledgerKey: intent.intentId,
  status: 'APPLIED',
  sourceType: intent.sourceType,
  sourceId: intent.sourceId,
  playerId: intent.playerId,
  intent,
  appliedAt,
});
