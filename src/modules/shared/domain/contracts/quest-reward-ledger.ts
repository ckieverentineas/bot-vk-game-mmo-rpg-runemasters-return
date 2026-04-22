import type { InventoryDelta, InventoryField, ResourceReward } from '../../../../shared/types/game';

import { hasSchemaVersion, isJsonRecord } from './versioned-contract';

export const QUEST_REWARD_LEDGER_SCHEMA_VERSION = 1 as const;
export const QUEST_REWARD_SOURCE_TYPE = 'QUEST_REWARD' as const;

export interface QuestRewardLedgerEntryV1 {
  readonly schemaVersion: typeof QUEST_REWARD_LEDGER_SCHEMA_VERSION;
  readonly kind: typeof QUEST_REWARD_SOURCE_TYPE;
  readonly status: 'APPLIED';
  readonly playerId: number;
  readonly ledgerKey: string;
  readonly sourceType: typeof QUEST_REWARD_SOURCE_TYPE;
  readonly sourceId: string;
  readonly questCode: string;
  readonly reward: ResourceReward;
  readonly appliedAt: string;
}

const inventoryFields: readonly InventoryField[] = [
  'usualShards',
  'unusualShards',
  'rareShards',
  'epicShards',
  'legendaryShards',
  'mythicalShards',
  'leather',
  'bone',
  'herb',
  'essence',
  'metal',
  'crystal',
];

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isInventoryField = (value: unknown): value is InventoryField => (
  isString(value) && inventoryFields.includes(value as InventoryField)
);

const isInventoryDelta = (value: unknown): value is InventoryDelta => (
  isJsonRecord(value)
  && Object.entries(value).every(([field, amount]) => isInventoryField(field) && isNumber(amount))
);

const isResourceReward = (value: unknown): value is ResourceReward => (
  isJsonRecord(value)
  && (value.gold === undefined || isNumber(value.gold))
  && (value.inventoryDelta === undefined || isInventoryDelta(value.inventoryDelta))
);

export const buildQuestRewardLedgerKey = (playerId: number, questCode: string): string => (
  `quest_reward:${playerId}:${questCode}`
);

export const createQuestRewardLedgerEntry = (
  playerId: number,
  questCode: string,
  reward: ResourceReward,
  appliedAt: string,
): QuestRewardLedgerEntryV1 => ({
  schemaVersion: QUEST_REWARD_LEDGER_SCHEMA_VERSION,
  kind: QUEST_REWARD_SOURCE_TYPE,
  status: 'APPLIED',
  playerId,
  ledgerKey: buildQuestRewardLedgerKey(playerId, questCode),
  sourceType: QUEST_REWARD_SOURCE_TYPE,
  sourceId: questCode,
  questCode,
  reward,
  appliedAt,
});

export const isQuestRewardLedgerEntry = (value: unknown): value is QuestRewardLedgerEntryV1 => {
  if (
    !hasSchemaVersion(value, QUEST_REWARD_LEDGER_SCHEMA_VERSION)
    || value.kind !== QUEST_REWARD_SOURCE_TYPE
    || value.status !== 'APPLIED'
    || !isNumber(value.playerId)
    || !isString(value.ledgerKey)
    || value.sourceType !== QUEST_REWARD_SOURCE_TYPE
    || !isString(value.sourceId)
    || !isString(value.questCode)
    || !isResourceReward(value.reward)
    || !isString(value.appliedAt)
  ) {
    return false;
  }

  return value.sourceId === value.questCode
    && value.ledgerKey === buildQuestRewardLedgerKey(value.playerId, value.questCode);
};
