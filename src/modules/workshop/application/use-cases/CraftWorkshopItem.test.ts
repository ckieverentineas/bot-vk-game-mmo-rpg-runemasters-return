import { describe, expect, it } from 'vitest';

import type { InventoryView, MaterialField, PlayerState, StatBlock } from '../../../../../shared/types/game';
import type {
  CommandIntentReplayResult,
  GameRepository,
} from '../../../../shared/application/ports/GameRepository';
import {
  getWorkshopBlueprint,
  type WorkshopBlueprintCode,
  type WorkshopCraftItemBlueprintDefinition,
} from '../../domain/workshop-catalog';
import type {
  PlayerBlueprintView,
  PlayerCraftedItemView,
  WorkshopMutationOptions,
} from '../workshop-persistence';
import { buildCraftWorkshopItemIntentStateKey } from '../command-intent-state';
import { CraftWorkshopItem, type CraftWorkshopItemResultView } from './CraftWorkshopItem';

const materialFields: readonly MaterialField[] = [
  'leather',
  'bone',
  'herb',
  'essence',
  'metal',
  'crystal',
];

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
  id: 'crafted-hunter_cleaver-1',
  playerId: 1,
  itemCode: 'hunter_cleaver',
  itemClass: 'RARE',
  slot: 'weapon',
  status: 'ACTIVE',
  equipped: false,
  durability: 14,
  maxDurability: 14,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

interface CraftRequest {
  readonly playerId: number;
  readonly blueprintCode: WorkshopBlueprintCode;
  readonly options: WorkshopMutationOptions | undefined;
}

interface StoredResult {
  readonly playerId: number;
  readonly intentId: string;
  readonly result: unknown;
}

interface ReplayRequest {
  readonly playerId: number;
  readonly intentId: string;
  readonly expectedCommandKeys: readonly string[] | undefined;
  readonly expectedStateKey: string | undefined;
}

class InMemoryCraftWorkshopRepository implements Pick<
  GameRepository,
  | 'findPlayerByVkId'
  | 'getCommandIntentResult'
  | 'storeCommandIntentResult'
  | 'listPlayerBlueprints'
  | 'listPlayerCraftedItems'
  | 'craftWorkshopItem'
