import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import {
  canCraftWorkshopBlueprint,
  getWorkshopBlueprint,
  resolveWorkshopMissingCost,
  type WorkshopBlueprintCode,
  type WorkshopCraftItemBlueprintDefinition,
} from '../../domain/workshop-catalog';
import { buildCraftWorkshopItemIntentStateKey } from '../command-intent-state';
import type { PlayerBlueprintView, PlayerCraftedItemView } from '../workshop-persistence';
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

const staleCraftMessage = 'Этот жест мастерской уже выцвел. Вернитесь к свежей Мастерской.';

const isCraftWorkshopItemResult = (
  result: CraftWorkshopReplayResult,
): result is CraftWorkshopItemResultView => 'craftedItem' in result && 'view' in result;

const getOwnedBlueprintQuantity = (
  blueprints: readonly PlayerBlueprintView[],
  blueprintCode: WorkshopBlueprintCode,
): number => (
  blueprints.find((blueprint) => blueprint.blueprintCode === blueprintCode)?.quantity ?? 0
);

const requireCraftBlueprint = (blueprintCode: WorkshopBlueprintCode): WorkshopCraftItemBlueprintDefinition => {
  const blueprint = getWorkshopBlueprint(blueprintCode);

  if (blueprint.kind !== 'craft_item') {
    throw new AppError('workshop_blueprint_unavailable', 'Этот чертеж не создает предмет мастерской.');
  }

  return blueprint;
};

const assertFreshIntent = (
  intentStateKey: string,
  currentStateKey: string,
  intentSource: CommandIntentSource,
): void => {
  if (intentSource === 'legacy_text') {
    return;
  }

  if (intentStateKey !== currentStateKey) {
    throw new AppError('stale_command_intent', staleCraftMessage);
  }
};

const assertBlueprintAvailable = (
  blueprints: readonly PlayerBlueprintView[],
  blueprintCode: WorkshopBlueprintCode,
): void => {
  if (getOwnedBlueprintQuantity(blueprints, blueprintCode) <= 0) {
    throw new AppError('workshop_blueprint_unavailable', 'У вас нет такого одноразового чертежа.');
  }
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

const replayCraftWorkshopItemResult = async (
  repository: GameRepository,
  player: PlayerState,
  blueprintCode: WorkshopBlueprintCode,
  snapshot: {
    readonly blueprints: readonly PlayerBlueprintView[];
    readonly craftedItems: readonly PlayerCraftedItemView[];
  },
  intentId: string,
  intentStateKey: string,
): Promise<CraftWorkshopItemResultView | null> => {
  const replay = await repository.getCommandIntentResult<CraftWorkshopReplayResult>(
    player.playerId,
    intentId,
    ['CRAFT_WORKSHOP_ITEM'],
    intentStateKey,
  );

  if (replay?.status === 'PENDING') {
    throw new AppError('command_retry_pending', 'Мастерская еще создает предмет. Дождитесь ответа.');
  }

  if (replay?.status !== 'APPLIED' || !replay.result) {
    return null;
  }

  if (isCraftWorkshopItemResult(replay.result)) {
    return replay.result;
  }

  const view = buildWorkshopView(player, snapshot.blueprints, snapshot.craftedItems);
  return buildCraftResult(view, blueprintCode, replay.result);
};

export class CraftWorkshopItem {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(
    vkId: number,
    blueprintCode: WorkshopBlueprintCode,
    intentId?: string,
    stateKey?: string,
    intentSource: CommandIntentSource = 'payload',
  ): Promise<CraftWorkshopItemResultView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const intent = resolveCommandIntent(intentId, stateKey, intentSource, false);

    if (!intent) {
      throw new AppError('stale_command_intent', staleCraftMessage);
    }

    const snapshot = await loadWorkshopSnapshot(this.repository, player);
    const currentStateKey = buildCraftWorkshopItemIntentStateKey(
      player,
      blueprintCode,
      snapshot.blueprints,
      snapshot.craftedItems,
    );
    const replay = await replayCraftWorkshopItemResult(
      this.repository,
      player,
      blueprintCode,
      snapshot,
      intent.intentId,
      intent.intentStateKey,
    );
    if (replay) {
      return replay;
    }

    assertFreshIntent(intent.intentStateKey, currentStateKey, intentSource);
    const blueprint = requireCraftBlueprint(blueprintCode);
    assertBlueprintAvailable(snapshot.blueprints, blueprint.code);
    assertCraftMaterialsAvailable(player, blueprint);

    const craftedItem = await this.repository.craftWorkshopItem(player.playerId, blueprint.code, {
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
