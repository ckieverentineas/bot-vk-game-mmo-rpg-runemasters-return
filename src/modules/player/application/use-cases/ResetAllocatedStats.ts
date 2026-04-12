import type { PlayerState } from '../../../../shared/types/game';
import { emptyStats, spentStatPoints } from '../../domain/player-stats';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class ResetAllocatedStats {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const restoredPoints = spentStatPoints(player.allocationPoints);
    return this.repository.saveAllocation(player.playerId, emptyStats(), player.unspentStatPoints + restoredPoints);
  }
}
