import { hasSchemaVersion, isJsonRecord } from './versioned-contract';
import type {
  PendingRewardAppliedSnapshotV1,
  PendingRewardExpiredSnapshotV1,
  PendingRewardOpenSnapshotV1,
  PendingRewardSnapshot,
  PendingRewardSnapshotStatus,
} from '../../../rewards/domain/pending-reward-snapshot';
import { isPendingRewardSnapshot } from '../../../rewards/domain/pending-reward-snapshot';
import type { RewardIntent } from './reward-intent';
import { isRewardIntent } from './reward-intent';

export const REWARD_LEDGER_SCHEMA_VERSION = 1 as const;

export type RewardLedgerStatus = 'PENDING' | 'APPLIED' | 'EXPIRED';

export interface RewardLedgerEntryBaseV1 {
  readonly schemaVersion: typeof REWARD_LEDGER_SCHEMA_VERSION;
  readonly ledgerKey: string;
  readonly status: RewardLedgerStatus;
  readonly sourceType: RewardIntent['sourceType'];
  readonly sourceId: string;
  readonly playerId: number;
}

export interface AppliedRewardLedgerEntryV1 extends RewardLedgerEntryBaseV1 {
  readonly status: 'APPLIED';
  readonly intent: RewardIntent;
  readonly appliedAt: string;
}

export interface PendingRewardLedgerEntryV1 extends RewardLedgerEntryBaseV1 {
  readonly status: 'PENDING';
  readonly pendingRewardSnapshot: PendingRewardOpenSnapshotV1;
  readonly createdAt: string;
}

export interface AppliedPendingRewardLedgerEntryV1 extends RewardLedgerEntryBaseV1 {
  readonly status: 'APPLIED';
  readonly pendingRewardSnapshot: PendingRewardAppliedSnapshotV1;
  readonly appliedAt: string;
}

export interface ExpiredPendingRewardLedgerEntryV1 extends RewardLedgerEntryBaseV1 {
  readonly status: 'EXPIRED';
  readonly pendingRewardSnapshot: PendingRewardExpiredSnapshotV1;
  readonly expiredAt: string;
}

export type RewardLedgerEntry =
  | AppliedRewardLedgerEntryV1
  | PendingRewardLedgerEntryV1
  | AppliedPendingRewardLedgerEntryV1
  | ExpiredPendingRewardLedgerEntryV1;

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isRewardLedgerBase = (value: unknown): value is RewardLedgerEntryBaseV1 => (
  hasSchemaVersion(value, REWARD_LEDGER_SCHEMA_VERSION)
  && isString(value.ledgerKey)
  && (value.status === 'PENDING' || value.status === 'APPLIED' || value.status === 'EXPIRED')
  && value.sourceType === 'BATTLE_VICTORY'
  && isString(value.sourceId)
  && isNumber(value.playerId)
);

const hasIntentLedgerIdentity = (
  value: RewardLedgerEntryBaseV1,
  intent: RewardIntent,
): boolean => (
  value.ledgerKey === intent.intentId
  && value.sourceType === intent.sourceType
  && value.sourceId === intent.sourceId
  && value.playerId === intent.playerId
);

const hasPendingRewardLedgerIdentity = (
  value: RewardLedgerEntryBaseV1,
  snapshot: PendingRewardSnapshot,
): boolean => (
  value.ledgerKey === snapshot.intentId
  && value.sourceType === snapshot.sourceType
  && value.sourceId === snapshot.sourceId
  && value.playerId === snapshot.playerId
);

const hasPendingRewardSnapshotWithStatus = <TStatus extends PendingRewardSnapshotStatus>(
  value: unknown,
  status: TStatus,
): value is Extract<PendingRewardSnapshot, { readonly status: TStatus }> => (
  isPendingRewardSnapshot(value)
  && value.status === status
);

const isAppliedIntentLedgerEntry = (value: unknown): value is AppliedRewardLedgerEntryV1 => {
  if (!isRewardLedgerBase(value) || !isJsonRecord(value) || value.status !== 'APPLIED') {
    return false;
  }

  return isRewardIntent(value.intent)
    && hasIntentLedgerIdentity(value, value.intent)
    && isString(value.appliedAt);
};

const isPendingRewardLedgerEntry = (value: unknown): value is PendingRewardLedgerEntryV1 => {
  if (!isRewardLedgerBase(value) || !isJsonRecord(value) || value.status !== 'PENDING') {
    return false;
  }

  return hasPendingRewardSnapshotWithStatus(value.pendingRewardSnapshot, 'PENDING')
    && hasPendingRewardLedgerIdentity(value, value.pendingRewardSnapshot)
    && isString(value.createdAt);
};

const isAppliedPendingRewardLedgerEntry = (value: unknown): value is AppliedPendingRewardLedgerEntryV1 => {
  if (!isRewardLedgerBase(value) || !isJsonRecord(value) || value.status !== 'APPLIED') {
    return false;
  }

  return hasPendingRewardSnapshotWithStatus(value.pendingRewardSnapshot, 'APPLIED')
    && hasPendingRewardLedgerIdentity(value, value.pendingRewardSnapshot)
    && isString(value.appliedAt);
};

const isExpiredPendingRewardLedgerEntry = (value: unknown): value is ExpiredPendingRewardLedgerEntryV1 => {
  if (!isRewardLedgerBase(value) || !isJsonRecord(value) || value.status !== 'EXPIRED') {
    return false;
  }

  return hasPendingRewardSnapshotWithStatus(value.pendingRewardSnapshot, 'EXPIRED')
    && hasPendingRewardLedgerIdentity(value, value.pendingRewardSnapshot)
    && isString(value.expiredAt);
};

export const isRewardLedgerEntry = (value: unknown): value is RewardLedgerEntry => (
  isAppliedIntentLedgerEntry(value)
  || isPendingRewardLedgerEntry(value)
  || isAppliedPendingRewardLedgerEntry(value)
  || isExpiredPendingRewardLedgerEntry(value)
);

const createPendingRewardLedgerBase = (
  snapshot: PendingRewardSnapshot,
): RewardLedgerEntryBaseV1 => ({
  schemaVersion: REWARD_LEDGER_SCHEMA_VERSION,
  ledgerKey: snapshot.intentId,
  status: snapshot.status,
  sourceType: snapshot.sourceType,
  sourceId: snapshot.sourceId,
  playerId: snapshot.playerId,
});

export const createAppliedRewardLedgerEntry = (
  intent: RewardIntent,
  appliedAt: string,
): AppliedRewardLedgerEntryV1 => ({
  schemaVersion: REWARD_LEDGER_SCHEMA_VERSION,
  ledgerKey: intent.intentId,
  status: 'APPLIED',
  sourceType: intent.sourceType,
  sourceId: intent.sourceId,
  playerId: intent.playerId,
  intent,
  appliedAt,
});

export const createPendingRewardLedgerEntry = (
  snapshot: PendingRewardOpenSnapshotV1,
): PendingRewardLedgerEntryV1 => ({
  ...createPendingRewardLedgerBase(snapshot),
  status: 'PENDING',
  pendingRewardSnapshot: snapshot,
  createdAt: snapshot.createdAt,
});

export const createAppliedPendingRewardLedgerEntry = (
  snapshot: PendingRewardAppliedSnapshotV1,
  appliedAt: string,
): AppliedPendingRewardLedgerEntryV1 => ({
  ...createPendingRewardLedgerBase(snapshot),
  status: 'APPLIED',
  pendingRewardSnapshot: snapshot,
  appliedAt,
});
