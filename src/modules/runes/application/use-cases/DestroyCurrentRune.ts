import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { getSelectedRune } from '../../../player/domain/player-stats';

import { resolveCommandIntent } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildDestroyIntentStateKey } from '../command-intent-state';

export class DestroyCurrentRune {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number, intentId?: string, intentStateKey?: string): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const intent = resolveCommandIntent(intentId, intentStateKey);

    const rune = getSelectedRune(player);
    if (!rune) {
      throw new AppError('runes_not_found', 'У вас пока нет рун для распыления.');
    }

    const shardField = gameBalance.runes.profiles[rune.rarity].shardField;
    const shardReward = Math.max(1, gameBalance.runes.profiles[rune.rarity].lines * 2);
    const currentStateKey = buildDestroyIntentStateKey(player, rune.id, shardField);
    if (intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    return this.repository.destroyRune(
      player.playerId,
      rune.id,
      { [shardField]: shardReward },
      intent?.intentId,
      intent?.intentStateKey,
      intent ? currentStateKey : undefined,
    );
  }
}
