import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { resolveCommandIntent, type CommandIntentSource } from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { resolveRunePageSlotIndex } from '../../domain/rune-collection';
import { buildSelectRunePageSlotIntentStateKey } from '../command-intent-state';

export class SelectRunePageSlot {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(
    vkId: number,
    slot: 0 | 1 | 2 | 3,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (player.runes.length === 0) {
      throw new AppError('runes_not_found', 'У вас пока нет рун. Сначала добудьте или создайте их.');
    }

    if (intentSource === 'legacy_text' && intentId) {
      const replay = await this.repository.getCommandIntentResult<PlayerState>(player.playerId, intentId);
      if (replay?.status === 'APPLIED' && replay.result) {
        return replay.result;
      }

      if (replay?.status === 'PENDING') {
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
      }
    }

    const currentStateKey = buildSelectRunePageSlotIntentStateKey(player, slot);
    const intent = resolveCommandIntent(intentId, intentStateKey, intentSource, false);
    if (!intent) {
      throw new AppError('stale_command_intent', 'Этот экран рун уже устарел. Я открыл актуальные руны.');
    }

    if (intentSource !== 'legacy_text' && intent.intentStateKey !== currentStateKey) {
      throw new AppError('stale_command_intent', 'Этот экран рун уже устарел. Я открыл актуальные руны.');
    }

    const targetIndex = resolveRunePageSlotIndex(player.currentRuneIndex, player.runes.length, slot);
    if (targetIndex === null) {
      throw new AppError('rune_slot_not_found', 'На этой позиции нет руны. Выберите другой слот на странице.');
    }

    return this.repository.saveRuneCursor(player.playerId, targetIndex, {
        commandKey: 'SELECT_RUNE_PAGE_SLOT',
        intentId: intent.intentId,
        intentStateKey: intent.intentStateKey,
        expectedPlayerUpdatedAt: player.updatedAt,
      });
  }
}
