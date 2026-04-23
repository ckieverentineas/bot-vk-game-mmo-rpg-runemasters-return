import { describe, expect, it } from 'vitest';

import type { InventoryView } from '../../../shared/types/game';
import type { WorkshopEquippedItemView, WorkshopItemView } from './workshop-catalog';
import {
  canCraftWorkshopBlueprint,
  canEquipWorkshopItem,
  canRepairWorkshopItem,
  getWorkshopBlueprint,
  isWorkshopBlueprintCode,
  isWorkshopItemClass,
  isWorkshopItemCode,
  isWorkshopItemSlot,
  isWorkshopItemStatus,
  listWorkshopBlueprints,
  resolveWorkshopEquipmentStatBonus,
  resolveWorkshopCraftInventoryDelta,
  resolveWorkshopItemDecay,
  resolveWorkshopMissingCost,
} from './workshop-catalog';

const createInventory = (overrides: Partial<InventoryView> = {}): InventoryView => ({
  usualShards: 0,
  unusualShards: 0,
  rareShards: 0,
  epicShards: 0,
  legendaryShards: 0,
  mythicalShards: 0,
  leather: 0,
  bone: 0,
  herb: 0,
  essence: 0,
  metal: 0,
  crystal: 0,
  ...overrides,
});

const createWorkshopItem = (overrides: Partial<WorkshopItemView> = {}): WorkshopItemView => ({
  code: 'skinning_kit',
  itemClass: 'UL',
  slot: 'tool',
  status: 'ACTIVE',
  durability: 7,
  maxDurability: 12,
  ...overrides,
});

const createEquippedWorkshopItem = (
  overrides: Partial<WorkshopEquippedItemView> = {},
): WorkshopEquippedItemView => ({
  id: 'item-1',
  code: 'skinning_kit',
  itemClass: 'UL',
  slot: 'tool',
  status: 'ACTIVE',
  equipped: true,
  durability: 7,
  maxDurability: 12,
  ...overrides,
});

