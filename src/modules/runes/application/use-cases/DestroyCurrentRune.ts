import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { getSelectedRune } from '../../../player/domain/player-stats';

import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildDestroyIntentStateKey } from '../command-intent-state';

export class DestroyCurrentRune {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number, intentId?: string, intentStateKey?: string, intentSource: CommandIntentSource = 'payload'): Promise<PlayerState> {
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

    const rune = getSelectedRune(player);
    if (!rune) {
      throw new AppError('runes_not_found', 'У вас пока нет рун для распыления.');
    }

    const shardField = gameBalance.runes.profiles[rune.rarity].shardField;
    const shardReward = Math.max(1, gameBalance.runes.profiles[rune.rarity].lines * 2);
    const currentStateKey = buildDestroyIntentStateKey(player, rune.id, shardField);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, false);
    if (intentSource !== 'legacy_text' && intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    return this.repository.destroyRune(
      player.playerId,
      rune.id,
      { [shardField]: shardReward },
      intent?.intentId,
      intent?.intentStateKey,
      intentSource === 'legacy_text' ? undefined : intent ? currentStateKey : undefined,
    );
  }
}
