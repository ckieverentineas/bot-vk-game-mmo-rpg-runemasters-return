import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import {
  assertFreshCommandIntent,
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import type {
  CommandIntentReplayRepository,
  FindPlayerByVkIdRepository,
} from '../../../shared/application/ports/repository-scopes';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import {
  canBuyWorkshopShopOffer,
  getWorkshopShopOffer,
  resolveWorkshopShopOfferMissingDust,
  type WorkshopShopOfferCode,
  type WorkshopShopOfferDefinition,
} from '../../domain/workshop-shop';
import { buildBuyWorkshopShopOfferIntentStateKey } from '../command-intent-state';
import {
  buildWorkshopShopPurchaseEconomyTelemetryPayload,
  trackWorkshopEconomyTelemetry,
} from '../workshop-economy-telemetry';
import { buildWorkshopView, type WorkshopView } from '../workshop-view';

export interface WorkshopShopPurchaseSummaryView {
  readonly kind: 'workshop_shop_purchase';
  readonly offerCode: WorkshopShopOfferCode;
  readonly title: string;
  readonly changeLine: string;
  readonly nextStepLine: string;
}

export interface BuyWorkshopShopOfferResultView {
  readonly view: WorkshopView;
  readonly acquisitionSummary: WorkshopShopPurchaseSummaryView;
  readonly message: string;
}

type BuyWorkshopShopOfferReplayResult = BuyWorkshopShopOfferResultView | PlayerState;
type BuyWorkshopShopOfferRepository = CommandIntentReplayRepository
  & FindPlayerByVkIdRepository
  & Pick<
    GameRepository,
    | 'listPlayerBlueprintInstances'
    | 'listPlayerCraftedItems'
    | 'purchaseWorkshopShopOffer'
    | 'storeCommandIntentResult'
  >;

const stalePurchaseMessage = 'Эта покупка уже выцвела. Вернитесь к свежей Мастерской.';
const pendingPurchaseMessage = 'Лавка ещё считает пыль. Дождитесь ответа.';

const isBuyWorkshopShopOfferResult = (
  result: BuyWorkshopShopOfferReplayResult,
): result is BuyWorkshopShopOfferResultView => 'view' in result && 'acquisitionSummary' in result;

const buildShopPurchaseSummary = (
  offer: WorkshopShopOfferDefinition,
): WorkshopShopPurchaseSummaryView => ({
  kind: 'workshop_shop_purchase',
  offerCode: offer.code,
  title: `Лавка мастерской: ${offer.title}`,
  changeLine: `Куплено: ${offer.title}. Потрачено: ${offer.priceDust} пыли.`,
  nextStepLine: 'Покупка сразу попала в сумку и готова к применению.',
});

const buildShopPurchaseResult = (
  view: WorkshopView,
  offer: WorkshopShopOfferDefinition,
): BuyWorkshopShopOfferResultView => {
  const acquisitionSummary = buildShopPurchaseSummary(offer);

  return {
    view,
    acquisitionSummary,
    message: acquisitionSummary.changeLine,
  };
};

const loadWorkshopViewForPlayer = async (
  repository: Pick<GameRepository, 'listPlayerBlueprintInstances' | 'listPlayerCraftedItems'>,
  player: PlayerState,
): Promise<WorkshopView> => {
  const [blueprintInstances, craftedItems] = await Promise.all([
    repository.listPlayerBlueprintInstances(player.playerId),
    repository.listPlayerCraftedItems(player.playerId),
  ]);

  return buildWorkshopView(player, blueprintInstances, craftedItems);
};

const replayBuyWorkshopShopOfferResult = async (
  repository: CommandIntentReplayRepository & Pick<GameRepository, 'listPlayerBlueprintInstances' | 'listPlayerCraftedItems'>,
  player: PlayerState,
  offer: WorkshopShopOfferDefinition,
  intentId: string,
  intentStateKey: string,
): Promise<BuyWorkshopShopOfferResultView | null> => {
  return loadCommandIntentReplay<BuyWorkshopShopOfferResultView, BuyWorkshopShopOfferReplayResult>({
    repository,
    playerId: player.playerId,
    intentId,
    expectedCommandKeys: ['BUY_WORKSHOP_SHOP_OFFER'],
    expectedStateKey: intentStateKey,
    pendingMessage: pendingPurchaseMessage,
    mapResult: async (result) => {
      if (isBuyWorkshopShopOfferResult(result)) {
        return result;
      }

      const view = await loadWorkshopViewForPlayer(repository, result);
      return buildShopPurchaseResult(view, offer);
    },
  });
};

export class BuyWorkshopShopOffer {
  public constructor(
    private readonly repository: BuyWorkshopShopOfferRepository,
    private readonly telemetry?: GameTelemetry,
  ) {}

  public async execute(
    vkId: number,
    offerCode: WorkshopShopOfferCode,
    intentId?: string,
    stateKey?: string,
    intentSource: CommandIntentSource = 'payload',
  ): Promise<BuyWorkshopShopOfferResultView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const offer = getWorkshopShopOffer(offerCode);
    const resolvedIntent = resolveCommandIntent(intentId, stateKey, intentSource, false);
    if (!resolvedIntent) {
      throw new AppError('stale_command_intent', stalePurchaseMessage);
    }

    const currentStateKey = buildBuyWorkshopShopOfferIntentStateKey(player, offer.code);
    const replay = await replayBuyWorkshopShopOfferResult(
      this.repository,
      player,
      offer,
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
      staleMessage: stalePurchaseMessage,
      requireIntent: true,
    });

    if (!canBuyWorkshopShopOffer(player, offer)) {
      throw new AppError(
        'not_enough_dust',
        `Для покупки не хватает пыли: ${resolveWorkshopShopOfferMissingDust(player, offer)}.`,
      );
    }

    const updatedPlayer = await this.repository.purchaseWorkshopShopOffer(
      player.playerId,
      offer.priceDust,
      offer.inventoryDelta,
      {
        intentId: intent.intentId,
        intentStateKey: intent.intentStateKey,
        currentStateKey: intentSource === 'legacy_text' ? undefined : currentStateKey,
      },
    );
    const view = await loadWorkshopViewForPlayer(this.repository, updatedPlayer);
    const result = buildShopPurchaseResult(view, offer);

    await this.repository.storeCommandIntentResult(player.playerId, intent.intentId, result);
    await trackWorkshopEconomyTelemetry(
      this.telemetry,
      updatedPlayer.userId,
      buildWorkshopShopPurchaseEconomyTelemetryPayload(offer, updatedPlayer.level),
    );

    return result;
  }
}