describe('workshop catalog', () => {
  it('lists the starter workshop blueprints in a stable order', () => {
    expect(listWorkshopBlueprints().map((blueprint) => blueprint.code)).toEqual([
      'hunter_cleaver',
      'tracker_jacket',
      'skinning_kit',
      'resonance_tool',
    ]);
  });

  it('resolves a workshop blueprint by code and rejects unknown codes', () => {
    const blueprint = getWorkshopBlueprint('hunter_cleaver');

    expect(blueprint).toMatchObject({
      code: 'hunter_cleaver',
      kind: 'craft_item',
      resultItemCode: 'hunter_cleaver',
      slot: 'weapon',
      itemClass: 'L',
      rarity: 'RARE',
      maxDurability: 14,
      cost: {
        leather: 4,
        bone: 2,
        metal: 1,
      },
    });
    expect(() => getWorkshopBlueprint('unknown_blueprint')).toThrow(
      'Unknown workshop blueprint: unknown_blueprint',
    );
  });

  it('narrows persisted workshop string values at the domain boundary', () => {
    expect(isWorkshopBlueprintCode('resonance_tool')).toBe(true);
    expect(isWorkshopBlueprintCode('lost_scroll')).toBe(false);
    expect(isWorkshopItemCode('skinning_kit')).toBe(true);
    expect(isWorkshopItemCode('resonance_tool')).toBe(false);
    expect(isWorkshopItemClass('UL')).toBe(true);
    expect(isWorkshopItemSlot('trinket')).toBe(true);
    expect(isWorkshopItemStatus('DESTROYED')).toBe(true);
  });

  it('checks whether the inventory can cover a blueprint cost and reports the shortage', () => {
    const blueprint = getWorkshopBlueprint('tracker_jacket');
    const inventory = createInventory({
      leather: 3,
    });

    expect(canCraftWorkshopBlueprint(inventory, blueprint)).toBe(false);
    expect(resolveWorkshopMissingCost(inventory, blueprint)).toEqual({
      leather: 2,
      herb: 1,
    });
    expect(resolveWorkshopCraftInventoryDelta(blueprint)).toEqual({
      leather: -5,
      herb: -1,
    });
  });

  it('allows crafting when every material is available', () => {
    const blueprint = getWorkshopBlueprint('skinning_kit');
    const inventory = createInventory({
      leather: 2,
      bone: 2,
    });

    expect(canCraftWorkshopBlueprint(inventory, blueprint)).toBe(true);
    expect(resolveWorkshopMissingCost(inventory, blueprint)).toEqual({});
  });

  it('allows repairing only damaged active UL items with a repair blueprint', () => {
    const repairBlueprint = getWorkshopBlueprint('resonance_tool');
    const craftBlueprint = getWorkshopBlueprint('hunter_cleaver');

    expect(canRepairWorkshopItem(createWorkshopItem(), repairBlueprint)).toBe(true);
    expect(canRepairWorkshopItem(createWorkshopItem(), craftBlueprint)).toBe(false);
    expect(canRepairWorkshopItem(createWorkshopItem({ status: 'BROKEN', durability: 0 }), repairBlueprint)).toBe(true);
    expect(canRepairWorkshopItem(createWorkshopItem({ status: 'DESTROYED' }), repairBlueprint)).toBe(false);
    expect(canRepairWorkshopItem(createWorkshopItem({ itemClass: 'L' }), repairBlueprint)).toBe(false);
    expect(canRepairWorkshopItem(createWorkshopItem({ durability: 12 }), repairBlueprint)).toBe(false);
  });

  it('allows equipping only active items with durability left', () => {
    expect(canEquipWorkshopItem(createWorkshopItem({ status: 'ACTIVE', durability: 1 }))).toBe(true);
    expect(canEquipWorkshopItem(createWorkshopItem({ status: 'BROKEN', durability: 0 }))).toBe(false);
    expect(canEquipWorkshopItem(createWorkshopItem({ status: 'DESTROYED', durability: 0 }))).toBe(false);
    expect(canEquipWorkshopItem(createWorkshopItem({ status: 'ACTIVE', durability: 0 }))).toBe(false);
  });

  it('applies only equipped and usable workshop item stat bonuses', () => {
    const bonus = resolveWorkshopEquipmentStatBonus([
      createEquippedWorkshopItem({
        id: 'weapon-1',
        code: 'hunter_cleaver',
        itemClass: 'L',
        slot: 'weapon',
        maxDurability: 14,
      }),
      createEquippedWorkshopItem({
        id: 'armor-1',
        code: 'tracker_jacket',
        itemClass: 'L',
        slot: 'armor',
        maxDurability: 18,
      }),
      createEquippedWorkshopItem({
        id: 'tool-1',
        code: 'skinning_kit',
        equipped: false,
      }),
      createEquippedWorkshopItem({
        id: 'tool-2',
        code: 'skinning_kit',
        status: 'BROKEN',
        durability: 0,
      }),
    ]);

    expect(bonus).toEqual({
      health: 3,
      attack: 2,
      defence: 1,
      magicDefence: 0,
      dexterity: 0,
      intelligence: 0,
    });
  });

  it('decays L items into destruction and UL items into repairable broken state', () => {
    expect(resolveWorkshopItemDecay(createEquippedWorkshopItem({
      itemClass: 'L',
      durability: 1,
      maxDurability: 14,
    }))).toMatchObject({
      status: 'DESTROYED',
      durability: 0,
      equipped: false,
    });
    expect(resolveWorkshopItemDecay(createEquippedWorkshopItem({
      itemClass: 'UL',
      durability: 1,
      maxDurability: 12,
    }))).toMatchObject({
      status: 'BROKEN',
      durability: 0,
      equipped: false,
    });
    expect(resolveWorkshopItemDecay(createEquippedWorkshopItem({
      itemClass: 'UL',
      durability: 3,
      maxDurability: 12,
    }))).toMatchObject({
      status: 'ACTIVE',
      durability: 2,
      equipped: true,
    });
  });
});
