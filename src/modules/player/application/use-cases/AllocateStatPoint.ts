import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState, StatKey } from '../../../../shared/types/game';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class AllocateStatPoint {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number, stat: StatKey): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (player.unspentStatPoints <= 0) {
      throw new AppError('no_stat_points', 'У вас нет свободных очков характеристик.');
    }

    const nextAllocation = {
      ...player.allocationPoints,
      [stat]: player.allocationPoints[stat] + 1,
    };

    return this.repository.saveAllocation(player.playerId, nextAllocation, player.unspentStatPoints - 1);
  }
}
