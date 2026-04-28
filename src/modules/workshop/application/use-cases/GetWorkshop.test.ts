import { describe, expect, it } from 'vitest';

import type { InventoryView, PlayerState, StatBlock } from '../../../../../shared/types/game';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import type { PlayerBlueprintInstanceView, PlayerCraftedItemView } from '../workshop-persistence';
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

const createBlueprintInstance = (
  overrides: Partial<PlayerBlueprintInstanceView> = {},
): PlayerBlueprintInstanceView => ({
  id: 'bp-instance-1',
  playerId: 1,
  blueprintCode: 'hunter_cleaver',
  rarity: 'COMMON',
  sourceType: 'QUEST',
  sourceId: 'test',
  discoveryKind: 'QUEST',
  quality: 'STURDY',
  craftPotential: 'default',
  modifierSnapshot: {},
  status: 'AVAILABLE',
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  discoveredAt: '2026-04-12T00:00:00.000Z',
  consumedAt: null,
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
  blueprintInstances: readonly PlayerBlueprintInstanceView[] = [],
  items: readonly PlayerCraftedItemView[] = [],
): GameRepository => ({
  findPlayerByVkId: async () => player,
  listPlayerBlueprintInstances: async () => blueprintInstances,
  listPlayerCraftedItems: async () => items,
} as unknown as GameRepository);

describe('GetWorkshop', () => {
  it('builds a workshop view with blueprint affordability and repair tool readiness', async () => {
    const player = createPlayer({
      gold: 8,
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
        createBlueprintInstance({ id: 'bp-cleaver-1', blueprintCode: 'hunter_cleaver' }),
        createBlueprintInstance({ id: 'bp-resonance-1', blueprintCode: 'resonance_tool' }),
        createBlueprintInstance({ id: 'bp-jacket-1', blueprintCode: 'tracker_jacket', status: 'CONSUMED' }),
      ],
      [damagedItem, completeItem],
    );
    const useCase = new GetWorkshop(repository);

    const result = await useCase.execute(player.vkId);

    expect(result.player).toBe(player);
    expect(result.blueprints.find((entry) => entry.blueprint.code === 'hunter_cleaver')).toMatchObject({
      instance: expect.objectContaining({ id: 'bp-cleaver-1' }),
      ownedQuantity: 1,
      canCraft: true,
      dustCost: 8,
      missingDust: 0,
      missingCost: {},
    });
    expect(result.blueprints.find((entry) => entry.blueprint.code === 'tracker_jacket')).toBeUndefined();
    expect(result.blueprints.find((entry) => entry.blueprint.code === 'resonance_tool')).toMatchObject({
      instance: expect.objectContaining({ id: 'bp-resonance-1' }),
      ownedQuantity: 1,
      canCraft: false,
      missingCost: {},
    });
    expect(result.repairTools).toEqual([
      expect.objectContaining({
        instance: expect.objectContaining({ id: 'bp-resonance-1' }),
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

  it('does not show craft templates when the player has no blueprint instances', async () => {
    const player = createPlayer();
    const repository = createRepository(player, []);
    const useCase = new GetWorkshop(repository);

    const result = await useCase.execute(player.vkId);

    expect(result.blueprints).toEqual([]);
    expect(result.repairTools).toEqual([]);
  });

  it('shows found blueprints as blocked when the player cannot pay the workshop dust fee', async () => {
    const player = createPlayer({
      gold: 7,
      inventory: inventory({
        leather: 4,
        bone: 2,
        metal: 1,
      }),
    });
    const repository = createRepository(player, [
      createBlueprintInstance({ id: 'bp-cleaver-1', blueprintCode: 'hunter_cleaver' }),
    ]);
    const useCase = new GetWorkshop(repository);

    const result = await useCase.execute(player.vkId);

    expect(result.blueprints[0]).toMatchObject({
      canCraft: false,
      missingCost: {},
      dustCost: 8,
      missingDust: 1,
    });
  });
});
