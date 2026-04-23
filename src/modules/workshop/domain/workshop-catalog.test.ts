import { describe, expect, it } from 'vitest';

import type { InventoryView } from '../../../shared/types/game';
import type { WorkshopItemView } from './workshop-catalog';
import {
  canCraftWorkshopBlueprint,
  canRepairWorkshopItem,
  getWorkshopBlueprint,
  listWorkshopBlueprints,
  resolveWorkshopCraftInventoryDelta,
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
      itemClass: 'RARE',
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
    expect(canRepairWorkshopItem(createWorkshopItem({ status: 'BROKEN' }), repairBlueprint)).toBe(false);
    expect(canRepairWorkshopItem(createWorkshopItem({ status: 'DESTROYED' }), repairBlueprint)).toBe(false);
    expect(canRepairWorkshopItem(createWorkshopItem({ itemClass: 'UNCOMMON' }), repairBlueprint)).toBe(false);
    expect(canRepairWorkshopItem(createWorkshopItem({ durability: 0 }), repairBlueprint)).toBe(false);
    expect(canRepairWorkshopItem(createWorkshopItem({ durability: 12 }), repairBlueprint)).toBe(false);
  });
});
