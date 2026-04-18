import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState, StatKey } from '../../../../shared/types/game';

import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildAllocateStatIntentStateKey } from '../command-intent-state';

export class AllocateStatPoint {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(
    vkId: number,
    stat: StatKey,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (intentSource === 'legacy_text' && intentId) {
      const replay = await this.repository.getCommandIntentResult(player.playerId, intentId);
      if (replay?.status === 'APPLIED' && replay.result) {
        return replay.result;
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    const currentStateKey = buildAllocateStatIntentStateKey(player, stat);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);
    if (intentSource !== 'legacy_text' && intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    if (player.unspentStatPoints <= 0) {
      throw new AppError('no_stat_points', 'У вас нет свободных очков характеристик.');
    }

    const nextAllocation = {
      ...player.allocationPoints,
      [stat]: player.allocationPoints[stat] + 1,
    };

    return this.repository.saveAllocation(player.playerId, nextAllocation, player.unspentStatPoints - 1, {
      commandKey: 'ALLOCATE_STAT_POINT',
      intentId: intent?.intentId,
      intentStateKey: intent?.intentStateKey,
      expectedAllocationPoints: player.allocationPoints,
      expectedUnspentStatPoints: player.unspentStatPoints,
    });
  }
}
