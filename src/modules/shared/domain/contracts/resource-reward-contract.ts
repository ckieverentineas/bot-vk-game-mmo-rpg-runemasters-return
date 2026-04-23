import type { InventoryDelta, InventoryField, ResourceReward } from '../../../../shared/types/game';

import { isJsonRecord } from './versioned-contract';

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

export const isInventoryDeltaSnapshot = (value: unknown): value is InventoryDelta => (
  isJsonRecord(value)
  && Object.entries(value).every(([field, amount]) => isInventoryField(field) && isNumber(amount))
);

export const isResourceRewardSnapshot = (value: unknown): value is ResourceReward => (
  isJsonRecord(value)
  && (value.gold === undefined || isNumber(value.gold))
  && (value.inventoryDelta === undefined || isInventoryDeltaSnapshot(value.inventoryDelta))
);
