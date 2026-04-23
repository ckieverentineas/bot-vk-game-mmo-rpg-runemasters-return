import { createHash } from 'node:crypto';

import type { InventoryView, MaterialField, PlayerState } from '../../../shared/types/game';
import type { PlayerBlueprintView, PlayerCraftedItemView } from './workshop-persistence';
import type { WorkshopBlueprintCode } from '../domain/workshop-catalog';

type BlueprintQuantityView = Pick<PlayerBlueprintView, 'blueprintCode' | 'quantity'>;

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

interface WorkshopStateKeySnapshot {
  readonly playerId: number;
  readonly playerUpdatedAt: string;
  readonly blueprintCode: WorkshopBlueprintCode;
  readonly ownedQuantity: number;
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

const getBlueprintQuantity = (
  blueprints: readonly BlueprintQuantityView[],
  blueprintCode: WorkshopBlueprintCode,
): number => (
  blueprints.find((blueprint) => blueprint.blueprintCode === blueprintCode)?.quantity ?? 0
);

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
  blueprints: readonly BlueprintQuantityView[],
  items: readonly CraftedItemStateView[],
  blueprintCode: WorkshopBlueprintCode,
): WorkshopStateKeySnapshot => ({
  playerId: player.playerId,
  playerUpdatedAt: player.updatedAt,
  blueprintCode,
  ownedQuantity: getBlueprintQuantity(blueprints, blueprintCode),
  materials: summarizeMaterials(player.inventory),
  items: summarizeItems(items),
});

export const buildCraftWorkshopItemIntentStateKey = (
  player: Pick<PlayerState, 'playerId' | 'updatedAt' | 'inventory'>,
  blueprintCode: WorkshopBlueprintCode,
  blueprints: readonly BlueprintQuantityView[],
  items: readonly CraftedItemStateView[],
): string => serializeStateKey({
  action: 'craft_workshop_item',
  ...summarizeWorkshopState(player, blueprints, items, blueprintCode),
});

export const buildRepairWorkshopItemIntentStateKey = (
  player: Pick<PlayerState, 'playerId' | 'updatedAt' | 'inventory'>,
  itemId: string,
  repairBlueprintCode: WorkshopBlueprintCode,
  blueprints: readonly BlueprintQuantityView[],
  items: readonly CraftedItemStateView[],
): string => serializeStateKey({
  action: 'repair_workshop_item',
  itemId,
  ...summarizeWorkshopState(player, blueprints, items, repairBlueprintCode),
});
