import { AppError } from '../../../../shared/domain/AppError';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import { getEquippedRune, getEquippedRuneIdsBySlot, getRuneEquippedSlot, getSelectedRune, getUnlockedRuneSlotCount } from '../../../player/domain/player-stats';

import type { PlayerState } from '../../../../shared/types/game';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildUnequipIntentStateKey } from '../command-intent-state';

export class UnequipCurrentRune {
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

    const targetSlot = getSelectedRune(player) ? getRuneEquippedSlot(getSelectedRune(player)!) ?? 0 : 0;
    if (targetSlot === 0 && getEquippedRune(player, 1)) {
      throw new AppError('rune_primary_required', 'Сначала снимите или переставьте руну поддержки, а потом освобождайте основной слот.');
    }

    const currentStateKey = buildUnequipIntentStateKey(player, targetSlot);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, intentSource === null);

    if (intentSource !== 'legacy_text' && intent && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    return this.repository.equipRune(player.playerId, null, {
      commandKey: 'UNEQUIP_RUNE',
      targetSlot,
      intentId: intent?.intentId,
      intentStateKey: intent?.intentStateKey,
      expectedPlayerUpdatedAt: player.updatedAt,
      expectedCurrentRuneIndex: player.currentRuneIndex,
      expectedUnlockedRuneSlotCount: getUnlockedRuneSlotCount(player),
      expectedSelectedRuneId: getSelectedRune(player)?.id ?? null,
      expectedEquippedRuneId: getEquippedRune(player, targetSlot)?.id ?? null,
      expectedEquippedRuneIdsBySlot: getEquippedRuneIdsBySlot(player),
      expectedRuneIds: player.runes.map((entry) => entry.id),
    });
  }
}
