import { AppError } from '../../../../shared/domain/AppError';
import { gameBalance } from '../../../../config/game-balance';
import type { PlayerState } from '../../../../shared/types/game';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class EnterTutorialMode {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (player.activeBattleId) {
      throw new AppError('battle_in_progress', 'Сначала завершите текущий бой, а потом возвращайтесь к экрану обучения.');
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
    });
  }
}
