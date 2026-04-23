import { describe, expect, it } from 'vitest';

import type { InventoryView, PlayerState, StatBlock } from '../../../../../shared/types/game';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import type { PlayerBlueprintView, PlayerCraftedItemView } from '../workshop-persistence';
import { GetWorkshop } from './GetWorkshop';

const baseStats = (): StatBlock => ({
  health: 8,
  attack: 4,
  defence: 3,
  magicDefence: 1,
  dexterity: 2,
  intelligence: 1,
});

const inventory = (overrides: Partial<InventoryView> = {}): InventoryView => ({
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

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  radiance: 0,
  baseStats: baseStats(),
  locationLevel: 1,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 0,
  tutorialState: 'SKIPPED',
  inventory: inventory(),
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createBlueprint = (overrides: Partial<PlayerBlueprintView> = {}): PlayerBlueprintView => ({
  playerId: 1,
  blueprintCode: 'hunter_cleaver',
  quantity: 1,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createItem = (overrides: Partial<PlayerCraftedItemView> = {}): PlayerCraftedItemView => ({
  id: 'crafted-1',
  playerId: 1,
  itemCode: 'skinning_kit',
  itemClass: 'UL',
  slot: 'tool',
  status: 'ACTIVE',
  equipped: false,
  durability: 5,
  maxDurability: 12,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createRepository = (
  player: PlayerState | null,
  blueprints: readonly PlayerBlueprintView[] = [],
  items: readonly PlayerCraftedItemView[] = [],
): GameRepository => ({
  findPlayerByVkId: async () => player,
  listPlayerBlueprints: async () => blueprints,
  listPlayerCraftedItems: async () => items,
} as unknown as GameRepository);

describe('GetWorkshop', () => {
  it('builds a workshop view with blueprint affordability and repair tool readiness', async () => {
    const player = createPlayer({
      inventory: inventory({
        leather: 4,
        bone: 2,
        metal: 1,
        essence: 2,
        crystal: 2,
      }),
    });
    const damagedItem = createItem({ id: 'crafted-ul-1', durability: 5, maxDurability: 12 });
    const completeItem = createItem({
      id: 'crafted-rare-1',
      itemCode: 'hunter_cleaver',
      itemClass: 'L',
      slot: 'weapon',
      durability: 14,
      maxDurability: 14,
    });
    const repository = createRepository(
      player,
      [
        createBlueprint({ blueprintCode: 'hunter_cleaver', quantity: 1 }),
        createBlueprint({ blueprintCode: 'resonance_tool', quantity: 1 }),
      ],
      [damagedItem, completeItem],
    );
    const useCase = new GetWorkshop(repository);

    const result = await useCase.execute(player.vkId);

    expect(result.player).toBe(player);
    expect(result.blueprints.find((entry) => entry.blueprint.code === 'hunter_cleaver')).toMatchObject({
      ownedQuantity: 1,
      canCraft: true,
      missingCost: {},
    });
    expect(result.blueprints.find((entry) => entry.blueprint.code === 'tracker_jacket')).toMatchObject({
      ownedQuantity: 0,
      canCraft: false,
      missingCost: { leather: 1, herb: 1 },
    });
    expect(result.blueprints.find((entry) => entry.blueprint.code === 'resonance_tool')).toMatchObject({
      ownedQuantity: 1,
      canCraft: false,
      missingCost: {},
    });
    expect(result.repairTools).toEqual([
      expect.objectContaining({
        blueprint: expect.objectContaining({ code: 'resonance_tool' }),
        ownedQuantity: 1,
        available: true,
        missingCost: {},
      }),
    ]);
    expect(result.craftedItems.find((entry) => entry.item.id === 'crafted-ul-1')).toMatchObject({
      repairable: true,
      availableRepairTools: [
        expect.objectContaining({
          blueprint: expect.objectContaining({ code: 'resonance_tool' }),
          available: true,
        }),
      ],
    });
    expect(result.craftedItems.find((entry) => entry.item.id === 'crafted-rare-1')).toMatchObject({
      repairable: false,
      availableRepairTools: [],
    });
  });

  it('requires an existing player before reading workshop records', async () => {
    const repository = createRepository(null);
    const useCase = new GetWorkshop(repository);

    await expect(useCase.execute(404)).rejects.toMatchObject({
      code: 'player_not_found',
    });
  });
});
