import { Logger } from '../../../utils/logger';
import type {
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

export const trackQuestTelemetry = async (
  telemetry: GameTelemetry | undefined,
  method: QuestTelemetryMethod,
  userId: number,
  payload: QuestTelemetryPayload,
): Promise<void> => {
  if (!telemetry) {
    return;
  }

  try {
    await telemetry[method](userId, payload);
  } catch (error) {
    Logger.warn('Telemetry logging failed', error);
  }
};
