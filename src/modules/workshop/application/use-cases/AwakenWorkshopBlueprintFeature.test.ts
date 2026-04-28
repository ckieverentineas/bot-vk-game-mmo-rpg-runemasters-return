import { describe, expect, it } from 'vitest';

import type { InventoryView, PlayerState, StatBlock } from '../../../../../shared/types/game';
import type {
  CommandIntentReplayResult,
  GameRepository,
} from '../../../../shared/application/ports/GameRepository';
import type { WorkshopBlueprintModifierSnapshot } from '../../domain/workshop-blueprint-instances';
import {
  workshopBlueprintFeatureAwakeningRadianceCost,
  workshopRadianceFeatureNote,
} from '../../domain/workshop-blueprint-instances';
import { buildAwakenWorkshopBlueprintFeatureIntentStateKey } from '../command-intent-state';
import type {
  PlayerBlueprintInstanceView,
  PlayerCraftedItemView,
  WorkshopMutationOptions,
} from '../workshop-persistence';
import {
  AwakenWorkshopBlueprintFeature,
  type AwakenWorkshopBlueprintFeatureResultView,
} from './AwakenWorkshopBlueprintFeature';

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
  radiance: 1,
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
  id: 'bp-hunter-cleaver-1',
  playerId: 1,
  blueprintCode: 'hunter_cleaver',
  rarity: 'RARE',
  sourceType: 'QUEST',
  sourceId: 'quest:trail',
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

