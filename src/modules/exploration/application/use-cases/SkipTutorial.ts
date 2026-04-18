import type { PlayerState } from '../../../../shared/types/game';
import { resolveAdaptiveAdventureLocationLevel } from '../../../player/domain/player-stats';

import { AppError } from '../../../../shared/domain/AppError';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildSkipTutorialIntentStateKey } from '../command-intent-state';

export class SkipTutorial {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (intentId) {
      const replay = await this.repository.getCommandIntentResult(player.playerId, intentId);
      if (replay?.status === 'APPLIED' && replay.result) {
        return replay.result;
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    if (player.activeBattleId) {
      throw new AppError('battle_in_progress', 'Сначала завершите текущий бой, а потом меняйте маршрут приключения.');
    }

    const currentStateKey = buildSkipTutorialIntentStateKey(player);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);
    if (intentSource !== 'legacy_text' && intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    return this.repository.saveExplorationState(player.playerId, {
      locationLevel: resolveAdaptiveAdventureLocationLevel(player),
      highestLocationLevel: player.highestLocationLevel,
      tutorialState: player.tutorialState === 'ACTIVE' ? 'SKIPPED' : player.tutorialState,
      victoryStreak: player.victoryStreak,
      defeatStreak: player.defeatStreak,
    }, {
      commandKey: 'SKIP_TUTORIAL',
      intentId: intent?.intentId,
      intentStateKey: intent?.intentStateKey,
      expectedActiveBattleId: player.activeBattleId,
      expectedLocationLevel: player.locationLevel,
      expectedHighestLocationLevel: player.highestLocationLevel,
      expectedVictoryStreak: player.victoryStreak,
      expectedDefeatStreak: player.defeatStreak,
      expectedTutorialState: player.tutorialState,
    });
  }
}
