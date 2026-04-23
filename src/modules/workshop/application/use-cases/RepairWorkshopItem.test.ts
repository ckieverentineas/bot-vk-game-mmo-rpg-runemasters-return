import { describe, expect, it } from 'vitest';

import type { InventoryView, MaterialField, PlayerState, StatBlock } from '../../../../../shared/types/game';
import type {
  CommandIntentReplayResult,
  GameRepository,
} from '../../../../shared/application/ports/GameRepository';
import {
  getWorkshopBlueprint,
  type WorkshopBlueprintCode,
  type WorkshopRepairToolBlueprintDefinition,
} from '../../domain/workshop-catalog';
import type {
  PlayerBlueprintView,
  PlayerCraftedItemView,
  WorkshopMutationOptions,
} from '../workshop-persistence';
import { buildRepairWorkshopItemIntentStateKey } from '../command-intent-state';
import { RepairWorkshopItem, type RepairWorkshopItemResultView } from './RepairWorkshopItem';

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
  blueprintCode: 'resonance_tool',
  quantity: 1,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createItem = (overrides: Partial<PlayerCraftedItemView> = {}): PlayerCraftedItemView => ({
  id: 'crafted-ul-1',
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

interface RepairRequest {
  readonly playerId: number;
  readonly itemId: string;
  readonly repairBlueprintCode: WorkshopBlueprintCode;
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

class InMemoryRepairWorkshopRepository implements Pick<
  GameRepository,
  | 'findPlayerByVkId'
  | 'getCommandIntentResult'
  | 'storeCommandIntentResult'
  | 'listPlayerBlueprints'
  | 'listPlayerCraftedItems'
  | 'repairWorkshopItem'
> {
  public readonly repairRequests: RepairRequest[] = [];
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
    this.replayRequests.push({
      playerId,
      intentId,
      expectedCommandKeys,
      expectedStateKey,
    });

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

  public async repairWorkshopItem(
    playerId: number,
    itemId: string,
    repairBlueprintCode: WorkshopBlueprintCode,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView> {
    this.repairRequests.push({ playerId, itemId, repairBlueprintCode, options });

    const repairBlueprint = getWorkshopBlueprint(repairBlueprintCode);
    if (repairBlueprint.kind !== 'repair_tool') {
      throw new Error('Repair blueprint expected.');
    }

    this.spendBlueprint(repairBlueprint.code);
    this.spendMaterials(repairBlueprint);

    let repairedItem: PlayerCraftedItemView | null = null;
    this.items = this.items.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      repairedItem = {
        ...item,
        durability: item.maxDurability,
        updatedAt: '2026-04-12T00:00:01.000Z',
      };

      return repairedItem;
    });

    if (!repairedItem) {
      throw new Error('Item expected.');
    }

    this.player = {
      ...this.player,
      updatedAt: '2026-04-12T00:00:01.000Z',
    };

    return repairedItem;
  }

  private spendBlueprint(blueprintCode: WorkshopBlueprintCode): void {
    this.blueprints = this.blueprints.map((blueprint) => (
      blueprint.blueprintCode === blueprintCode
        ? { ...blueprint, quantity: blueprint.quantity - 1 }
        : blueprint
    ));
  }

  private spendMaterials(blueprint: WorkshopRepairToolBlueprintDefinition): void {
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

describe('RepairWorkshopItem', () => {
  it('repairs a damaged active UL item and returns the refreshed workshop view', async () => {
    const player = createPlayer({
      inventory: inventory({
        essence: 2,
        crystal: 2,
      }),
    });
    const blueprints = [createBlueprint({ blueprintCode: 'resonance_tool', quantity: 1 })];
    const items = [createItem({ id: 'crafted-ul-1', durability: 5, maxDurability: 12 })];
    const repository = new InMemoryRepairWorkshopRepository(player, blueprints, items);
    const useCase = new RepairWorkshopItem(repository.asGameRepository());
    const stateKey = buildRepairWorkshopItemIntentStateKey(player, 'crafted-ul-1', 'resonance_tool', blueprints, items);

    const result = await useCase.execute(
      player.vkId,
      'crafted-ul-1',
      'resonance_tool',
      'intent-repair-1',
      stateKey,
      'payload',
    );

    expect(repository.repairRequests).toEqual([
      {
        playerId: player.playerId,
        itemId: 'crafted-ul-1',
        repairBlueprintCode: 'resonance_tool',
        options: {
          intentId: 'intent-repair-1',
          intentStateKey: stateKey,
          currentStateKey: stateKey,
        },
      },
    ]);
    expect(repository.storedResults).toEqual([
      {
        playerId: player.playerId,
        intentId: 'intent-repair-1',
        result,
      },
    ]);
    expect(result.repairedItem).toMatchObject({
      id: 'crafted-ul-1',
      durability: 12,
      maxDurability: 12,
    });
    expect(result.view.repairTools).toEqual([
      expect.objectContaining({
        blueprint: expect.objectContaining({ code: 'resonance_tool' }),
        ownedQuantity: 0,
        available: false,
      }),
    ]);
    expect(result.acquisitionSummary).toMatchObject({
      kind: 'repaired_workshop_item',
      repairBlueprintCode: 'resonance_tool',
      itemId: 'crafted-ul-1',
    });
    expect(result.message).toContain('crafted-ul-1');
  });

  it('rejects non-repairable items before spending the repair blueprint', async () => {
    const player = createPlayer({
      inventory: inventory({
        essence: 2,
        crystal: 2,
      }),
    });
    const blueprints = [createBlueprint({ blueprintCode: 'resonance_tool', quantity: 1 })];
    const items = [createItem({ id: 'crafted-rare-1', itemClass: 'RARE', durability: 5, maxDurability: 12 })];
    const repository = new InMemoryRepairWorkshopRepository(player, blueprints, items);
    const useCase = new RepairWorkshopItem(repository.asGameRepository());
    const stateKey = buildRepairWorkshopItemIntentStateKey(player, 'crafted-rare-1', 'resonance_tool', blueprints, items);

    await expect(useCase.execute(player.vkId, 'crafted-rare-1', 'resonance_tool', 'intent-repair-1', stateKey, 'payload')).rejects.toMatchObject({
      code: 'workshop_item_not_repairable',
    });

    expect(repository.repairRequests).toEqual([]);
    expect(repository.storedResults).toEqual([]);
  });

  it('rejects repair when repair materials are missing before mutating workshop records', async () => {
    const player = createPlayer({
      inventory: inventory({
        essence: 2,
      }),
    });
    const blueprints = [createBlueprint({ blueprintCode: 'resonance_tool', quantity: 1 })];
    const items = [createItem({ id: 'crafted-ul-1', durability: 5, maxDurability: 12 })];
    const repository = new InMemoryRepairWorkshopRepository(player, blueprints, items);
    const useCase = new RepairWorkshopItem(repository.asGameRepository());
    const stateKey = buildRepairWorkshopItemIntentStateKey(player, 'crafted-ul-1', 'resonance_tool', blueprints, items);

    await expect(useCase.execute(player.vkId, 'crafted-ul-1', 'resonance_tool', 'intent-repair-1', stateKey, 'payload')).rejects.toMatchObject({
      code: 'not_enough_workshop_resources',
    });

    expect(repository.repairRequests).toEqual([]);
  });

  it('returns the canonical replay result before current repair blueprint validation', async () => {
    const player = createPlayer();
    const repairedItem = createItem({ id: 'crafted-replay-1', durability: 12 });
    const replayedResult: RepairWorkshopItemResultView = {
      view: {
        player,
        blueprints: [],
        repairTools: [],
        craftedItems: [],
      },
      repairedItem,
      acquisitionSummary: {
        kind: 'repaired_workshop_item',
        repairBlueprintCode: 'resonance_tool',
        itemId: repairedItem.id,
        title: 'Предмет отремонтирован',
        changeLine: 'Предмет восстановлен.',
      },
      message: 'Предмет восстановлен.',
    };
    const repository = new InMemoryRepairWorkshopRepository(
      player,
      [],
      [],
      { status: 'APPLIED', result: replayedResult },
    );
    const useCase = new RepairWorkshopItem(repository.asGameRepository());

    await expect(useCase.execute(
      player.vkId,
      'crafted-replay-1',
      'hunter_cleaver',
      'intent-repair-1',
      'old-state',
      'payload',
    )).resolves.toBe(replayedResult);

    expect(repository.replayRequests).toEqual([{
      playerId: player.playerId,
      intentId: 'intent-repair-1',
      expectedCommandKeys: ['REPAIR_WORKSHOP_ITEM'],
      expectedStateKey: 'old-state',
    }]);
    expect(repository.repairRequests).toEqual([]);
  });

  it('surfaces pending command retries without repairing again', async () => {
    const player = createPlayer({
      inventory: inventory({
        essence: 2,
        crystal: 2,
      }),
    });
    const blueprints = [createBlueprint({ blueprintCode: 'resonance_tool', quantity: 1 })];
    const items = [createItem({ id: 'crafted-ul-1', durability: 5, maxDurability: 12 })];
    const repository = new InMemoryRepairWorkshopRepository(
      player,
      blueprints,
      items,
      { status: 'PENDING' },
    );
    const useCase = new RepairWorkshopItem(repository.asGameRepository());
    const stateKey = buildRepairWorkshopItemIntentStateKey(player, 'crafted-ul-1', 'resonance_tool', blueprints, items);

    await expect(useCase.execute(player.vkId, 'crafted-ul-1', 'resonance_tool', 'intent-repair-1', stateKey, 'payload')).rejects.toMatchObject({
      code: 'command_retry_pending',
    });

    expect(repository.repairRequests).toEqual([]);
  });
});
