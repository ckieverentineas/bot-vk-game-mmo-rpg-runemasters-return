import { describe, expect, it, vi } from 'vitest';

import type { InventoryDelta, InventoryView, PlayerState, StatBlock } from '../../../../../shared/types/game';
import { Logger } from '../../../../utils/logger';
import type {
  CommandIntentReplayResult,
  GameRepository,
} from '../../../../shared/application/ports/GameRepository';
import type { GameTelemetry } from '../../../../shared/application/ports/GameTelemetry';
import { buildBuyWorkshopShopOfferIntentStateKey } from '../command-intent-state';
import type { PlayerBlueprintInstanceView, PlayerCraftedItemView, WorkshopMutationOptions } from '../workshop-persistence';
import { BuyWorkshopShopOffer, type BuyWorkshopShopOfferResultView } from './BuyWorkshopShopOffer';

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
  healingPills: 0,
  ...overrides,
});

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 20,
  radiance: 3,
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

const createTelemetry = (): GameTelemetry => ({
  economyTransactionCommitted: vi.fn().mockResolvedValue(undefined),
} as Partial<GameTelemetry> as GameTelemetry);

interface PurchaseRequest {
  readonly playerId: number;
  readonly priceDust: number;
  readonly inventoryDelta: InventoryDelta;
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

class InMemoryBuyWorkshopShopOfferRepository implements Pick<
  GameRepository,
  | 'findPlayerByVkId'
  | 'getCommandIntentResult'
  | 'storeCommandIntentResult'
  | 'purchaseWorkshopShopOffer'
  | 'listPlayerBlueprintInstances'
  | 'listPlayerCraftedItems'
> {
  public readonly purchaseRequests: PurchaseRequest[] = [];
  public readonly replayRequests: ReplayRequest[] = [];
  public readonly storedResults: StoredResult[] = [];

  private player: PlayerState;

  public constructor(
    player: PlayerState,
    private readonly replay: CommandIntentReplayResult<unknown> | null = null,
  ) {
    this.player = player;
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

  public async purchaseWorkshopShopOffer(
    playerId: number,
    priceDust: number,
    inventoryDelta: InventoryDelta,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerState> {
    this.purchaseRequests.push({ playerId, priceDust, inventoryDelta, options });

    if (this.player.gold < priceDust) {
      throw new Error('Dust affordability should be checked before persistence.');
    }

    const nextInventory = { ...this.player.inventory };
    for (const [field, amount] of Object.entries(inventoryDelta)) {
      nextInventory[field as keyof InventoryView] = (nextInventory[field as keyof InventoryView] ?? 0) + (amount ?? 0);
    }

    this.player = {
      ...this.player,
      gold: this.player.gold - priceDust,
      radiance: this.player.radiance,
      inventory: nextInventory,
      updatedAt: '2026-04-12T00:00:01.000Z',
    };

    return this.player;
  }

  public async listPlayerBlueprintInstances(): Promise<readonly PlayerBlueprintInstanceView[]> {
    return [];
  }

  public async listPlayerCraftedItems(): Promise<readonly PlayerCraftedItemView[]> {
    return [];
  }
}

describe('BuyWorkshopShopOffer', () => {
  it('buys a routine shop offer for dust and returns the refreshed workshop view', async () => {
    const player = createPlayer({ gold: 20, radiance: 3, inventory: inventory({ healingPills: 1 }) });
    const repository = new InMemoryBuyWorkshopShopOfferRepository(player);
    const telemetry = createTelemetry();
    const useCase = new BuyWorkshopShopOffer(repository.asGameRepository(), telemetry);
    const stateKey = buildBuyWorkshopShopOfferIntentStateKey(player, 'healing_pill');

    const result = await useCase.execute(player.vkId, 'healing_pill', 'intent-buy-1', stateKey, 'payload');

    expect(repository.purchaseRequests).toEqual([
      {
        playerId: player.playerId,
        priceDust: 12,
        inventoryDelta: { healingPills: 1 },
        options: {
          intentId: 'intent-buy-1',
          intentStateKey: stateKey,
          currentStateKey: stateKey,
        },
      },
    ]);
    expect(result.view.player.gold).toBe(8);
    expect(result.view.player.radiance).toBe(3);
    expect(result.view.player.inventory.healingPills).toBe(2);
    expect(result.acquisitionSummary).toMatchObject({
      kind: 'workshop_shop_purchase',
      offerCode: 'healing_pill',
    });
    expect(telemetry.economyTransactionCommitted).toHaveBeenCalledWith(player.userId, {
      transactionType: 'dust_spent',
      sourceType: 'WORKSHOP_SHOP',
      sourceId: 'healing_pill',
      resourceDustDelta: -12,
      resourceRadianceDelta: 0,
      resourceShardsDelta: 0,
      runeDelta: 0,
      playerLevel: 1,
    });
    expect(repository.storedResults).toEqual([
      {
        playerId: player.playerId,
        intentId: 'intent-buy-1',
        result,
      },
    ]);
  });

  it('rejects a shop purchase when dust is missing before mutating inventory', async () => {
    const player = createPlayer({ gold: 7 });
    const repository = new InMemoryBuyWorkshopShopOfferRepository(player);
    const useCase = new BuyWorkshopShopOffer(repository.asGameRepository());
    const stateKey = buildBuyWorkshopShopOfferIntentStateKey(player, 'healing_pill');

    await expect(useCase.execute(player.vkId, 'healing_pill', 'intent-buy-1', stateKey, 'payload')).rejects.toMatchObject({
      code: 'not_enough_dust',
    });

    expect(repository.purchaseRequests).toEqual([]);
    expect(repository.storedResults).toEqual([]);
  });

  it('keeps a completed shop purchase when economy telemetry fails', async () => {
    const player = createPlayer({ gold: 20, radiance: 3 });
    const repository = new InMemoryBuyWorkshopShopOfferRepository(player);
    const telemetry = createTelemetry();
    const warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => undefined);
    vi.mocked(telemetry.economyTransactionCommitted).mockRejectedValueOnce(new Error('telemetry offline'));
    const useCase = new BuyWorkshopShopOffer(repository.asGameRepository(), telemetry);
    const stateKey = buildBuyWorkshopShopOfferIntentStateKey(player, 'healing_pill');

    const result = await useCase.execute(player.vkId, 'healing_pill', 'intent-buy-1', stateKey, 'payload');

    expect(result.view.player.gold).toBe(8);
    expect(repository.purchaseRequests).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith('Telemetry logging failed', expect.any(Error));
    expect(repository.storedResults).toEqual([
      {
        playerId: player.playerId,
        intentId: 'intent-buy-1',
        result,
      },
    ]);
    warnSpy.mockRestore();
  });

  it('returns the canonical replay result without buying again', async () => {
    const player = createPlayer({ gold: 0 });
    const telemetry = createTelemetry();
    const replayedResult: BuyWorkshopShopOfferResultView = {
      view: {
        player,
        blueprints: [],
        repairTools: [],
        craftedItems: [],
        shopOffers: [],
      },
      acquisitionSummary: {
        kind: 'workshop_shop_purchase',
        offerCode: 'healing_pill',
        title: 'Лавка мастерской',
        changeLine: 'Покупка уже учтена.',
        nextStepLine: 'Можно продолжать.',
      },
      message: 'Покупка уже учтена.',
    };
    const repository = new InMemoryBuyWorkshopShopOfferRepository(player, {
      status: 'APPLIED',
      result: replayedResult,
    });
    const useCase = new BuyWorkshopShopOffer(repository.asGameRepository(), telemetry);

    await expect(useCase.execute(player.vkId, 'healing_pill', 'intent-buy-1', 'old-state', 'payload')).resolves.toBe(replayedResult);

    expect(repository.replayRequests).toEqual([
      {
        playerId: player.playerId,
        intentId: 'intent-buy-1',
        expectedCommandKeys: ['BUY_WORKSHOP_SHOP_OFFER'],
        expectedStateKey: 'old-state',
      },
    ]);
    expect(repository.purchaseRequests).toEqual([]);
    expect(telemetry.economyTransactionCommitted).not.toHaveBeenCalled();
  });
});
