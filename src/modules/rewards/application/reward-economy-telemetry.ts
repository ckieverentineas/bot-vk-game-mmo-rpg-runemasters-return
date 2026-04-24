import { Logger } from '../../../utils/logger';
import type { ResourceReward } from '../../../shared/types/game';
import { sumResourceRewardShardDelta } from '../../shared/application/resource-reward-summary';
import type {
  EconomyTransactionSourceType,
  EconomyTransactionTelemetryPayload,
  GameTelemetry,
} from '../../shared/application/ports/GameTelemetry';

export interface RewardEconomyTelemetryInput {
  readonly sourceType: EconomyTransactionSourceType;
  readonly sourceId: string;
  readonly reward: ResourceReward;
  readonly playerLevel: number;
}

export interface ClaimedRewardEconomyTelemetryInput extends RewardEconomyTelemetryInput {
  readonly claimed: boolean;
}

export const buildRewardEconomyTelemetryPayload = (
  input: RewardEconomyTelemetryInput,
): EconomyTransactionTelemetryPayload => ({
  transactionType: 'reward_claim',
  sourceType: input.sourceType,
  sourceId: input.sourceId,
  resourceDustDelta: input.reward.gold ?? 0,
  resourceRadianceDelta: input.reward.radiance ?? 0,
  resourceShardsDelta: sumResourceRewardShardDelta(input.reward),
  runeDelta: 0,
  playerLevel: input.playerLevel,
});

export const trackRewardEconomyTelemetry = async (
  telemetry: GameTelemetry | undefined,
  userId: number,
  input: ClaimedRewardEconomyTelemetryInput,
): Promise<void> => {
  if (!input.claimed || !telemetry) {
    return;
  }

  try {
    await telemetry.economyTransactionCommitted(
      userId,
      buildRewardEconomyTelemetryPayload(input),
    );
  } catch (error) {
    Logger.warn('Telemetry logging failed', error);
  }
};
