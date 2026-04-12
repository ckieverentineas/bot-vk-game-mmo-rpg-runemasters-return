import { requirePlayerByVkId } from '../../../shared/application/require-player';

import type { PlayerState } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class UnequipCurrentRune {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    return this.repository.equipRune(player.playerId, null);
  }
}
