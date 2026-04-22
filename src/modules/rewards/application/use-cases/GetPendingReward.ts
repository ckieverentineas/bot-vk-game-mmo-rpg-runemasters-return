import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository, PendingRewardView } from '../../../shared/application/ports/GameRepository';
import type { PlayerState } from '../../../../shared/types/game';

export interface GetPendingRewardResult {
  readonly player: PlayerState;
  readonly pendingReward: PendingRewardView | null;
}

export class GetPendingReward {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<GetPendingRewardResult> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    return {
      player,
      pendingReward: await this.repository.findPendingReward(player.playerId),
    };
  }
}
