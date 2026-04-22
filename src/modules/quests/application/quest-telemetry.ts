import { Logger } from '../../../utils/logger';
import type { ResourceReward, ShardField } from '../../../shared/types/game';
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

const shardInventoryFields: readonly ShardField[] = [
  'usualShards',
  'unusualShards',
  'rareShards',
  'epicShards',
  'legendaryShards',
  'mythicalShards',
];

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
  resourceShardsDelta: sumShardDelta(reward),
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

const sumShardDelta = (reward: ResourceReward): number => {
  const inventoryDelta = reward.inventoryDelta;
  if (!inventoryDelta) {
    return 0;
  }

  return shardInventoryFields.reduce(
    (total, field) => total + (inventoryDelta[field] ?? 0),
    0,
  );
};
