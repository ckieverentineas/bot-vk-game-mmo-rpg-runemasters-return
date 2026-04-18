import { AppError } from '../../../../shared/domain/AppError';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import { getEquippedRune, getSelectedRune } from '../../../player/domain/player-stats';

import type { PlayerState } from '../../../../shared/types/game';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildUnequipIntentStateKey } from '../command-intent-state';

export class UnequipCurrentRune {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number, intentId?: string, intentStateKey?: string, intentSource: CommandIntentSource = 'payload'): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const currentStateKey = buildUnequipIntentStateKey(player);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource);

    if (intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    return this.repository.equipRune(player.playerId, null, {
      commandKey: 'UNEQUIP_RUNE',
      intentId: intent?.intentId,
      intentStateKey: intent?.intentStateKey,
      expectedPlayerUpdatedAt: player.updatedAt,
      expectedCurrentRuneIndex: player.currentRuneIndex,
      expectedSelectedRuneId: getSelectedRune(player)?.id ?? null,
      expectedEquippedRuneId: getEquippedRune(player)?.id ?? null,
      expectedRuneIds: player.runes.map((entry) => entry.id),
    });
  }
}
