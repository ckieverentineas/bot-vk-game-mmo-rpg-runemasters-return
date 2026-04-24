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
import { canEquipWorkshopItem, type WorkshopItemView } from '../../domain/workshop-catalog';
import { buildEquipWorkshopItemIntentStateKey } from '../command-intent-state';
import type { PlayerBlueprintView, PlayerCraftedItemView } from '../workshop-persistence';
import { buildWorkshopView, type WorkshopView } from '../workshop-view';

export interface WorkshopEquippedItemSummaryView {
  readonly kind: 'equipped_workshop_item';
  readonly itemId: string;
  readonly title: string;
  readonly changeLine: string;
}

export interface EquipWorkshopItemResultView {
  readonly view: WorkshopView;
  readonly equippedItem: PlayerCraftedItemView;
  readonly acquisitionSummary: WorkshopEquippedItemSummaryView;
  readonly message: string;
}

type EquipWorkshopReplayResult = EquipWorkshopItemResultView | PlayerCraftedItemView;

const staleEquipMessage = 'Этот жест мастерской уже выцвел. Вернитесь к свежей Мастерской.';

const isEquipWorkshopItemResult = (
  result: EquipWorkshopReplayResult,
): result is EquipWorkshopItemResultView => 'equippedItem' in result && 'view' in result;

const toWorkshopItemView = (item: PlayerCraftedItemView): WorkshopItemView => ({
  code: item.itemCode,
  itemClass: item.itemClass,
  slot: item.slot,
  status: item.status,
  durability: item.durability,
  maxDurability: item.maxDurability,
});

const assertPlayerCanChangeEquipment = (player: Pick<PlayerState, 'activeBattleId'>): void => {
  if (player.activeBattleId) {
    throw new AppError('workshop_equipment_locked_in_battle', 'Экипировку мастерской нельзя менять во время боя.');
  }
};

const requireEquippableItem = (
  items: readonly PlayerCraftedItemView[],
  itemId: string,
): PlayerCraftedItemView => {
  const item = items.find((craftedItem) => craftedItem.id === itemId);

  if (!item || !canEquipWorkshopItem(toWorkshopItemView(item))) {
    throw new AppError('workshop_item_not_equippable', 'Этот предмет нельзя экипировать.');
  }

  return item;
};

const buildEquipSummary = (item: PlayerCraftedItemView): WorkshopEquippedItemSummaryView => ({
  kind: 'equipped_workshop_item',
  itemId: item.id,
  title: 'Предмет экипирован',
  changeLine: `Предмет ${item.id} теперь надет в слот ${item.slot}.`,
});

const buildEquipResult = (
  view: WorkshopView,
  equippedItem: PlayerCraftedItemView,
): EquipWorkshopItemResultView => {
  const acquisitionSummary = buildEquipSummary(equippedItem);

  return {
    view,
    equippedItem,
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

export class EquipWorkshopItem {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(
    vkId: number,
    itemId: string,
    intentId?: string,
    stateKey?: string,
    intentSource: CommandIntentSource = 'payload',
  ): Promise<EquipWorkshopItemResultView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const resolvedIntent = resolveCommandIntent(intentId, stateKey, intentSource, false);

    const snapshot = await loadWorkshopSnapshot(this.repository, player);
    const currentStateKey = buildEquipWorkshopItemIntentStateKey(player, itemId, snapshot.craftedItems);
    const replay = await loadCommandIntentReplay<EquipWorkshopItemResultView, EquipWorkshopReplayResult>({
      repository: this.repository,
      playerId: player.playerId,
      intentId: resolvedIntent?.intentId,
      expectedCommandKeys: ['EQUIP_WORKSHOP_ITEM'],
      expectedStateKey: resolvedIntent?.intentStateKey,
      pendingMessage: 'Мастерская еще меняет экипировку. Дождитесь ответа.',
      mapResult: (result) => (
        isEquipWorkshopItemResult(result)
          ? result
          : buildEquipResult(buildWorkshopView(player, snapshot.blueprints, snapshot.craftedItems), result)
      ),
    });
    if (replay) {
      return replay;
    }

    const intent = assertFreshCommandIntent({
      intent: resolvedIntent,
      intentSource,
      currentStateKey,
      staleMessage: staleEquipMessage,
      requireIntent: true,
    });
    assertPlayerCanChangeEquipment(player);
    requireEquippableItem(snapshot.craftedItems, itemId);

    const equippedItem = await this.repository.equipWorkshopItem(player.playerId, itemId, {
      intentId: intent.intentId,
      intentStateKey: intent.intentStateKey,
      currentStateKey: intentSource === 'legacy_text' ? undefined : currentStateKey,
    });
    const view = await loadCurrentWorkshopView(this.repository, vkId);
    const result = buildEquipResult(view, equippedItem);

    await this.repository.storeCommandIntentResult(player.playerId, intent.intentId, result);

    return result;
  }
}
