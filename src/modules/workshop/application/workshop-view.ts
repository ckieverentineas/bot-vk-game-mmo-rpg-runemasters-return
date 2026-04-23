import type { PlayerState } from '../../../shared/types/game';
import type { PlayerBlueprintView, PlayerCraftedItemView } from './workshop-persistence';
import {
  canCraftWorkshopBlueprint,
  canRepairWorkshopItem,
  canEquipWorkshopItem,
  listWorkshopBlueprints,
  resolveWorkshopMissingCost,
  type WorkshopBlueprintCost,
  type WorkshopBlueprintDefinition,
  type WorkshopRepairToolBlueprintDefinition,
  type WorkshopItemView,
} from '../domain/workshop-catalog';

export interface WorkshopBlueprintEntryView {
  readonly blueprint: WorkshopBlueprintDefinition;
  readonly ownedQuantity: number;
  readonly canCraft: boolean;
  readonly missingCost: WorkshopBlueprintCost;
}

export interface WorkshopRepairToolEntryView {
  readonly blueprint: WorkshopRepairToolBlueprintDefinition;
  readonly ownedQuantity: number;
  readonly available: boolean;
  readonly missingCost: WorkshopBlueprintCost;
}

export interface WorkshopCraftedItemEntryView {
  readonly item: PlayerCraftedItemView;
  readonly equippable: boolean;
  readonly repairable: boolean;
  readonly availableRepairTools: readonly WorkshopRepairToolEntryView[];
}

export interface WorkshopView {
  readonly player: PlayerState;
  readonly blueprints: readonly WorkshopBlueprintEntryView[];
  readonly repairTools: readonly WorkshopRepairToolEntryView[];
  readonly craftedItems: readonly WorkshopCraftedItemEntryView[];
}

const getBlueprintQuantity = (
  blueprints: readonly PlayerBlueprintView[],
  blueprintCode: string,
): number => (
  blueprints.find((blueprint) => blueprint.blueprintCode === blueprintCode)?.quantity ?? 0
);

const hasNoMissingCost = (missingCost: WorkshopBlueprintCost): boolean => Object.keys(missingCost).length === 0;

const isRepairToolBlueprint = (
  blueprint: WorkshopBlueprintDefinition,
): blueprint is WorkshopRepairToolBlueprintDefinition => blueprint.kind === 'repair_tool';

const toWorkshopItemView = (item: PlayerCraftedItemView): WorkshopItemView => ({
  code: item.itemCode,
  itemClass: item.itemClass,
  slot: item.slot,
  status: item.status,
  durability: item.durability,
  maxDurability: item.maxDurability,
});

export const canRepairPlayerCraftedItem = (
  item: PlayerCraftedItemView,
  repairBlueprint: WorkshopRepairToolBlueprintDefinition,
): boolean => canRepairWorkshopItem(toWorkshopItemView(item), repairBlueprint);

const buildBlueprintEntry = (
  player: PlayerState,
  blueprints: readonly PlayerBlueprintView[],
  blueprint: WorkshopBlueprintDefinition,
): WorkshopBlueprintEntryView => {
  const ownedQuantity = getBlueprintQuantity(blueprints, blueprint.code);
  const missingCost = resolveWorkshopMissingCost(player.inventory, blueprint);

  return {
    blueprint,
    ownedQuantity,
    canCraft: blueprint.kind === 'craft_item'
      && ownedQuantity > 0
      && canCraftWorkshopBlueprint(player.inventory, blueprint),
    missingCost,
  };
};

const buildRepairToolEntry = (
  player: PlayerState,
  blueprints: readonly PlayerBlueprintView[],
  blueprint: WorkshopRepairToolBlueprintDefinition,
): WorkshopRepairToolEntryView => {
  const ownedQuantity = getBlueprintQuantity(blueprints, blueprint.code);
  const missingCost = resolveWorkshopMissingCost(player.inventory, blueprint);

  return {
    blueprint,
    ownedQuantity,
    available: ownedQuantity > 0 && hasNoMissingCost(missingCost),
    missingCost,
  };
};

const buildCraftedItemEntry = (
  item: PlayerCraftedItemView,
  repairTools: readonly WorkshopRepairToolEntryView[],
): WorkshopCraftedItemEntryView => {
  const availableRepairTools = repairTools.filter((repairTool) => (
    repairTool.available && canRepairPlayerCraftedItem(item, repairTool.blueprint)
  ));

  return {
    item,
    equippable: canEquipWorkshopItem(toWorkshopItemView(item)),
    repairable: repairTools.some((repairTool) => canRepairPlayerCraftedItem(item, repairTool.blueprint)),
    availableRepairTools,
  };
};

export const buildWorkshopView = (
  player: PlayerState,
  blueprints: readonly PlayerBlueprintView[],
  craftedItems: readonly PlayerCraftedItemView[],
): WorkshopView => {
  const catalogBlueprints = listWorkshopBlueprints();
  const repairTools = catalogBlueprints
    .filter(isRepairToolBlueprint)
    .map((blueprint) => buildRepairToolEntry(player, blueprints, blueprint));

  return {
    player,
    blueprints: catalogBlueprints.map((blueprint) => buildBlueprintEntry(player, blueprints, blueprint)),
    repairTools,
    craftedItems: craftedItems.map((item) => buildCraftedItemEntry(item, repairTools)),
  };
};
