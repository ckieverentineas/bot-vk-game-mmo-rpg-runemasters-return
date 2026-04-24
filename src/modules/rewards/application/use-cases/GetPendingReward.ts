import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository, PendingRewardView } from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';
import type { PlayerState } from '../../../../shared/types/game';

export interface GetPendingRewardResult {
  readonly player: PlayerState;
  readonly pendingReward: PendingRewardView | null;
}

type GetPendingRewardRepository = FindPlayerByVkIdRepository & Pick<GameRepository, 'findPendingReward'>;

export class GetPendingReward {
  public constructor(private readonly repository: GetPendingRewardRepository) {}

  public async execute(vkId: number): Promise<GetPendingRewardResult> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    return {
      player,
      pendingReward: await this.repository.findPendingReward(player.playerId),
    };
  }
}
