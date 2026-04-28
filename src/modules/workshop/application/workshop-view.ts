import type { PlayerState } from '../../../shared/types/game';
import type { PlayerBlueprintInstanceView, PlayerCraftedItemView } from './workshop-persistence';
import {
  canCraftWorkshopBlueprint,
  canRepairWorkshopItem,
  canEquipWorkshopItem,
  listWorkshopBlueprints,
  resolveWorkshopCraftDustCost,
  resolveWorkshopMissingCost,
  type WorkshopBlueprintCost,
  type WorkshopBlueprintDefinition,
  type WorkshopRepairToolBlueprintDefinition,
  type WorkshopItemView,
} from '../domain/workshop-catalog';
import {
  canAwakenWorkshopBlueprintFeature,
  workshopBlueprintFeatureAwakeningRadianceCost,
} from '../domain/workshop-blueprint-instances';
import {
  canBuyWorkshopShopOffer,
  listWorkshopShopOffers,
  resolveWorkshopShopOfferMissingDust,
  type WorkshopShopOfferDefinition,
} from '../domain/workshop-shop';

export interface WorkshopBlueprintEntryView {
  readonly instance: PlayerBlueprintInstanceView;
  readonly blueprint: WorkshopBlueprintDefinition;
  readonly ownedQuantity: number;
  readonly canCraft: boolean;
  readonly dustCost: number;
  readonly missingDust: number;
  readonly missingCost: WorkshopBlueprintCost;
  readonly canAwakenFeature: boolean;
  readonly featureAwakeningRadianceCost: number;
  readonly missingRadiance: number;
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

export interface WorkshopShopOfferEntryView {
  readonly offer: WorkshopShopOfferDefinition;
  readonly canBuy: boolean;
  readonly missingDust: number;
}

export interface WorkshopView {
  readonly player: PlayerState;
  readonly blueprints: readonly WorkshopBlueprintEntryView[];
  readonly repairTools: readonly WorkshopRepairToolEntryView[];
  readonly craftedItems: readonly WorkshopCraftedItemEntryView[];
  readonly shopOffers: readonly WorkshopShopOfferEntryView[];
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
  statBonus: item.statBonus,
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
  const dustCost = resolveWorkshopCraftDustCost(blueprint);
  const missingDust = Math.max(0, dustCost - player.gold);
  const featureAwakeningRadianceCost = blueprint.kind === 'craft_item' && canAwakenWorkshopBlueprintFeature(instance)
    ? workshopBlueprintFeatureAwakeningRadianceCost
    : 0;
  const missingRadiance = Math.max(0, featureAwakeningRadianceCost - player.radiance);

  return {
    instance,
    blueprint,
    ownedQuantity: 1,
    canCraft: blueprint.kind === 'craft_item'
      && canCraftWorkshopBlueprint(player.inventory, blueprint)
      && missingDust === 0,
    dustCost,
    missingDust,
    missingCost,
    canAwakenFeature: featureAwakeningRadianceCost > 0 && missingRadiance === 0,
    featureAwakeningRadianceCost,
    missingRadiance,
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

const buildShopOfferEntry = (
  player: PlayerState,
  offer: WorkshopShopOfferDefinition,
): WorkshopShopOfferEntryView => ({
  offer,
  canBuy: canBuyWorkshopShopOffer(player, offer),
  missingDust: resolveWorkshopShopOfferMissingDust(player, offer),
});

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
    shopOffers: listWorkshopShopOffers().map((offer) => buildShopOfferEntry(player, offer)),
  };
};
