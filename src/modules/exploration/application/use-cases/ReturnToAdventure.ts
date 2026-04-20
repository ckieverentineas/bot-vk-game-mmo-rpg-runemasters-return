import type { PlayerState } from '../../../../shared/types/game';
import { resolveAdaptiveAdventureLocationLevel } from '../../../player/domain/player-stats';

import { AppError } from '../../../../shared/domain/AppError';
import { Logger } from '../../../../utils/logger';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildReturnToAdventureIntentStateKey } from '../command-intent-state';

export interface ReturnToAdventureReplayResult {
  readonly player: PlayerState;
  readonly replayed: true;
}

export class ReturnToAdventure {
  public constructor(
    private readonly repository: GameRepository,
    private readonly telemetry: GameTelemetry,
  ) {}

  public async execute(
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<PlayerState | ReturnToAdventureReplayResult> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (intentId) {
      const replay = await this.repository.getCommandIntentResult(player.playerId, intentId);
      if (replay?.status === 'APPLIED' && replay.result) {
        return { player: replay.result, replayed: true };
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    if (player.activeBattleId) {
      throw new AppError('battle_in_progress', 'Сначала завершите текущий бой, а потом меняйте маршрут приключения.');
    }

    const currentStateKey = buildReturnToAdventureIntentStateKey(player);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);
    if (intentSource !== 'legacy_text' && intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    const updatedPlayer = await this.repository.saveExplorationState(player.playerId, {
      locationLevel: resolveAdaptiveAdventureLocationLevel(player),
      highestLocationLevel: player.highestLocationLevel,
      tutorialState: player.tutorialState === 'ACTIVE' ? 'SKIPPED' : player.tutorialState,
      victoryStreak: player.victoryStreak,
      defeatStreak: player.defeatStreak,
    }, {
      commandKey: 'RETURN_TO_ADVENTURE',
      intentId: intent?.intentId,
      intentStateKey: intent?.intentStateKey,
      expectedActiveBattleId: player.activeBattleId,
      expectedLocationLevel: player.locationLevel,
      expectedHighestLocationLevel: player.highestLocationLevel,
      expectedVictoryStreak: player.victoryStreak,
      expectedDefeatStreak: player.defeatStreak,
      expectedTutorialState: player.tutorialState,
    });

    if (player.tutorialState === 'ACTIVE') {
      try {
        await this.telemetry.tutorialPathChosen(updatedPlayer.userId, {
          entrySurface: 'return_to_adventure',
          choice: 'skip_tutorial',
          tutorialState: player.tutorialState,
        });
      } catch (error) {
        Logger.warn('Telemetry logging failed', error);
      }
    }

    return updatedPlayer;
  }
}
