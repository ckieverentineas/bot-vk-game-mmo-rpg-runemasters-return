import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { emptyStats, spentStatPoints } from '../../domain/player-stats';

import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildResetAllocatedStatsIntentStateKey } from '../command-intent-state';

export class ResetAllocatedStats {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(
    vkId: number,
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

    const currentStateKey = buildResetAllocatedStatsIntentStateKey(player);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);
    if (intentSource !== 'legacy_text' && intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    const restoredPoints = spentStatPoints(player.allocationPoints);
    return this.repository.saveAllocation(player.playerId, emptyStats(), player.unspentStatPoints + restoredPoints, {
      commandKey: 'RESET_ALLOCATED_STATS',
      intentId: intent?.intentId,
      intentStateKey: intent?.intentStateKey,
      expectedAllocationPoints: player.allocationPoints,
      expectedUnspentStatPoints: player.unspentStatPoints,
    });
  }
}
