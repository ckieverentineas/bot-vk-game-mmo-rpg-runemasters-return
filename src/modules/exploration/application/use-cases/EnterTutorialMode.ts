import { AppError } from '../../../../shared/domain/AppError';
import { gameBalance } from '../../../../config/game-balance';
import type { PlayerState } from '../../../../shared/types/game';

import {
  assertFreshCommandIntent,
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type {
  CommandIntentReplayRepository,
  FindPlayerByVkIdRepository,
} from '../../../shared/application/ports/repository-scopes';
import { buildEnterTutorialModeIntentStateKey } from '../command-intent-state';

const enterTutorialModePendingMessage = 'Прошлый жест ещё в пути. Дождитесь ответа.';
const enterTutorialModeStaleMessage = 'Учебная тропа сменилась. Вот нынешний путь героя.';

type EnterTutorialModeRepository = CommandIntentReplayRepository
  & FindPlayerByVkIdRepository
  & Pick<GameRepository, 'saveExplorationState'>;

export class EnterTutorialMode {
  public constructor(private readonly repository: EnterTutorialModeRepository) {}

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
      throw new AppError('battle_in_progress', 'Сначала завершите текущий бой, потом возвращайтесь к учебному кругу.');
    }

    const currentStateKey = buildEnterTutorialModeIntentStateKey(player);

    const replayResult = await loadCommandIntentReplay<PlayerState>({
      repository: this.repository,
      playerId: player.playerId,
      intentId: scopedIntent?.intentId,
      expectedCommandKeys: [commandKey],
      expectedStateKey: scopedIntent?.intentStateKey,
      pendingMessage: enterTutorialModePendingMessage,
      mapResult: (result) => {
        if (buildEnterTutorialModeIntentStateKey(result) === currentStateKey) {
          return result;
        }

        throw new AppError('stale_command_intent', enterTutorialModeStaleMessage);
      },
    }) ?? await loadCommandIntentReplay<PlayerState>({
      repository: this.repository,
      playerId: player.playerId,
      intentId: intentSource === 'legacy_text' ? intentId : undefined,
      expectedCommandKeys: [commandKey],
      pendingMessage: enterTutorialModePendingMessage,
      mapResult: (result) => {
        if (buildEnterTutorialModeIntentStateKey(result) === currentStateKey) {
          return result;
        }

        throw new AppError('stale_command_intent', enterTutorialModeStaleMessage);
      },
    });
    if (replayResult) {
      return replayResult;
    }

    const saveIntent = intentSource === 'legacy_text'
      ? { intentId: resolveCommandIntent(intentId, undefined, intentSource, false)?.intentId as string, intentStateKey: currentStateKey }
      : scopedIntent;

    assertFreshCommandIntent({
      intent: saveIntent,
      intentSource,
      currentStateKey,
      staleMessage: enterTutorialModeStaleMessage,
    });

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
