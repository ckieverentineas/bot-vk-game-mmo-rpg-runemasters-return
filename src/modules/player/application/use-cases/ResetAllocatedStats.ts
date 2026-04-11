import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { emptyStats, spentStatPoints } from '../../domain/player-stats';

export class ResetAllocatedStats {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    const player = await this.repository.findPlayerByVkId(vkId);
    if (!player) {
      throw new AppError('player_not_found', 'Напишите «начать», чтобы создать персонажа.');
    }

    const restoredPoints = spentStatPoints(player.allocationPoints);
    return this.repository.saveAllocation(player.playerId, emptyStats(), player.unspentStatPoints + restoredPoints);
  }
}
