import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type {
  CollectPendingRewardResult,
  GameRepository,
  PendingRewardView,
} from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';
import type { TrophyActionCode } from '../../domain/trophy-actions';

export interface CollectPendingRewardView extends CollectPendingRewardResult {
  readonly pendingReward: PendingRewardView;
  readonly playerBeforeCollect: PlayerState;
}

type CollectPendingRewardRepository = FindPlayerByVkIdRepository & Pick<
  GameRepository,
  'collectPendingReward' | 'findPendingReward'
>;

export class CollectPendingReward {
  public constructor(private readonly repository: CollectPendingRewardRepository) {}

  public async execute(
    vkId: number,
    actionCode: TrophyActionCode,
    ledgerKey?: string,
  ): Promise<CollectPendingRewardView> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const pendingReward = ledgerKey
      ? await this.requirePendingRewardByLedgerKey(player.playerId, ledgerKey)
      : await this.repository.findPendingReward(player.playerId);

    if (!pendingReward) {
      throw new AppError('pending_reward_not_found', 'Сейчас нет несобранной добычи. Можно продолжать исследование.');
    }

    const collected = await this.repository.collectPendingReward(
      player.playerId,
      pendingReward.ledgerKey,
      actionCode,
    );

    return {
      ...collected,
      pendingReward,
      playerBeforeCollect: player,
    };
  }

  private async requirePendingRewardByLedgerKey(
    playerId: number,
    ledgerKey: string,
  ): Promise<PendingRewardView> {
    const pendingReward = await this.repository.findPendingReward(playerId);

    if (!pendingReward || pendingReward.ledgerKey !== ledgerKey) {
      throw new AppError('pending_reward_not_found', 'Этого трофея уже нет на поле. Вернитесь к текущей добыче.');
    }

    return pendingReward;
  }
}