> {
  public readonly craftRequests: CraftRequest[] = [];
  public readonly replayRequests: ReplayRequest[] = [];
  public readonly storedResults: StoredResult[] = [];

  private player: PlayerState;
  private blueprints: PlayerBlueprintView[];
  private items: PlayerCraftedItemView[];

  public constructor(
    player: PlayerState,
    blueprints: readonly PlayerBlueprintView[] = [],
    items: readonly PlayerCraftedItemView[] = [],
    private readonly replay: CommandIntentReplayResult<unknown> | null = null,
  ) {
    this.player = player;
    this.blueprints = [...blueprints];
    this.items = [...items];
  }

  public asGameRepository(): GameRepository {
    return this as unknown as GameRepository;
  }

  public async findPlayerByVkId(vkId: number): Promise<PlayerState | null> {
    return this.player.vkId === vkId ? this.player : null;
  }

  public async getCommandIntentResult<TResult = PlayerState>(
    playerId: number,
    intentId: string,
    expectedCommandKeys?: readonly string[],
    expectedStateKey?: string,
  ): Promise<CommandIntentReplayResult<TResult> | null> {
    this.replayRequests.push({ playerId, intentId, expectedCommandKeys, expectedStateKey });

    return this.replay as CommandIntentReplayResult<TResult> | null;
  }

  public async storeCommandIntentResult<TResult>(
    playerId: number,
    intentId: string,
    result: TResult,
  ): Promise<void> {
    this.storedResults.push({ playerId, intentId, result });
  }

  public async listPlayerBlueprints(): Promise<readonly PlayerBlueprintView[]> {
    return this.blueprints;
  }

  public async listPlayerCraftedItems(): Promise<readonly PlayerCraftedItemView[]> {
    return this.items;
  }

  public async craftWorkshopItem(
    playerId: number,
    blueprintCode: WorkshopBlueprintCode,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView> {
    this.craftRequests.push({ playerId, blueprintCode, options });

    const blueprint = getWorkshopBlueprint(blueprintCode);
    if (blueprint.kind !== 'craft_item') {
      throw new Error('Craft blueprint expected.');
    }

    this.spendBlueprint(blueprint.code);
    this.spendMaterials(blueprint);

    const craftedItem = createItem({
      id: `crafted-${blueprint.resultItemCode}-${this.items.length + 1}`,
      playerId,
      itemCode: blueprint.resultItemCode,
      itemClass: blueprint.itemClass,
      slot: blueprint.slot,
      durability: blueprint.maxDurability,
      maxDurability: blueprint.maxDurability,
    });

    this.items = [...this.items, craftedItem];
    this.player = {
      ...this.player,
      updatedAt: '2026-04-12T00:00:01.000Z',
    };

    return craftedItem;
  }

  private spendBlueprint(blueprintCode: WorkshopBlueprintCode): void {
    this.blueprints = this.blueprints.map((blueprint) => (
      blueprint.blueprintCode === blueprintCode
        ? { ...blueprint, quantity: blueprint.quantity - 1 }
        : blueprint
    ));
  }

  private spendMaterials(blueprint: WorkshopCraftItemBlueprintDefinition): void {
    const nextInventory = { ...this.player.inventory };

    for (const field of materialFields) {
      nextInventory[field] -= blueprint.cost[field] ?? 0;
    }

    this.player = {
      ...this.player,
      inventory: nextInventory,
    };
  }
}

describe('CraftWorkshopItem', () => {
  it('crafts an owned blueprint and returns the refreshed workshop view', async () => {
    const player = createPlayer({
      inventory: inventory({
        leather: 4,
        bone: 2,
        metal: 1,
      }),
    });
    const blueprints = [createBlueprint({ blueprintCode: 'hunter_cleaver', quantity: 1 })];
    const repository = new InMemoryCraftWorkshopRepository(player, blueprints);
    const useCase = new CraftWorkshopItem(repository.asGameRepository());
    const stateKey = buildCraftWorkshopItemIntentStateKey(player, 'hunter_cleaver', blueprints, []);

    const result = await useCase.execute(player.vkId, 'hunter_cleaver', 'intent-craft-1', stateKey, 'payload');

    expect(repository.craftRequests).toEqual([
      {
        playerId: player.playerId,
        blueprintCode: 'hunter_cleaver',
        options: {
          intentId: 'intent-craft-1',
          intentStateKey: stateKey,
          currentStateKey: stateKey,
        },
      },
    ]);
    expect(repository.storedResults).toEqual([
      {
        playerId: player.playerId,
        intentId: 'intent-craft-1',
        result,
      },
    ]);
    expect(result.craftedItem).toMatchObject({
      itemCode: 'hunter_cleaver',
      durability: 14,
      maxDurability: 14,
    });
    expect(result.view.blueprints.find((entry) => entry.blueprint.code === 'hunter_cleaver')).toMatchObject({
      ownedQuantity: 0,
      canCraft: false,
    });
    expect(result.view.craftedItems.find((entry) => entry.item.id === result.craftedItem.id)).toMatchObject({
      repairable: false,
    });
    expect(result.acquisitionSummary).toMatchObject({
      kind: 'crafted_workshop_item',
      blueprintCode: 'hunter_cleaver',
      itemId: result.craftedItem.id,
    });
    expect(result.message).toContain('hunter_cleaver');
  });

  it('rejects crafting when required materials are missing before mutating workshop records', async () => {
    const player = createPlayer({
      inventory: inventory({
        leather: 4,
        bone: 2,
      }),
    });
    const blueprints = [createBlueprint({ blueprintCode: 'hunter_cleaver', quantity: 1 })];
    const repository = new InMemoryCraftWorkshopRepository(player, blueprints);
    const useCase = new CraftWorkshopItem(repository.asGameRepository());
    const stateKey = buildCraftWorkshopItemIntentStateKey(player, 'hunter_cleaver', blueprints, []);

    await expect(useCase.execute(player.vkId, 'hunter_cleaver', 'intent-craft-1', stateKey, 'payload')).rejects.toMatchObject({
      code: 'not_enough_workshop_resources',
    });

    expect(repository.craftRequests).toEqual([]);
    expect(repository.storedResults).toEqual([]);
  });

  it('rejects crafting when the player does not own the blueprint', async () => {
    const player = createPlayer({
      inventory: inventory({
        leather: 4,
        bone: 2,
        metal: 1,
      }),
    });
    const repository = new InMemoryCraftWorkshopRepository(player, []);
    const useCase = new CraftWorkshopItem(repository.asGameRepository());
    const stateKey = buildCraftWorkshopItemIntentStateKey(player, 'hunter_cleaver', [], []);

    await expect(useCase.execute(player.vkId, 'hunter_cleaver', 'intent-craft-1', stateKey, 'payload')).rejects.toMatchObject({
      code: 'workshop_blueprint_unavailable',
    });

    expect(repository.craftRequests).toEqual([]);
  });

  it('returns the canonical replay result before current resource or catalog checks', async () => {
    const player = createPlayer();
    const replayedItem = createItem({ id: 'crafted-replay-1' });
    const replayedResult: CraftWorkshopItemResultView = {
      view: {
        player,
        blueprints: [],
        repairTools: [],
        craftedItems: [],
      },
      craftedItem: replayedItem,
      acquisitionSummary: {
        kind: 'crafted_workshop_item',
        blueprintCode: 'hunter_cleaver',
        itemId: replayedItem.id,
        title: 'Crafted workshop item',
        changeLine: 'Created hunter_cleaver.',
      },
      message: 'Created hunter_cleaver.',
    };
    const repository = new InMemoryCraftWorkshopRepository(
      player,
      [],
      [],
      { status: 'APPLIED', result: replayedResult },
    );
    const useCase = new CraftWorkshopItem(repository.asGameRepository());

    await expect(useCase.execute(player.vkId, 'resonance_tool', 'intent-craft-1', 'old-state', 'payload')).resolves.toBe(replayedResult);

    expect(repository.replayRequests).toEqual([
      {
        playerId: player.playerId,
        intentId: 'intent-craft-1',
        expectedCommandKeys: ['CRAFT_WORKSHOP_ITEM'],
        expectedStateKey: 'old-state',
      },
    ]);
    expect(repository.craftRequests).toEqual([]);
  });

  it('rejects stale payload craft intents before spending a blueprint', async () => {
    const player = createPlayer({
      inventory: inventory({
        leather: 4,
        bone: 2,
        metal: 1,
      }),
    });
    const blueprints = [createBlueprint({ blueprintCode: 'hunter_cleaver', quantity: 1 })];
    const repository = new InMemoryCraftWorkshopRepository(player, blueprints);
    const useCase = new CraftWorkshopItem(repository.asGameRepository());

    await expect(useCase.execute(player.vkId, 'hunter_cleaver', 'intent-craft-1', 'old-state', 'payload')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.craftRequests).toEqual([]);
  });
});
