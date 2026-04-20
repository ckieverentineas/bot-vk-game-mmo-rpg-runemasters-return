import type { PlayerState } from '../../../../shared/types/game';

import { Logger } from '../../../../utils/logger';
import type { CommandIntentSource } from '../../../shared/application/command-intent';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildSkipTutorialIntentStateKey } from '../command-intent-state';
import {
  assertNoActiveTutorialRouteBattle,
  buildTutorialRouteExplorationState,
  buildTutorialRouteSaveOptions,
  loadTutorialRouteReplayResult,
  resolveTutorialRouteSaveIntent,
} from './tutorial-route-shared';

export interface SkipTutorialReplayResult {
  readonly player: PlayerState;
  readonly replayed: true;
}

export class SkipTutorial {
  public constructor(
    private readonly repository: GameRepository,
    private readonly telemetry: GameTelemetry,
  ) {}

  public async execute(
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<PlayerState | SkipTutorialReplayResult> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const replayResult = await loadTutorialRouteReplayResult(this.repository, player, intentId);
    if (replayResult) {
      return replayResult;
    }

    assertNoActiveTutorialRouteBattle(player);

    const currentStateKey = buildSkipTutorialIntentStateKey(player);
    const intent = resolveTutorialRouteSaveIntent(intentId, intentStateKey, intentSource, currentStateKey);

    const updatedPlayer = await this.repository.saveExplorationState(
      player.playerId,
      buildTutorialRouteExplorationState(player),
      buildTutorialRouteSaveOptions(player, 'SKIP_TUTORIAL', intent),
    );

    if (player.tutorialState === 'ACTIVE') {
      try {
        await this.telemetry.tutorialPathChosen(updatedPlayer.userId, {
          entrySurface: 'skip_tutorial',
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
