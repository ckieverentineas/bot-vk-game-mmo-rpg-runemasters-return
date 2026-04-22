import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { resolveAdaptiveAdventureLocationLevel } from '../../../player/domain/player-stats';
import {
  resolveCommandIntent,
  type CommandIntentSource,
  type ResolvedCommandIntent,
} from '../../../shared/application/command-intent';
import type {
  ExplorationCommandIntentKey,
  GameRepository,
  SaveExplorationOptions,
} from '../../../shared/application/ports/GameRepository';

export interface TutorialRouteReplayResult {
  readonly player: PlayerState;
  readonly replayed: true;
}

type TutorialRouteState = Pick<
  PlayerState,
  'locationLevel' | 'highestLocationLevel' | 'tutorialState' | 'victoryStreak' | 'defeatStreak'
>;

const tutorialRoutePendingMessage = 'Прошлый жест ещё в пути. Дождитесь ответа.';
const tutorialRouteStaleMessage = 'Этот след уже выцвел. Вернитесь к свежей развилке.';
const tutorialRouteBattleInProgressMessage = 'Сначала завершите текущий бой, потом меняйте путь приключения.';

export const loadTutorialRouteReplayResult = async (
  repository: GameRepository,
  player: PlayerState,
  intentId?: string,
): Promise<TutorialRouteReplayResult | null> => {
  if (!intentId) {
    return null;
  }

  const replay = await repository.getCommandIntentResult(player.playerId, intentId);

  if (replay?.status === 'APPLIED' && replay.result) {
    return {
      player: replay.result,
      replayed: true,
    };
  }

  if (replay?.status === 'PENDING') {
    throw new AppError('command_retry_pending', tutorialRoutePendingMessage);
  }

  return null;
};

export const assertNoActiveTutorialRouteBattle = (player: PlayerState): void => {
  if (player.activeBattleId) {
    throw new AppError('battle_in_progress', tutorialRouteBattleInProgressMessage);
  }
};

export const resolveTutorialRouteSaveIntent = (
  intentId: string | undefined,
  intentStateKey: string | undefined,
  intentSource: CommandIntentSource,
  currentStateKey: string,
): ResolvedCommandIntent | null => {
  const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);

  if (intentSource !== 'legacy_text' && intent && intent.intentStateKey !== currentStateKey) {
    throw new AppError('stale_command_intent', tutorialRouteStaleMessage);
  }

  return intent;
};

export const buildTutorialRouteExplorationState = (player: PlayerState): TutorialRouteState => ({
  locationLevel: resolveAdaptiveAdventureLocationLevel(player),
  highestLocationLevel: player.highestLocationLevel,
  tutorialState: player.tutorialState === 'ACTIVE' ? 'SKIPPED' : player.tutorialState,
  victoryStreak: player.victoryStreak,
  defeatStreak: player.defeatStreak,
});

export const buildTutorialRouteSaveOptions = (
  player: PlayerState,
  commandKey: Extract<ExplorationCommandIntentKey, 'SKIP_TUTORIAL' | 'RETURN_TO_ADVENTURE'>,
  intent: ResolvedCommandIntent | null,
): SaveExplorationOptions => ({
  commandKey,
  intentId: intent?.intentId,
  intentStateKey: intent?.intentStateKey,
  expectedActiveBattleId: player.activeBattleId,
  expectedLocationLevel: player.locationLevel,
  expectedHighestLocationLevel: player.highestLocationLevel,
  expectedVictoryStreak: player.victoryStreak,
  expectedDefeatStreak: player.defeatStreak,
  expectedTutorialState: player.tutorialState,
});
