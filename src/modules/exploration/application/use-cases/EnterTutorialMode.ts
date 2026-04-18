import { AppError } from '../../../../shared/domain/AppError';
import { gameBalance } from '../../../../config/game-balance';
import type { PlayerState } from '../../../../shared/types/game';

import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildEnterTutorialModeIntentStateKey } from '../command-intent-state';

export class EnterTutorialMode {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const commandKey = 'ENTER_TUTORIAL_MODE' as const;
    const scopedIntent = intentSource === 'legacy_text'
      ? null
      : resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);

    if (player.activeBattleId) {
      throw new AppError('battle_in_progress', 'Сначала завершите текущий бой, а потом возвращайтесь к экрану обучения.');
    }

    const currentStateKey = buildEnterTutorialModeIntentStateKey(player);

    if (scopedIntent?.intentId) {
      const replay = await this.repository.getCommandIntentResult<PlayerState>(
        player.playerId,
        scopedIntent.intentId,
        [commandKey],
        scopedIntent.intentStateKey,
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        if (buildEnterTutorialModeIntentStateKey(replay.result) === currentStateKey) {
          return replay.result;
        }

        throw new AppError('stale_command_intent', 'Этот экран обучения уже устарел. Я открыл актуальный маршрут героя.');
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    if (intentSource === 'legacy_text' && intentId) {
      const replay = await this.repository.getCommandIntentResult<PlayerState>(
        player.playerId,
        intentId,
        [commandKey],
      );
      if (replay?.status === 'APPLIED' && replay.result) {
        if (buildEnterTutorialModeIntentStateKey(replay.result) === currentStateKey) {
          return replay.result;
        }

        throw new AppError('stale_command_intent', 'Этот экран обучения уже устарел. Я открыл актуальный маршрут героя.');
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    const saveIntent = intentSource === 'legacy_text'
      ? { intentId: resolveCommandIntent(intentId, undefined, intentSource, false)?.intentId as string, intentStateKey: currentStateKey }
      : scopedIntent;

    if (intentSource !== 'legacy_text' && saveIntent && saveIntent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Этот экран обучения уже устарел. Я открыл актуальный маршрут героя.');
    }

    if (player.tutorialState !== 'ACTIVE') {
      return player;
    }

    return this.repository.saveExplorationState(player.playerId, {
      locationLevel: gameBalance.world.introLocationLevel,
      highestLocationLevel: player.highestLocationLevel,
      tutorialState: player.tutorialState,
      victoryStreak: player.victoryStreak,
      defeatStreak: player.defeatStreak,
    }, {
      commandKey,
      intentId: saveIntent?.intentId,
      intentStateKey: saveIntent?.intentStateKey,
      expectedActiveBattleId: player.activeBattleId,
      expectedLocationLevel: player.locationLevel,
      expectedHighestLocationLevel: player.highestLocationLevel,
      expectedVictoryStreak: player.victoryStreak,
      expectedDefeatStreak: player.defeatStreak,
      expectedTutorialState: player.tutorialState,
    });
  }
}
