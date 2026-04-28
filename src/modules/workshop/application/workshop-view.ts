import type { PlayerState } from '../../../shared/types/game';
import type { PlayerBlueprintInstanceView, PlayerCraftedItemView } from './workshop-persistence';
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
  readonly instance: PlayerBlueprintInstanceView;
  readonly blueprint: WorkshopBlueprintDefinition;
  readonly ownedQuantity: number;
  readonly canCraft: boolean;
  readonly missingCost: WorkshopBlueprintCost;
}

export interface WorkshopRepairToolEntryView {
  readonly instance: PlayerBlueprintInstanceView;
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
  instance: PlayerBlueprintInstanceView,
  blueprint: WorkshopBlueprintDefinition,
): WorkshopBlueprintEntryView => {
  const missingCost = resolveWorkshopMissingCost(player.inventory, blueprint);

  return {
    instance,
    blueprint,
    ownedQuantity: 1,
    canCraft: blueprint.kind === 'craft_item'
      && canCraftWorkshopBlueprint(player.inventory, blueprint),
    missingCost,
  };
};

const buildRepairToolEntry = (
  player: PlayerState,
  instance: PlayerBlueprintInstanceView,
  blueprint: WorkshopRepairToolBlueprintDefinition,
): WorkshopRepairToolEntryView => {
  const missingCost = resolveWorkshopMissingCost(player.inventory, blueprint);

  return {
    instance,
    blueprint,
    ownedQuantity: 1,
    available: hasNoMissingCost(missingCost),
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
  blueprintInstances: readonly PlayerBlueprintInstanceView[],
  craftedItems: readonly PlayerCraftedItemView[],
): WorkshopView => {
  const catalogBlueprintsByCode = new Map(
    listWorkshopBlueprints().map((blueprint) => [blueprint.code, blueprint]),
  );
  const availableBlueprints = blueprintInstances
    .filter((instance) => instance.status === 'AVAILABLE')
    .map((instance) => ({
      instance,
      blueprint: catalogBlueprintsByCode.get(instance.blueprintCode),
    }))
    .filter((entry): entry is {
      readonly instance: PlayerBlueprintInstanceView;
      readonly blueprint: WorkshopBlueprintDefinition;
    } => entry.blueprint !== undefined);
  const repairTools = availableBlueprints
    .filter((entry): entry is {
      readonly instance: PlayerBlueprintInstanceView;
      readonly blueprint: WorkshopRepairToolBlueprintDefinition;
    } => isRepairToolBlueprint(entry.blueprint))
    .map(({ instance, blueprint }) => buildRepairToolEntry(player, instance, blueprint));

  return {
    player,
    blueprints: availableBlueprints.map(({ instance, blueprint }) => buildBlueprintEntry(player, instance, blueprint)),
    repairTools,
    craftedItems: craftedItems.map((item) => buildCraftedItemEntry(item, repairTools)),
  };
};
