import { Logger } from '../../../utils/logger';
import type { ResourceReward } from '../../../shared/types/game';
import { sumResourceRewardShardDelta } from '../../shared/application/resource-reward-summary';
import type {
  EconomyTransactionTelemetryPayload,
  GameTelemetry,
  QuestTelemetryPayload,
} from '../../shared/application/ports/GameTelemetry';
import type {
  QuestBookView,
  QuestView,
} from './read-models/quest-book';

type QuestTelemetryMethod =
  | 'questBookOpened'
  | 'questRewardClaimed'
  | 'questRewardReplayed'
  | 'questRewardNotReady';

export const buildQuestTelemetryPayload = (
  book: QuestBookView,
  quest: QuestView | null = null,
): QuestTelemetryPayload => ({
  playerId: book.player.playerId,
  questCode: quest?.code ?? null,
  questStatus: quest?.status ?? null,
  readyToClaimCount: book.readyToClaimCount,
  claimedCount: book.claimedCount,
});

export const buildQuestRewardEconomyTelemetryPayload = (
  sourceId: string,
  reward: ResourceReward,
  playerLevel: number,
): EconomyTransactionTelemetryPayload => ({
  transactionType: 'reward_claim',
  sourceType: 'QUEST_REWARD',
  sourceId,
  resourceDustDelta: reward.gold ?? 0,
  resourceRadianceDelta: reward.radiance ?? 0,
  resourceShardsDelta: sumResourceRewardShardDelta(reward),
  runeDelta: 0,
  playerLevel,
});

export const trackQuestTelemetry = async (
  telemetry: GameTelemetry | undefined,
  method: QuestTelemetryMethod,
  userId: number,
  payload: QuestTelemetryPayload,
): Promise<void> => {
  await trackTelemetrySafely(
    telemetry,
    async (safeTelemetry) => safeTelemetry[method](userId, payload),
  );
};

export const trackEconomyTransactionTelemetry = async (
  telemetry: GameTelemetry | undefined,
  userId: number,
  payload: EconomyTransactionTelemetryPayload,
): Promise<void> => {
  await trackTelemetrySafely(
    telemetry,
    async (safeTelemetry) => safeTelemetry.economyTransactionCommitted(userId, payload),
  );
};

const trackTelemetrySafely = async (
  telemetry: GameTelemetry | undefined,
  track: (telemetry: GameTelemetry) => Promise<void>,
): Promise<void> => {
  if (!telemetry) {
    return;
  }

  try {
    await track(telemetry);
  } catch (error) {
    Logger.warn('Telemetry logging failed', error);
  }
};
