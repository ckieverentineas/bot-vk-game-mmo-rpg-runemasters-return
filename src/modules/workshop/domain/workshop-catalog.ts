import type { InventoryDelta, InventoryView, MaterialField, StatBlock } from '../../../shared/types/game';

export type WorkshopItemClass = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'L' | 'UL';
export type WorkshopBlueprintRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC';
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

export const workshopBlueprintCodes = [
  'hunter_cleaver',
  'tracker_jacket',
  'skinning_kit',
  'resonance_tool',
] as const satisfies readonly WorkshopBlueprintCode[];

export const workshopItemCodes = [
  'hunter_cleaver',
  'tracker_jacket',
  'skinning_kit',
] as const satisfies readonly WorkshopItemCode[];

export const workshopBlueprintRarities = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
] as const satisfies readonly WorkshopBlueprintRarity[];

export const workshopItemClasses = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'L',
  'UL',
] as const satisfies readonly WorkshopItemClass[];

export const workshopItemSlots = [
  'weapon',
  'armor',
  'trinket',
  'tool',
] as const satisfies readonly WorkshopItemSlot[];

export const workshopItemStatuses = [
  'ACTIVE',
  'BROKEN',
  'DESTROYED',
] as const satisfies readonly WorkshopItemStatus[];

interface BaseWorkshopBlueprintDefinition {
  readonly code: WorkshopBlueprintCode;
  readonly itemClass: WorkshopItemClass;
  readonly rarity: WorkshopBlueprintRarity;
  readonly cost: WorkshopBlueprintCost;
}

export interface WorkshopCraftItemBlueprintDefinition extends BaseWorkshopBlueprintDefinition {
  readonly kind: 'craft_item';
  readonly resultItemCode: WorkshopItemCode;
  readonly slot: WorkshopItemSlot;
  readonly maxDurability: number;
  readonly dustCost: number;
}

export interface WorkshopRepairToolBlueprintDefinition extends BaseWorkshopBlueprintDefinition {
  readonly kind: 'repair_tool';
}

export type WorkshopBlueprintDefinition =
  | WorkshopCraftItemBlueprintDefinition
  | WorkshopRepairToolBlueprintDefinition;

export interface WorkshopItemDefinition {
  readonly code: WorkshopItemCode;
  readonly itemClass: WorkshopItemClass;
  readonly slot: WorkshopItemSlot;
  readonly maxDurability: number;
  readonly statBonus: StatBlock;
}

export interface WorkshopItemView {
  readonly code: WorkshopItemCode;
  readonly itemClass: WorkshopItemClass;
  readonly slot: WorkshopItemSlot;
  readonly status: WorkshopItemStatus;
  readonly durability: number;
  readonly maxDurability: number;
  readonly statBonus?: StatBlock;
}

export interface WorkshopEquippedItemView extends WorkshopItemView {
  readonly id: string;
  readonly equipped: boolean;
}

const emptyStatBonus = (): StatBlock => ({
  health: 0,
  attack: 0,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
});

const addStatBlocks = (left: StatBlock, right: StatBlock): StatBlock => ({
  health: left.health + right.health,
  attack: left.attack + right.attack,
  defence: left.defence + right.defence,
  magicDefence: left.magicDefence + right.magicDefence,
  dexterity: left.dexterity + right.dexterity,
  intelligence: left.intelligence + right.intelligence,
});

const workshopItemDefinitions = [
  {
    code: 'hunter_cleaver',
    itemClass: 'L',
    slot: 'weapon',
    maxDurability: 14,
    statBonus: {
      ...emptyStatBonus(),
      attack: 2,
    },
  },
  {
    code: 'tracker_jacket',
    itemClass: 'L',
    slot: 'armor',
    maxDurability: 18,
    statBonus: {
      ...emptyStatBonus(),
      health: 3,
      defence: 1,
    },
  },
  {
    code: 'skinning_kit',
    itemClass: 'UL',
    slot: 'tool',
    maxDurability: 12,
    statBonus: {
      ...emptyStatBonus(),
      dexterity: 1,
    },
  },
] satisfies readonly WorkshopItemDefinition[];

