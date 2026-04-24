import type { PlayerState } from '../../../../shared/types/game';

import { Logger } from '../../../../utils/logger';
import type { CommandIntentSource } from '../../../shared/application/command-intent';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type {
  CommandIntentReplayRepository,
  FindPlayerByVkIdRepository,
} from '../../../shared/application/ports/repository-scopes';
import { buildReturnToAdventureIntentStateKey } from '../command-intent-state';
import {
  assertNoActiveTutorialRouteBattle,
  buildTutorialRouteExplorationState,
  buildTutorialRouteSaveOptions,
  loadTutorialRouteReplayResult,
  resolveTutorialRouteSaveIntent,
} from './tutorial-route-shared';

export interface ReturnToAdventureReplayResult {
  readonly player: PlayerState;
  readonly replayed: true;
}

type ReturnToAdventureRepository = CommandIntentReplayRepository
  & FindPlayerByVkIdRepository
  & Pick<GameRepository, 'saveExplorationState'>;

export class ReturnToAdventure {
  public constructor(
    private readonly repository: ReturnToAdventureRepository,
    private readonly telemetry: GameTelemetry,
  ) {}

  public async execute(
    vkId: number,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<PlayerState | ReturnToAdventureReplayResult> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const replayResult = await loadTutorialRouteReplayResult(this.repository, player, intentId);
    if (replayResult) {
      return replayResult;
    }

    assertNoActiveTutorialRouteBattle(player);

    const currentStateKey = buildReturnToAdventureIntentStateKey(player);
    const intent = resolveTutorialRouteSaveIntent(intentId, intentStateKey, intentSource, currentStateKey);

    const updatedPlayer = await this.repository.saveExplorationState(
      player.playerId,
      buildTutorialRouteExplorationState(player),
      buildTutorialRouteSaveOptions(player, 'RETURN_TO_ADVENTURE', intent),
    );

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
