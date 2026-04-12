import { gameBalance } from '../../../../config/game-balance';
import type { PlayerState } from '../../../../shared/types/game';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class EnterTutorialMode {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    return this.repository.saveExplorationState(player.playerId, {
      locationLevel: gameBalance.world.introLocationLevel,
      highestLocationLevel: player.highestLocationLevel,
      tutorialState: player.tutorialState,
      victoryStreak: player.victoryStreak,
      defeatStreak: player.defeatStreak,
    });
  }
}