interface AwakeningRequest {
  readonly playerId: number;
  readonly blueprintInstanceId: string;
  readonly radianceCost: number;
  readonly modifierSnapshot: WorkshopBlueprintModifierSnapshot;
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

class InMemoryAwakenWorkshopBlueprintFeatureRepository implements Pick<
  GameRepository,
  | 'findPlayerByVkId'
  | 'getCommandIntentResult'
  | 'storeCommandIntentResult'
  | 'listPlayerBlueprintInstances'
  | 'listPlayerCraftedItems'
  | 'awakenWorkshopBlueprintFeature'
> {
  public readonly awakeningRequests: AwakeningRequest[] = [];
  public readonly replayRequests: ReplayRequest[] = [];
  public readonly storedResults: StoredResult[] = [];

  private player: PlayerState;
  private blueprintInstances: PlayerBlueprintInstanceView[];

  public constructor(
    player: PlayerState,
    blueprintInstances: readonly PlayerBlueprintInstanceView[] = [],
    private readonly replay: CommandIntentReplayResult<unknown> | null = null,
  ) {
    this.player = player;
    this.blueprintInstances = [...blueprintInstances];
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

  public async listPlayerBlueprintInstances(): Promise<readonly PlayerBlueprintInstanceView[]> {
    return this.blueprintInstances;
  }

  public async listPlayerCraftedItems(): Promise<readonly PlayerCraftedItemView[]> {
    return [];
  }

  public async awakenWorkshopBlueprintFeature(
    playerId: number,
    blueprintInstanceId: string,
    radianceCost: number,
    modifierSnapshot: WorkshopBlueprintModifierSnapshot,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerBlueprintInstanceView> {
    this.awakeningRequests.push({
      playerId,
      blueprintInstanceId,
      radianceCost,
      modifierSnapshot,
      options,
    });

    if (this.player.radiance < radianceCost) {
      throw new Error('Radiance affordability should be checked before persistence.');
    }

    let updatedInstance: PlayerBlueprintInstanceView | null = null;
    this.blueprintInstances = this.blueprintInstances.map((instance) => {
      if (instance.id !== blueprintInstanceId) {
        return instance;
      }

      updatedInstance = {
        ...instance,
        modifierSnapshot,
        updatedAt: '2026-04-12T00:00:01.000Z',
      };

      return updatedInstance;
    });
    this.player = {
      ...this.player,
      radiance: this.player.radiance - radianceCost,
      updatedAt: '2026-04-12T00:00:01.000Z',
    };

    if (!updatedInstance) {
      throw new Error('Blueprint instance expected.');
    }

    return updatedInstance;
  }
}

describe('AwakenWorkshopBlueprintFeature', () => {
  it('spends radiance to awaken an owned unique blueprint feature', async () => {
    const player = createPlayer({ radiance: 1 });
    const blueprintInstance = createBlueprintInstance();
    const repository = new InMemoryAwakenWorkshopBlueprintFeatureRepository(player, [blueprintInstance]);
    const useCase = new AwakenWorkshopBlueprintFeature(repository.asGameRepository());
    const stateKey = buildAwakenWorkshopBlueprintFeatureIntentStateKey(
      player,
      blueprintInstance.id,
      [blueprintInstance],
    );

    const result = await useCase.execute(
      player.vkId,
      blueprintInstance.id,
      'intent-awaken-1',
      stateKey,
      'payload',
    );

    expect(repository.awakeningRequests).toEqual([
      {
        playerId: player.playerId,
        blueprintInstanceId: blueprintInstance.id,
        radianceCost: workshopBlueprintFeatureAwakeningRadianceCost,
        modifierSnapshot: {
          radianceFeatureAwakened: true,
          notes: [workshopRadianceFeatureNote],
        },
        options: {
          intentId: 'intent-awaken-1',
          intentStateKey: stateKey,
          currentStateKey: stateKey,
        },
      },
    ]);
    expect(result.view.player.radiance).toBe(0);
    expect(result.awakenedBlueprint.modifierSnapshot.radianceFeatureAwakened).toBe(true);
    expect(result.view.blueprints[0]?.canAwakenFeature).toBe(false);
    expect(result.acquisitionSummary).toMatchObject({
      kind: 'awakened_workshop_blueprint_feature',
      blueprintInstanceId: blueprintInstance.id,
      radianceCost: workshopBlueprintFeatureAwakeningRadianceCost,
    });
    expect(repository.storedResults).toEqual([
      {
        playerId: player.playerId,
        intentId: 'intent-awaken-1',
        result,
      },
    ]);
  });

  it('rejects awakening when radiance is missing before mutating records', async () => {
    const player = createPlayer({ radiance: 0 });
    const blueprintInstance = createBlueprintInstance();
    const repository = new InMemoryAwakenWorkshopBlueprintFeatureRepository(player, [blueprintInstance]);
    const useCase = new AwakenWorkshopBlueprintFeature(repository.asGameRepository());
    const stateKey = buildAwakenWorkshopBlueprintFeatureIntentStateKey(
      player,
      blueprintInstance.id,
      [blueprintInstance],
    );

    await expect(useCase.execute(
      player.vkId,
      blueprintInstance.id,
      'intent-awaken-1',
      stateKey,
      'payload',
    )).rejects.toMatchObject({
      code: 'not_enough_radiance',
    });

    expect(repository.awakeningRequests).toEqual([]);
    expect(repository.storedResults).toEqual([]);
  });

  it('rejects routine common blueprints', async () => {
    const player = createPlayer({ radiance: 1 });
    const blueprintInstance = createBlueprintInstance({
      rarity: 'COMMON',
      sourceType: 'TROPHY',
      discoveryKind: 'COMMON',
    });
    const repository = new InMemoryAwakenWorkshopBlueprintFeatureRepository(player, [blueprintInstance]);
    const useCase = new AwakenWorkshopBlueprintFeature(repository.asGameRepository());
    const stateKey = buildAwakenWorkshopBlueprintFeatureIntentStateKey(
      player,
      blueprintInstance.id,
      [blueprintInstance],
    );

    await expect(useCase.execute(
      player.vkId,
      blueprintInstance.id,
      'intent-awaken-1',
      stateKey,
      'payload',
    )).rejects.toMatchObject({
      code: 'workshop_blueprint_feature_unavailable',
    });

    expect(repository.awakeningRequests).toEqual([]);
  });

  it('returns the canonical replay result without spending radiance again', async () => {
    const player = createPlayer({ radiance: 0 });
    const awakenedBlueprint = createBlueprintInstance({
      modifierSnapshot: { radianceFeatureAwakened: true },
    });
    const replayedResult: AwakenWorkshopBlueprintFeatureResultView = {
      view: {
        player,
        blueprints: [],
        repairTools: [],
        craftedItems: [],
        shopOffers: [],
      },
      awakenedBlueprint,
      acquisitionSummary: {
        kind: 'awakened_workshop_blueprint_feature',
        blueprintInstanceId: awakenedBlueprint.id,
        blueprintCode: awakenedBlueprint.blueprintCode,
        title: 'Особенность пробуждена',
        changeLine: 'Пробуждение уже учтено.',
        nextStepLine: 'Можно продолжать.',
        radianceCost: workshopBlueprintFeatureAwakeningRadianceCost,
      },
      message: 'Пробуждение уже учтено.',
    };
    const repository = new InMemoryAwakenWorkshopBlueprintFeatureRepository(player, [], {
      status: 'APPLIED',
      result: replayedResult,
    });
    const useCase = new AwakenWorkshopBlueprintFeature(repository.asGameRepository());

    await expect(useCase.execute(
      player.vkId,
      awakenedBlueprint.id,
      'intent-awaken-1',
      'old-state',
      'payload',
    )).resolves.toBe(replayedResult);

    expect(repository.replayRequests).toEqual([
      {
        playerId: player.playerId,
        intentId: 'intent-awaken-1',
        expectedCommandKeys: ['AWAKEN_WORKSHOP_BLUEPRINT_FEATURE'],
        expectedStateKey: 'old-state',
      },
    ]);
    expect(repository.awakeningRequests).toEqual([]);
  });
});
