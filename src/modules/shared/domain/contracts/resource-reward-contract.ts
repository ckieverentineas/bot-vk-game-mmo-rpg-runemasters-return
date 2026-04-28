import type {
  BlueprintDelta,
  BlueprintDrop,
  InventoryDelta,
  InventoryField,
  ResourceReward,
} from '../../../../shared/types/game';
import {
  isWorkshopBlueprintCode,
  isWorkshopBlueprintRarity,
} from '../../../workshop/domain/workshop-catalog';
import {
  isWorkshopBlueprintDiscoveryKind,
  isWorkshopBlueprintQuality,
  isWorkshopBlueprintSourceType,
} from '../../../workshop/domain/workshop-blueprint-instances';

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
  'healingPills',
  'focusPills',
  'guardPills',
  'clarityPills',
];

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isNullableString = (value: unknown): value is string | null | undefined => (
  value === undefined || value === null || isString(value)
);

const isInventoryField = (value: unknown): value is InventoryField => (
  isString(value) && inventoryFields.includes(value as InventoryField)
);

export const isInventoryDeltaSnapshot = (value: unknown): value is InventoryDelta => (
  isJsonRecord(value)
  && Object.entries(value).every(([field, amount]) => isInventoryField(field) && isNumber(amount))
);

export const isBlueprintDeltaSnapshot = (value: unknown): value is BlueprintDelta => (
  isJsonRecord(value)
  && Object.entries(value).every(([blueprintCode, amount]) => (
    isWorkshopBlueprintCode(blueprintCode) && isNumber(amount)
  ))
);

const isBlueprintDropSnapshot = (value: unknown): value is BlueprintDrop => (
  isJsonRecord(value)
  && isString(value.blueprintCode)
  && isWorkshopBlueprintCode(value.blueprintCode)
  && (value.quantity === undefined || isNumber(value.quantity))
  && (value.rarity === undefined || (isString(value.rarity) && isWorkshopBlueprintRarity(value.rarity)))
  && (value.sourceType === undefined || (isString(value.sourceType) && isWorkshopBlueprintSourceType(value.sourceType)))
  && isNullableString(value.sourceId)
  && (
    value.discoveryKind === undefined
    || (isString(value.discoveryKind) && isWorkshopBlueprintDiscoveryKind(value.discoveryKind))
  )
  && (value.quality === undefined || (isString(value.quality) && isWorkshopBlueprintQuality(value.quality)))
  && (value.craftPotential === undefined || isString(value.craftPotential))
  && (value.modifierSnapshot === undefined || isJsonRecord(value.modifierSnapshot))
);

export const isBlueprintDropSnapshotArray = (value: unknown): value is readonly BlueprintDrop[] => (
  Array.isArray(value) && value.every(isBlueprintDropSnapshot)
);

export const isResourceRewardSnapshot = (value: unknown): value is ResourceReward => (
  isJsonRecord(value)
  && (value.gold === undefined || isNumber(value.gold))
  && (value.radiance === undefined || isNumber(value.radiance))
  && (value.inventoryDelta === undefined || isInventoryDeltaSnapshot(value.inventoryDelta))
  && (value.blueprintDelta === undefined || isBlueprintDeltaSnapshot(value.blueprintDelta))
  && (value.blueprintDrops === undefined || isBlueprintDropSnapshotArray(value.blueprintDrops))
);
