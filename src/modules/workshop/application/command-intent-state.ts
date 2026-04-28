import { createHash } from 'node:crypto';

import type { InventoryView, MaterialField, PlayerState } from '../../../shared/types/game';
import type { PlayerBlueprintInstanceView, PlayerCraftedItemView } from './workshop-persistence';

type BlueprintInstanceStateView = Pick<
  PlayerBlueprintInstanceView,
  | 'id'
  | 'blueprintCode'
  | 'status'
  | 'updatedAt'
>;

type CraftedItemStateView = Pick<
  PlayerCraftedItemView,
  | 'id'
  | 'itemCode'
  | 'itemClass'
  | 'slot'
  | 'status'
  | 'equipped'
  | 'durability'
  | 'maxDurability'
  | 'updatedAt'
>;

interface WorkshopStateKeyItemSnapshot {
  readonly id: string;
  readonly itemCode: string;
  readonly itemClass: string;
  readonly slot: string;
  readonly status: string;
  readonly equipped: boolean;
  readonly durability: number;
  readonly maxDurability: number;
  readonly updatedAt: string;
}

interface WorkshopStateKeyBlueprintInstanceSnapshot {
  readonly id: string;
  readonly blueprintCode: string;
  readonly status: string;
  readonly updatedAt: string;
}

interface WorkshopStateKeySnapshot {
  readonly playerId: number;
  readonly playerUpdatedAt: string;
  readonly blueprintInstances: readonly WorkshopStateKeyBlueprintInstanceSnapshot[];
  readonly materials: Readonly<Record<MaterialField, number>>;
  readonly items: readonly WorkshopStateKeyItemSnapshot[];
}

const materialFields: readonly MaterialField[] = [
  'leather',
  'bone',
  'herb',
  'essence',
  'metal',
  'crystal',
];

const serializeStateKey = (value: unknown): string => createHash('sha1').update(JSON.stringify(value)).digest('hex');

const summarizeMaterials = (inventory: InventoryView): Readonly<Record<MaterialField, number>> => (
  materialFields.reduce<Record<MaterialField, number>>((summary, field) => ({
    ...summary,
    [field]: inventory[field],
  }), {
    leather: 0,
    bone: 0,
    herb: 0,
    essence: 0,
    metal: 0,
    crystal: 0,
  })
);

const summarizeBlueprintInstances = (
  blueprintInstances: readonly BlueprintInstanceStateView[],
): readonly WorkshopStateKeyBlueprintInstanceSnapshot[] => (
  [...blueprintInstances]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((instance) => ({
      id: instance.id,
      blueprintCode: instance.blueprintCode,
      status: instance.status,
      updatedAt: instance.updatedAt,
    }))
);

const summarizeItems = (items: readonly CraftedItemStateView[]): readonly WorkshopStateKeyItemSnapshot[] => (
  [...items]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((item) => ({
      id: item.id,
      itemCode: item.itemCode,
      itemClass: item.itemClass,
      slot: item.slot,
      status: item.status,
      equipped: item.equipped,
      durability: item.durability,
      maxDurability: item.maxDurability,
      updatedAt: item.updatedAt,
    }))
);

const summarizeWorkshopState = (
  player: Pick<PlayerState, 'playerId' | 'updatedAt' | 'inventory'>,
  blueprintInstances: readonly BlueprintInstanceStateView[],
  items: readonly CraftedItemStateView[],
): WorkshopStateKeySnapshot => ({
  playerId: player.playerId,
  playerUpdatedAt: player.updatedAt,
  blueprintInstances: summarizeBlueprintInstances(blueprintInstances),
  materials: summarizeMaterials(player.inventory),
  items: summarizeItems(items),
});

const summarizeWorkshopEquipmentState = (
  player: Pick<PlayerState, 'playerId' | 'updatedAt' | 'activeBattleId'>,
  items: readonly CraftedItemStateView[],
) => ({
  playerId: player.playerId,
  playerUpdatedAt: player.updatedAt,
  activeBattleId: player.activeBattleId,
  items: summarizeItems(items),
});

export const buildCraftWorkshopItemIntentStateKey = (
  player: Pick<PlayerState, 'playerId' | 'updatedAt' | 'inventory'>,
  blueprintInstanceId: string,
  blueprintInstances: readonly BlueprintInstanceStateView[],
  items: readonly CraftedItemStateView[],
): string => serializeStateKey({
  action: 'craft_workshop_item',
  blueprintInstanceId,
  ...summarizeWorkshopState(player, blueprintInstances, items),
});

export const buildRepairWorkshopItemIntentStateKey = (
  player: Pick<PlayerState, 'playerId' | 'updatedAt' | 'inventory'>,
  itemId: string,
  repairBlueprintInstanceId: string,
  blueprintInstances: readonly BlueprintInstanceStateView[],
  items: readonly CraftedItemStateView[],
): string => serializeStateKey({
  action: 'repair_workshop_item',
  itemId,
  repairBlueprintInstanceId,
  ...summarizeWorkshopState(player, blueprintInstances, items),
});

export const buildEquipWorkshopItemIntentStateKey = (
  player: Pick<PlayerState, 'playerId' | 'updatedAt' | 'activeBattleId'>,
  itemId: string,
  items: readonly CraftedItemStateView[],
): string => serializeStateKey({
  action: 'equip_workshop_item',
  itemId,
  ...summarizeWorkshopEquipmentState(player, items),
});

export const buildUnequipWorkshopItemIntentStateKey = (
  player: Pick<PlayerState, 'playerId' | 'updatedAt' | 'activeBattleId'>,
  itemId: string,
  items: readonly CraftedItemStateView[],
): string => serializeStateKey({
  action: 'unequip_workshop_item',
  itemId,
  ...summarizeWorkshopEquipmentState(player, items),
});
