import { Logger } from '../../../utils/logger';
import type {
  EconomyTransactionTelemetryPayload,
  GameTelemetry,
} from '../../shared/application/ports/GameTelemetry';
import type { WorkshopCraftItemBlueprintDefinition } from '../domain/workshop-catalog';
import type { WorkshopShopOfferDefinition } from '../domain/workshop-shop';

export const buildWorkshopShopPurchaseEconomyTelemetryPayload = (
  offer: Pick<WorkshopShopOfferDefinition, 'code' | 'priceDust'>,
  playerLevel: number,
): EconomyTransactionTelemetryPayload => ({
  transactionType: 'dust_spent',
  sourceType: 'WORKSHOP_SHOP',
  sourceId: offer.code,
  resourceDustDelta: -offer.priceDust,
  resourceRadianceDelta: 0,
  resourceShardsDelta: 0,
  runeDelta: 0,
  playerLevel,
});

export const buildWorkshopCraftEconomyTelemetryPayload = (
  blueprint: Pick<WorkshopCraftItemBlueprintDefinition, 'code' | 'dustCost'>,
  playerLevel: number,
): EconomyTransactionTelemetryPayload => ({
  transactionType: 'dust_spent',
  sourceType: 'WORKSHOP_CRAFT',
  sourceId: blueprint.code,
  resourceDustDelta: -blueprint.dustCost,
  resourceRadianceDelta: 0,
  resourceShardsDelta: 0,
  runeDelta: 0,
  playerLevel,
});

export const buildWorkshopBlueprintFeatureAwakeningEconomyTelemetryPayload = (
  blueprint: Pick<WorkshopCraftItemBlueprintDefinition, 'code'>,
  radianceCost: number,
  playerLevel: number,
): EconomyTransactionTelemetryPayload => ({
  transactionType: 'radiance_spent',
  sourceType: 'WORKSHOP_BLUEPRINT_FEATURE',
  sourceId: blueprint.code,
  resourceDustDelta: 0,
  resourceRadianceDelta: -radianceCost,
  resourceShardsDelta: 0,
  runeDelta: 0,
  playerLevel,
});

export const trackWorkshopEconomyTelemetry = async (
  telemetry: GameTelemetry | undefined,
  userId: number,
  payload: EconomyTransactionTelemetryPayload,
): Promise<void> => {
  if (!telemetry) {
    return;
  }

  try {
    await telemetry.economyTransactionCommitted(userId, payload);
  } catch (error) {
    Logger.warn('Telemetry logging failed', error);
  }
};
