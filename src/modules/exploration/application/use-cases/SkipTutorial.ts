import type { PlayerState } from '../../../../shared/types/game';
import { resolveAdaptiveAdventureLocationLevel } from '../../../player/domain/player-stats';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class SkipTutorial {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    return this.repository.saveExplorationState(player.playerId, {
      locationLevel: resolveAdaptiveAdventureLocationLevel(player),
      highestLocationLevel: player.highestLocationLevel,
      tutorialState: player.tutorialState === 'ACTIVE' ? 'SKIPPED' : player.tutorialState,
      victoryStreak: player.victoryStreak,
      defeatStreak: player.defeatStreak,
    });
  }
}
