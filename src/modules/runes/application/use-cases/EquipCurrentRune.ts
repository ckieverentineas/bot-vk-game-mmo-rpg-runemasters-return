import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { getEquippedRune, getSelectedRune } from '../../../player/domain/player-stats';

import { resolveCommandIntent } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildEquipIntentStateKey } from '../command-intent-state';

export class EquipCurrentRune {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number, intentId?: string, intentStateKey?: string): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);
    const intent = resolveCommandIntent(intentId, intentStateKey);
    const currentStateKey = buildEquipIntentStateKey(player);

    if (intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    const rune = getSelectedRune(player);
    if (!rune) {
      throw new AppError('runes_not_found', 'У вас пока нет рун.');
    }

    return this.repository.equipRune(player.playerId, rune.id, {
      commandKey: 'EQUIP_RUNE',
      intentId: intent?.intentId,
      intentStateKey: intent?.intentStateKey,
      expectedPlayerUpdatedAt: player.updatedAt,
      expectedCurrentRuneIndex: player.currentRuneIndex,
      expectedSelectedRuneId: rune.id,
      expectedEquippedRuneId: getEquippedRune(player)?.id ?? null,
      expectedRuneIds: player.runes.map((entry) => entry.id),
    });
  }
}
