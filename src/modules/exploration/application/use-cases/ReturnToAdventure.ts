import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { resolveAdaptiveAdventureLocationLevel } from '../../../player/domain/player-stats';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class ReturnToAdventure {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    const player = await this.repository.findPlayerByVkId(vkId);
    if (!player) {
      throw new AppError('player_not_found', 'Напишите «начать», чтобы создать персонажа.');
    }

    return this.repository.saveExplorationState(player.playerId, {
      locationLevel: resolveAdaptiveAdventureLocationLevel(player),
      highestLocationLevel: player.highestLocationLevel,
      tutorialState: player.tutorialState,
      victoryStreak: player.victoryStreak,
      defeatStreak: player.defeatStreak,
    });
  }
}
