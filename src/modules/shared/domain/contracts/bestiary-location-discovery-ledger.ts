import type { ResourceReward } from '../../../../shared/types/game';

import { isResourceRewardSnapshot } from './resource-reward-contract';
import { hasSchemaVersion } from './versioned-contract';

export const BESTIARY_LOCATION_DISCOVERY_LEDGER_SCHEMA_VERSION = 1 as const;
export const BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE = 'BESTIARY_LOCATION_DISCOVERY' as const;

export interface BestiaryLocationDiscoveryLedgerEntryV1 {
  readonly schemaVersion: typeof BESTIARY_LOCATION_DISCOVERY_LEDGER_SCHEMA_VERSION;
  readonly kind: typeof BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE;
  readonly status: 'APPLIED';
  readonly playerId: number;
  readonly ledgerKey: string;
  readonly sourceType: typeof BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE;
  readonly sourceId: string;
  readonly biomeCode: string;
  readonly reward: ResourceReward;
  readonly appliedAt: string;
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const buildBestiaryLocationDiscoveryLedgerKey = (playerId: number, biomeCode: string): string => (
  `bestiary_location:${playerId}:${biomeCode}`
);

export const createBestiaryLocationDiscoveryLedgerEntry = (
  playerId: number,
  biomeCode: string,
  reward: ResourceReward,
  appliedAt: string,
): BestiaryLocationDiscoveryLedgerEntryV1 => ({
  schemaVersion: BESTIARY_LOCATION_DISCOVERY_LEDGER_SCHEMA_VERSION,
  kind: BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE,
  status: 'APPLIED',
  playerId,
  ledgerKey: buildBestiaryLocationDiscoveryLedgerKey(playerId, biomeCode),
  sourceType: BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE,
  sourceId: biomeCode,
  biomeCode,
  reward,
  appliedAt,
});

export const isBestiaryLocationDiscoveryLedgerEntry = (
  value: unknown,
): value is BestiaryLocationDiscoveryLedgerEntryV1 => {
  if (
    !hasSchemaVersion(value, BESTIARY_LOCATION_DISCOVERY_LEDGER_SCHEMA_VERSION)
    || value.kind !== BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE
    || value.status !== 'APPLIED'
    || !isNumber(value.playerId)
    || !isString(value.ledgerKey)
    || value.sourceType !== BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE
    || !isString(value.sourceId)
    || !isString(value.biomeCode)
    || !isResourceRewardSnapshot(value.reward)
    || !isString(value.appliedAt)
  ) {
    return false;
  }

  return value.sourceId === value.biomeCode
    && value.ledgerKey === buildBestiaryLocationDiscoveryLedgerKey(value.playerId, value.biomeCode);
};
