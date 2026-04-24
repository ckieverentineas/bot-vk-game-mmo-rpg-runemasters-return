import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { getSelectedRune } from '../../../player/domain/player-stats';

import {
  assertFreshCommandIntent,
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildDestroyIntentStateKey } from '../command-intent-state';

const runeMutationPendingMessage = 'Рунный жест ещё в пути. Дождитесь ответа.';
const runeMutationStaleMessage = 'Этот рунный жест уже выцвел. Вернитесь к свежей руне.';

export class DestroyCurrentRune {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number, intentId?: string, intentStateKey?: string, intentSource: CommandIntentSource = 'payload'): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const legacyReplay = await loadCommandIntentReplay<PlayerState>({
      repository: this.repository,
      playerId: player.playerId,
      intentId: intentSource === 'legacy_text' ? intentId : undefined,
      pendingMessage: runeMutationPendingMessage,
    });
    if (legacyReplay) {
      return legacyReplay;
    }

    const rune = getSelectedRune(player);
    if (!rune) {
      throw new AppError('runes_not_found', 'У вас пока нет рун для распыления.');
    }

    const shardField = gameBalance.runes.profiles[rune.rarity].shardField;
    const shardReward = Math.max(1, gameBalance.runes.profiles[rune.rarity].lines * 2);
    const currentStateKey = buildDestroyIntentStateKey(player, rune.id, shardField);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, false);
    assertFreshCommandIntent({
      intent,
      intentSource,
      currentStateKey,
      staleMessage: runeMutationStaleMessage,
    });

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