const workshopBlueprints = [
  {
    code: 'hunter_cleaver',
    kind: 'craft_item',
    resultItemCode: 'hunter_cleaver',
    slot: 'weapon',
    itemClass: 'L',
    rarity: 'RARE',
    maxDurability: 14,
    dustCost: 8,
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
    itemClass: 'L',
    rarity: 'UNCOMMON',
    maxDurability: 18,
    dustCost: 6,
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
    itemClass: 'UL',
    rarity: 'COMMON',
    maxDurability: 12,
    dustCost: 4,
    cost: {
      leather: 2,
      bone: 2,
    },
  },
  {
    code: 'resonance_tool',
    kind: 'repair_tool',
    itemClass: 'UL',
    rarity: 'EPIC',
    cost: {
      crystal: 2,
      essence: 2,
    },
  },
] satisfies readonly WorkshopBlueprintDefinition[];

const blueprintByCode = new Map<string, WorkshopBlueprintDefinition>(
  workshopBlueprints.map((blueprint) => [blueprint.code, blueprint]),
);

const itemByCode = new Map<string, WorkshopItemDefinition>(
  workshopItemDefinitions.map((item) => [item.code, item]),
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

const includesWorkshopValue = <T extends string>(
  values: readonly T[],
  value: string,
): value is T => values.includes(value as T);

export const isWorkshopBlueprintCode = (value: string): value is WorkshopBlueprintCode => (
  includesWorkshopValue(workshopBlueprintCodes, value)
);

export const isWorkshopBlueprintRarity = (value: string): value is WorkshopBlueprintRarity => (
  includesWorkshopValue(workshopBlueprintRarities, value)
);

export const isWorkshopItemCode = (value: string): value is WorkshopItemCode => (
  includesWorkshopValue(workshopItemCodes, value)
);

export const isWorkshopItemClass = (value: string): value is WorkshopItemClass => (
  includesWorkshopValue(workshopItemClasses, value)
);

export const isWorkshopItemSlot = (value: string): value is WorkshopItemSlot => (
  includesWorkshopValue(workshopItemSlots, value)
);

export const isWorkshopItemStatus = (value: string): value is WorkshopItemStatus => (
  includesWorkshopValue(workshopItemStatuses, value)
);

export const listWorkshopBlueprints = (): readonly WorkshopBlueprintDefinition[] => workshopBlueprints;

export const listWorkshopItemDefinitions = (): readonly WorkshopItemDefinition[] => workshopItemDefinitions;

export const getWorkshopBlueprint = (code: string): WorkshopBlueprintDefinition => {
  const blueprint = blueprintByCode.get(code);

  if (!blueprint) {
    throw new Error(`Unknown workshop blueprint: ${code}`);
  }

  return blueprint;
};

export const getWorkshopItemDefinition = (code: string): WorkshopItemDefinition => {
  const item = itemByCode.get(code);

  if (!item) {
    throw new Error(`Unknown workshop item: ${code}`);
  }

  return item;
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

export const resolveWorkshopCraftDustCost = (
  blueprint: WorkshopBlueprintDefinition,
): number => (
  blueprint.kind === 'craft_item' ? blueprint.dustCost : 0
);

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

  if (item.durability >= item.maxDurability) {
    return false;
  }

  if (item.status === 'BROKEN') {
    return item.durability === 0;
  }

  return item.status === 'ACTIVE' && item.durability > 0;
};

export const canEquipWorkshopItem = (item: WorkshopItemView): boolean => (
  item.status === 'ACTIVE' && item.durability > 0
);

export const resolveWorkshopItemStatBonus = (item: WorkshopItemView): StatBlock => (
  canEquipWorkshopItem(item) ? item.statBonus ?? getWorkshopItemDefinition(item.code).statBonus : emptyStatBonus()
);

export const resolveWorkshopEquipmentStatBonus = (
  items: readonly WorkshopEquippedItemView[],
): StatBlock => (
  items
    .filter((item) => item.equipped)
    .reduce((bonus, item) => addStatBlocks(bonus, resolveWorkshopItemStatBonus(item)), emptyStatBonus())
);

export const resolveWorkshopItemDecay = <TItem extends WorkshopEquippedItemView>(item: TItem): TItem => {
  if (!canEquipWorkshopItem(item)) {
    return {
      ...item,
      equipped: false,
    };
  }

  const durability = Math.max(0, item.durability - 1);

  if (durability > 0) {
    return {
      ...item,
      status: 'ACTIVE',
      durability,
    };
  }

  return {
    ...item,
    status: item.itemClass === 'UL' ? 'BROKEN' : 'DESTROYED',
    equipped: false,
    durability: 0,
  };
};
