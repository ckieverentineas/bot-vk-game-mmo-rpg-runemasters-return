import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import {
  assertFreshCommandIntent,
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import {
  canCraftWorkshopBlueprint,
  getWorkshopBlueprint,
  resolveWorkshopMissingCost,
  type WorkshopBlueprintCode,
  type WorkshopRepairToolBlueprintDefinition,
} from '../../domain/workshop-catalog';
import { buildRepairWorkshopItemIntentStateKey } from '../command-intent-state';
import type { PlayerBlueprintView, PlayerCraftedItemView } from '../workshop-persistence';
import {
  buildWorkshopView,
  canRepairPlayerCraftedItem,
  type WorkshopView,
} from '../workshop-view';

export interface WorkshopRepairedItemSummaryView {
  readonly kind: 'repaired_workshop_item';
  readonly repairBlueprintCode: WorkshopBlueprintCode;
  readonly itemId: string;
  readonly title: string;
  readonly changeLine: string;
}

export interface RepairWorkshopItemResultView {
  readonly view: WorkshopView;
  readonly repairedItem: PlayerCraftedItemView;
  readonly acquisitionSummary: WorkshopRepairedItemSummaryView;
  readonly message: string;
}

type RepairWorkshopReplayResult = RepairWorkshopItemResultView | PlayerCraftedItemView;

const staleRepairMessage = 'Этот жест ремонта уже выцвел. Вернитесь к свежей Мастерской.';

const isRepairWorkshopItemResult = (
  result: RepairWorkshopReplayResult,
): result is RepairWorkshopItemResultView => 'repairedItem' in result && 'view' in result;

const getOwnedBlueprintQuantity = (
  blueprints: readonly PlayerBlueprintView[],
  blueprintCode: WorkshopBlueprintCode,
): number => (
  blueprints.find((blueprint) => blueprint.blueprintCode === blueprintCode)?.quantity ?? 0
);

const requireRepairBlueprint = (blueprintCode: WorkshopBlueprintCode): WorkshopRepairToolBlueprintDefinition => {
  const blueprint = getWorkshopBlueprint(blueprintCode);

  if (blueprint.kind !== 'repair_tool') {
    throw new AppError('workshop_blueprint_unavailable', 'Этот чертеж не подходит для ремонта.');
  }

  return blueprint;
};

const assertRepairBlueprintAvailable = (
  blueprints: readonly PlayerBlueprintView[],
  blueprintCode: WorkshopBlueprintCode,
): void => {
  if (getOwnedBlueprintQuantity(blueprints, blueprintCode) <= 0) {
    throw new AppError('workshop_blueprint_unavailable', 'У вас нет такого ремонтного чертежа.');
  }
};

const requireRepairableItem = (
  items: readonly PlayerCraftedItemView[],
  itemId: string,
  repairBlueprint: WorkshopRepairToolBlueprintDefinition,
): PlayerCraftedItemView => {
  const item = items.find((craftedItem) => craftedItem.id === itemId);

  if (!item || !canRepairPlayerCraftedItem(item, repairBlueprint)) {
    throw new AppError('workshop_item_not_repairable', 'Этот предмет нельзя отремонтировать.');
  }

  return item;
};

const assertRepairMaterialsAvailable = (
  player: PlayerState,
  repairBlueprint: WorkshopRepairToolBlueprintDefinition,
): void => {
  if (!canCraftWorkshopBlueprint(player.inventory, repairBlueprint)) {
    throw new AppError(
      'not_enough_workshop_resources',
      `Не хватает материалов для ремонта: ${JSON.stringify(resolveWorkshopMissingCost(player.inventory, repairBlueprint))}.`,
    );
  }
};

const buildRepairSummary = (
  repairBlueprintCode: WorkshopBlueprintCode,
  repairedItem: PlayerCraftedItemView,
): WorkshopRepairedItemSummaryView => ({
  kind: 'repaired_workshop_item',
  repairBlueprintCode,
  itemId: repairedItem.id,
  title: 'Предмет отремонтирован',
  changeLine: `Предмет ${repairedItem.id} восстановлен чертежом ${repairBlueprintCode}.`,
});

const buildRepairResult = (
  view: WorkshopView,
  repairBlueprintCode: WorkshopBlueprintCode,
  repairedItem: PlayerCraftedItemView,
): RepairWorkshopItemResultView => {
  const acquisitionSummary = buildRepairSummary(repairBlueprintCode, repairedItem);

  return {
    view,
    repairedItem,
    acquisitionSummary,
    message: acquisitionSummary.changeLine,
  };
};

const loadWorkshopSnapshot = async (
  repository: GameRepository,
  player: PlayerState,
): Promise<{
  readonly player: PlayerState;
  readonly blueprints: readonly PlayerBlueprintView[];
  readonly craftedItems: readonly PlayerCraftedItemView[];
}> => {
  const [blueprints, craftedItems] = await Promise.all([
    repository.listPlayerBlueprints(player.playerId),
    repository.listPlayerCraftedItems(player.playerId),
  ]);

  return { player, blueprints, craftedItems };
};

const loadCurrentWorkshopView = async (
  repository: GameRepository,
  vkId: number,
): Promise<WorkshopView> => {
  const player = await requirePlayerByVkId(repository, vkId);
  const snapshot = await loadWorkshopSnapshot(repository, player);

  return buildWorkshopView(snapshot.player, snapshot.blueprints, snapshot.craftedItems);
};

const replayRepairWorkshopItemResult = async (
  repository: GameRepository,
  player: PlayerState,
  repairBlueprintCode: WorkshopBlueprintCode,
  snapshot: {
    readonly blueprints: readonly PlayerBlueprintView[];
    readonly craftedItems: readonly PlayerCraftedItemView[];
  },
  intentId: string,
  intentStateKey: string,
): Promise<RepairWorkshopItemResultView | null> => {
  return loadCommandIntentReplay<RepairWorkshopItemResultView, RepairWorkshopReplayResult>({
    repository,
    playerId: player.playerId,
    intentId,
    expectedCommandKeys: ['REPAIR_WORKSHOP_ITEM'],
    expectedStateKey: intentStateKey,
    pendingMessage: 'Мастерская еще ремонтирует предмет. Дождитесь ответа.',
    mapResult: (result) => {
      if (isRepairWorkshopItemResult(result)) {
        return result;
      }

      const view = buildWorkshopView(player, snapshot.blueprints, snapshot.craftedItems);
      return buildRepairResult(view, repairBlueprintCode, result);
    },
  });
};

export class RepairWorkshopItem {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(
    vkId: number,
    itemId: string,
    repairBlueprintCode: WorkshopBlueprintCode,
    intentId?: string,
    stateKey?: string,
    intentSource: CommandIntentSource = 'payload',
  ): Promise<RepairWorkshopItemResultView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const resolvedIntent = resolveCommandIntent(intentId, stateKey, intentSource, false);
    if (!resolvedIntent) {
      throw new AppError('stale_command_intent', staleRepairMessage);
    }

    const snapshot = await loadWorkshopSnapshot(this.repository, player);
    const currentStateKey = buildRepairWorkshopItemIntentStateKey(
      player,
      itemId,
      repairBlueprintCode,
      snapshot.blueprints,
      snapshot.craftedItems,
    );
    const replay = await replayRepairWorkshopItemResult(
      this.repository,
      player,
      repairBlueprintCode,
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
      staleMessage: staleRepairMessage,
      requireIntent: true,
    });
    const repairBlueprint = requireRepairBlueprint(repairBlueprintCode);
    requireRepairableItem(snapshot.craftedItems, itemId, repairBlueprint);
    assertRepairBlueprintAvailable(snapshot.blueprints, repairBlueprint.code);
    assertRepairMaterialsAvailable(player, repairBlueprint);

    const repairedItem = await this.repository.repairWorkshopItem(player.playerId, itemId, repairBlueprint.code, {
      intentId: intent.intentId,
      intentStateKey: intent.intentStateKey,
      currentStateKey: intentSource === 'legacy_text' ? undefined : currentStateKey,
    });
    const view = await loadCurrentWorkshopView(this.repository, vkId);
    const result = buildRepairResult(view, repairBlueprint.code, repairedItem);

    await this.repository.storeCommandIntentResult(player.playerId, intent.intentId, result);

    return result;
  }
}
