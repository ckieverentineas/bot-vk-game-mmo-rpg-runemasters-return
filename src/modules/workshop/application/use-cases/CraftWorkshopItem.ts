import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import {
  assertFreshCommandIntent,
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type {
  CommandIntentReplayRepository,
  FindPlayerByVkIdRepository,
} from '../../../shared/application/ports/repository-scopes';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import {
  canCraftWorkshopBlueprint,
  getWorkshopBlueprint,
  isWorkshopBlueprintCode,
  resolveWorkshopMissingCost,
  type WorkshopBlueprintCode,
  type WorkshopCraftItemBlueprintDefinition,
} from '../../domain/workshop-catalog';
import { buildCraftWorkshopItemIntentStateKey } from '../command-intent-state';
import type { PlayerBlueprintInstanceView, PlayerCraftedItemView } from '../workshop-persistence';
import { buildWorkshopView, type WorkshopView } from '../workshop-view';

export interface WorkshopCraftedItemSummaryView {
  readonly kind: 'crafted_workshop_item';
  readonly blueprintCode: WorkshopBlueprintCode;
  readonly itemId: string;
  readonly title: string;
  readonly changeLine: string;
}

export interface CraftWorkshopItemResultView {
  readonly view: WorkshopView;
  readonly craftedItem: PlayerCraftedItemView;
  readonly acquisitionSummary: WorkshopCraftedItemSummaryView;
  readonly message: string;
}

type CraftWorkshopReplayResult = CraftWorkshopItemResultView | PlayerCraftedItemView;
type WorkshopSnapshotRepository = Pick<GameRepository, 'listPlayerBlueprintInstances' | 'listPlayerCraftedItems'>;
type WorkshopCurrentViewRepository = FindPlayerByVkIdRepository & WorkshopSnapshotRepository;
type CraftWorkshopItemRepository = CommandIntentReplayRepository
  & WorkshopCurrentViewRepository
  & Pick<GameRepository, 'craftWorkshopItem' | 'storeCommandIntentResult'>;

const staleCraftMessage = 'Этот жест мастерской уже выцвел. Вернитесь к свежей Мастерской.';

const isCraftWorkshopItemResult = (
  result: CraftWorkshopReplayResult,
): result is CraftWorkshopItemResultView => 'craftedItem' in result && 'view' in result;

const requireCraftBlueprint = (blueprintCode: WorkshopBlueprintCode): WorkshopCraftItemBlueprintDefinition => {
  const blueprint = getWorkshopBlueprint(blueprintCode);

  if (blueprint.kind !== 'craft_item') {
    throw new AppError('workshop_blueprint_unavailable', 'Этот чертеж не создает предмет мастерской.');
  }

  return blueprint;
};

const requireAvailableBlueprintInstance = (
  blueprintInstances: readonly PlayerBlueprintInstanceView[],
  blueprintInstanceId: string,
): PlayerBlueprintInstanceView => {
  const instance = blueprintInstances.find((entry) => entry.id === blueprintInstanceId);

  if (!instance || instance.status !== 'AVAILABLE') {
    throw new AppError('workshop_blueprint_unavailable', 'У вас нет такого одноразового чертежа.');
  }

  return instance;
};

const assertCraftMaterialsAvailable = (
  player: PlayerState,
  blueprint: WorkshopCraftItemBlueprintDefinition,
): void => {
  if (!canCraftWorkshopBlueprint(player.inventory, blueprint)) {
    throw new AppError(
      'not_enough_workshop_resources',
      `Не хватает материалов для мастерской: ${JSON.stringify(resolveWorkshopMissingCost(player.inventory, blueprint))}.`,
    );
  }
};

const buildCraftSummary = (
  blueprintCode: WorkshopBlueprintCode,
  item: PlayerCraftedItemView,
): WorkshopCraftedItemSummaryView => ({
  kind: 'crafted_workshop_item',
  blueprintCode,
  itemId: item.id,
  title: 'Предмет создан',
  changeLine: `Создан предмет ${item.itemCode} по чертежу ${blueprintCode}.`,
});

const buildCraftResult = (
  view: WorkshopView,
  blueprintCode: WorkshopBlueprintCode,
  craftedItem: PlayerCraftedItemView,
): CraftWorkshopItemResultView => {
  const acquisitionSummary = buildCraftSummary(blueprintCode, craftedItem);

  return {
    view,
    craftedItem,
    acquisitionSummary,
    message: acquisitionSummary.changeLine,
  };
};

const loadWorkshopSnapshot = async (
  repository: WorkshopSnapshotRepository,
  player: PlayerState,
): Promise<{
  readonly player: PlayerState;
  readonly blueprintInstances: readonly PlayerBlueprintInstanceView[];
  readonly craftedItems: readonly PlayerCraftedItemView[];
}> => {
  const [blueprintInstances, craftedItems] = await Promise.all([
    repository.listPlayerBlueprintInstances(player.playerId),
    repository.listPlayerCraftedItems(player.playerId),
  ]);

  return { player, blueprintInstances, craftedItems };
};

const loadCurrentWorkshopView = async (
  repository: WorkshopCurrentViewRepository,
  vkId: number,
): Promise<WorkshopView> => {
  const player = await requirePlayerByVkId(repository, vkId);
  const snapshot = await loadWorkshopSnapshot(repository, player);

  return buildWorkshopView(snapshot.player, snapshot.blueprintInstances, snapshot.craftedItems);
};

const resolveReplayBlueprintCode = (
  blueprintInstanceId: string,
  blueprintInstances: readonly PlayerBlueprintInstanceView[],
  item: PlayerCraftedItemView,
): WorkshopBlueprintCode => {
  const instance = blueprintInstances.find((entry) => entry.id === blueprintInstanceId);
  if (instance) {
    return instance.blueprintCode;
  }

  if (isWorkshopBlueprintCode(item.itemCode)) {
    return item.itemCode;
  }

  throw new AppError('workshop_blueprint_unavailable', 'Чертёж для повтора больше не найден.');
};

const replayCraftWorkshopItemResult = async (
  repository: CommandIntentReplayRepository,
  player: PlayerState,
  blueprintInstanceId: string,
  snapshot: {
    readonly blueprintInstances: readonly PlayerBlueprintInstanceView[];
    readonly craftedItems: readonly PlayerCraftedItemView[];
  },
  intentId: string,
  intentStateKey: string,
): Promise<CraftWorkshopItemResultView | null> => {
  return loadCommandIntentReplay<CraftWorkshopItemResultView, CraftWorkshopReplayResult>({
    repository,
    playerId: player.playerId,
    intentId,
    expectedCommandKeys: ['CRAFT_WORKSHOP_ITEM'],
    expectedStateKey: intentStateKey,
    pendingMessage: 'Мастерская еще создает предмет. Дождитесь ответа.',
    mapResult: (result) => {
      if (isCraftWorkshopItemResult(result)) {
        return result;
      }

      const blueprintCode = resolveReplayBlueprintCode(blueprintInstanceId, snapshot.blueprintInstances, result);
      const view = buildWorkshopView(player, snapshot.blueprintInstances, snapshot.craftedItems);
      return buildCraftResult(view, blueprintCode, result);
    },
  });
};

export class CraftWorkshopItem {
  public constructor(private readonly repository: CraftWorkshopItemRepository) {}

  public async execute(
    vkId: number,
    blueprintInstanceId: string,
    intentId?: string,
    stateKey?: string,
    intentSource: CommandIntentSource = 'payload',
  ): Promise<CraftWorkshopItemResultView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const resolvedIntent = resolveCommandIntent(intentId, stateKey, intentSource, false);
    if (!resolvedIntent) {
      throw new AppError('stale_command_intent', staleCraftMessage);
    }

    const snapshot = await loadWorkshopSnapshot(this.repository, player);
    const currentStateKey = buildCraftWorkshopItemIntentStateKey(
      player,
      blueprintInstanceId,
      snapshot.blueprintInstances,
      snapshot.craftedItems,
    );
    const replay = await replayCraftWorkshopItemResult(
      this.repository,
      player,
      blueprintInstanceId,
      snapshot,
      resolvedIntent.intentId,
      resolvedIntent.intentStateKey,
    );
    if (replay) {
      return replay;
    }

    const intent = assertFreshCommandIntent({
      intent: resolvedIntent,
      intentSource,
      currentStateKey,
      staleMessage: staleCraftMessage,
      requireIntent: true,
    });
    const blueprintInstance = requireAvailableBlueprintInstance(snapshot.blueprintInstances, blueprintInstanceId);
    const blueprint = requireCraftBlueprint(blueprintInstance.blueprintCode);
    assertCraftMaterialsAvailable(player, blueprint);

    const craftedItem = await this.repository.craftWorkshopItem(player.playerId, blueprintInstance.id, {
      intentId: intent.intentId,
      intentStateKey: intent.intentStateKey,
      currentStateKey: intentSource === 'legacy_text' ? undefined : currentStateKey,
    });
    const view = await loadCurrentWorkshopView(this.repository, vkId);
    const result = buildCraftResult(view, blueprint.code, craftedItem);

    await this.repository.storeCommandIntentResult(player.playerId, intent.intentId, result);

    return result;
  }
}
