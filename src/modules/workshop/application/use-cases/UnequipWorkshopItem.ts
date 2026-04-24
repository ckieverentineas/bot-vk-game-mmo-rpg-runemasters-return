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
import { buildUnequipWorkshopItemIntentStateKey } from '../command-intent-state';
import type { PlayerBlueprintView, PlayerCraftedItemView } from '../workshop-persistence';
import { buildWorkshopView, type WorkshopView } from '../workshop-view';

export interface WorkshopUnequippedItemSummaryView {
  readonly kind: 'unequipped_workshop_item';
  readonly itemId: string;
  readonly title: string;
  readonly changeLine: string;
}

export interface UnequipWorkshopItemResultView {
  readonly view: WorkshopView;
  readonly unequippedItem: PlayerCraftedItemView;
  readonly acquisitionSummary: WorkshopUnequippedItemSummaryView;
  readonly message: string;
}

type UnequipWorkshopReplayResult = UnequipWorkshopItemResultView | PlayerCraftedItemView;

const staleUnequipMessage = 'Этот жест мастерской уже выцвел. Вернитесь к свежей Мастерской.';

const isUnequipWorkshopItemResult = (
  result: UnequipWorkshopReplayResult,
): result is UnequipWorkshopItemResultView => 'unequippedItem' in result && 'view' in result;

const assertPlayerCanChangeEquipment = (player: Pick<PlayerState, 'activeBattleId'>): void => {
  if (player.activeBattleId) {
    throw new AppError('workshop_equipment_locked_in_battle', 'Экипировку мастерской нельзя менять во время боя.');
  }
};

const requireOwnedItem = (
  items: readonly PlayerCraftedItemView[],
  itemId: string,
): PlayerCraftedItemView => {
  const item = items.find((craftedItem) => craftedItem.id === itemId);

  if (!item) {
    throw new AppError('workshop_item_not_found', 'Предмет мастерской уже не найден.');
  }

  return item;
};

const buildUnequipSummary = (item: PlayerCraftedItemView): WorkshopUnequippedItemSummaryView => ({
  kind: 'unequipped_workshop_item',
  itemId: item.id,
  title: 'Предмет снят',
  changeLine: `Предмет ${item.id} снят со слота ${item.slot}.`,
});

const buildUnequipResult = (
  view: WorkshopView,
  unequippedItem: PlayerCraftedItemView,
): UnequipWorkshopItemResultView => {
  const acquisitionSummary = buildUnequipSummary(unequippedItem);

  return {
    view,
    unequippedItem,
    acquisitionSummary,
    message: acquisitionSummary.changeLine,
  };
};

const loadWorkshopSnapshot = async (
  repository: GameRepository,
  player: PlayerState,
): Promise<{
  readonly blueprints: readonly PlayerBlueprintView[];
  readonly craftedItems: readonly PlayerCraftedItemView[];
}> => {
  const [blueprints, craftedItems] = await Promise.all([
    repository.listPlayerBlueprints(player.playerId),
    repository.listPlayerCraftedItems(player.playerId),
  ]);

  return { blueprints, craftedItems };
};

const loadCurrentWorkshopView = async (
  repository: GameRepository,
  vkId: number,
): Promise<WorkshopView> => {
  const player = await requirePlayerByVkId(repository, vkId);
  const snapshot = await loadWorkshopSnapshot(repository, player);

  return buildWorkshopView(player, snapshot.blueprints, snapshot.craftedItems);
};

export class UnequipWorkshopItem {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(
    vkId: number,
    itemId: string,
    intentId?: string,
    stateKey?: string,
    intentSource: CommandIntentSource = 'payload',
  ): Promise<UnequipWorkshopItemResultView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const resolvedIntent = resolveCommandIntent(intentId, stateKey, intentSource, false);

    const snapshot = await loadWorkshopSnapshot(this.repository, player);
    const currentStateKey = buildUnequipWorkshopItemIntentStateKey(player, itemId, snapshot.craftedItems);
    const replay = await loadCommandIntentReplay<UnequipWorkshopItemResultView, UnequipWorkshopReplayResult>({
      repository: this.repository,
      playerId: player.playerId,
      intentId: resolvedIntent?.intentId,
      expectedCommandKeys: ['UNEQUIP_WORKSHOP_ITEM'],
      expectedStateKey: resolvedIntent?.intentStateKey,
      pendingMessage: 'Мастерская еще меняет экипировку. Дождитесь ответа.',
      mapResult: (result) => (
        isUnequipWorkshopItemResult(result)
          ? result
          : buildUnequipResult(buildWorkshopView(player, snapshot.blueprints, snapshot.craftedItems), result)
      ),
    });
    if (replay) {
      return replay;
    }

    const intent = assertFreshCommandIntent({
      intent: resolvedIntent,
      intentSource,
      currentStateKey,
      staleMessage: staleUnequipMessage,
      requireIntent: true,
    });
    assertPlayerCanChangeEquipment(player);
    requireOwnedItem(snapshot.craftedItems, itemId);

    const unequippedItem = await this.repository.unequipWorkshopItem(player.playerId, itemId, {
      intentId: intent.intentId,
      intentStateKey: intent.intentStateKey,
      currentStateKey: intentSource === 'legacy_text' ? undefined : currentStateKey,
    });
    const view = await loadCurrentWorkshopView(this.repository, vkId);
    const result = buildUnequipResult(view, unequippedItem);

    await this.repository.storeCommandIntentResult(player.playerId, intent.intentId, result);

    return result;
  }
}
