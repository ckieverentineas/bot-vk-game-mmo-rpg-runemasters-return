import type { InventoryDelta, InventoryView, MaterialField } from '../../../shared/types/game';

export type WorkshopItemClass = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'L' | 'UL';
export type WorkshopItemSlot = 'weapon' | 'armor' | 'trinket' | 'tool';
export type WorkshopItemStatus = 'ACTIVE' | 'BROKEN' | 'DESTROYED';
export type WorkshopBlueprintKind = 'craft_item' | 'repair_tool';

export type WorkshopBlueprintCode =
  | 'hunter_cleaver'
  | 'tracker_jacket'
  | 'skinning_kit'
  | 'resonance_tool';

export type WorkshopItemCode =
  | 'hunter_cleaver'
  | 'tracker_jacket'
  | 'skinning_kit';

export type WorkshopBlueprintCost = Partial<Record<MaterialField, number>>;

interface BaseWorkshopBlueprintDefinition {
  readonly code: WorkshopBlueprintCode;
  readonly itemClass: WorkshopItemClass;
  readonly cost: WorkshopBlueprintCost;
}

export interface WorkshopCraftItemBlueprintDefinition extends BaseWorkshopBlueprintDefinition {
  readonly kind: 'craft_item';
  readonly resultItemCode: WorkshopItemCode;
  readonly slot: WorkshopItemSlot;
  readonly maxDurability: number;
}

export interface WorkshopRepairToolBlueprintDefinition extends BaseWorkshopBlueprintDefinition {
  readonly kind: 'repair_tool';
}

export type WorkshopBlueprintDefinition =
  | WorkshopCraftItemBlueprintDefinition
  | WorkshopRepairToolBlueprintDefinition;

export interface WorkshopItemView {
  readonly code: WorkshopItemCode;
  readonly itemClass: WorkshopItemClass;
  readonly slot: WorkshopItemSlot;
  readonly status: WorkshopItemStatus;
  readonly durability: number;
  readonly maxDurability: number;
}

const workshopBlueprints = [
  {
    code: 'hunter_cleaver',
    kind: 'craft_item',
    resultItemCode: 'hunter_cleaver',
    slot: 'weapon',
    itemClass: 'RARE',
    maxDurability: 14,
    cost: {
      leather: 4,
      bone: 2,
      metal: 1,
    },
  },
  {
    code: 'tracker_jacket',
    kind: 'craft_item',
    resultItemCode: 'tracker_jacket',
    slot: 'armor',
    itemClass: 'UNCOMMON',
    maxDurability: 18,
    cost: {
      leather: 5,
      herb: 1,
    },
  },
  {
    code: 'skinning_kit',
    kind: 'craft_item',
    resultItemCode: 'skinning_kit',
    slot: 'tool',
    itemClass: 'COMMON',
    maxDurability: 12,
    cost: {
      leather: 2,
      bone: 2,
    },
  },
  {
    code: 'resonance_tool',
    kind: 'repair_tool',
    itemClass: 'UL',
    cost: {
      crystal: 2,
      essence: 2,
    },
  },
] satisfies readonly WorkshopBlueprintDefinition[];

const blueprintByCode = new Map<string, WorkshopBlueprintDefinition>(
  workshopBlueprints.map((blueprint) => [blueprint.code, blueprint]),
);

const materialFields: readonly MaterialField[] = [
  'leather',
  'bone',
  'herb',
  'essence',
  'metal',
  'crystal',
];

const getCostAmount = (
  cost: WorkshopBlueprintCost,
  field: MaterialField,
): number => cost[field] ?? 0;

export const listWorkshopBlueprints = (): readonly WorkshopBlueprintDefinition[] => workshopBlueprints;

export const getWorkshopBlueprint = (code: string): WorkshopBlueprintDefinition => {
  const blueprint = blueprintByCode.get(code);

  if (!blueprint) {
    throw new Error(`Unknown workshop blueprint: ${code}`);
  }

  return blueprint;
};

export const canCraftWorkshopBlueprint = (
  inventory: InventoryView,
  blueprint: WorkshopBlueprintDefinition,
): boolean => (
  materialFields.every((field) => inventory[field] >= getCostAmount(blueprint.cost, field))
);

export const resolveWorkshopCraftInventoryDelta = (
  blueprint: WorkshopBlueprintDefinition,
): InventoryDelta => {
  if (blueprint.kind !== 'craft_item') {
    return {};
  }

  return materialFields.reduce<InventoryDelta>((delta, field) => {
    const amount = getCostAmount(blueprint.cost, field);

    if (amount <= 0) {
      return delta;
    }

    return {
      ...delta,
      [field]: -amount,
    };
  }, {});
};

export const resolveWorkshopMissingCost = (
  inventory: InventoryView,
  blueprint: WorkshopBlueprintDefinition,
): WorkshopBlueprintCost => (
  materialFields.reduce<WorkshopBlueprintCost>((missing, field) => {
    const required = getCostAmount(blueprint.cost, field);
    const available = inventory[field];
    const shortage = required - available;

    if (shortage <= 0) {
      return missing;
    }

    return {
      ...missing,
      [field]: shortage,
    };
  }, {})
);

export const canRepairWorkshopItem = (
  item: WorkshopItemView,
  repairBlueprint: WorkshopBlueprintDefinition,
): boolean => {
  if (repairBlueprint.kind !== 'repair_tool') {
    return false;
  }

  if (item.itemClass !== 'UL') {
    return false;
  }

  if (item.status !== 'ACTIVE') {
    return false;
  }

  return item.durability > 0 && item.durability < item.maxDurability;
};
