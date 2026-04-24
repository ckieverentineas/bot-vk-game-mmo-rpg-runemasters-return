import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import {
  assertFreshCommandIntent,
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { resolveRunePageSlotIndex, type RunePageSlot } from '../../domain/rune-collection';
import { buildSelectRunePageSlotIntentStateKey } from '../command-intent-state';

const runeNavigationPendingMessage = 'Рунный жест ещё в пути. Дождитесь ответа.';
const runeNavigationStaleMessage = 'Рунная страница сменилась. Вот нынешние знаки.';

export class SelectRunePageSlot {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(
    vkId: number,
    slot: RunePageSlot,
    intentId?: string,
    intentStateKey?: string,
    intentSource: CommandIntentSource = null,
  ): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (player.runes.length === 0) {
      throw new AppError('runes_not_found', 'У вас пока нет рун. Сначала добудьте или создайте их.');
    }

    const legacyReplay = await loadCommandIntentReplay<PlayerState>({
      repository: this.repository,
      playerId: player.playerId,
      intentId: intentSource === 'legacy_text' ? intentId : undefined,
      pendingMessage: runeNavigationPendingMessage,
    });
    if (legacyReplay) {
      return legacyReplay;
    }

    const currentStateKey = buildSelectRunePageSlotIntentStateKey(player, slot);
    const intent = assertFreshCommandIntent({
      intent: resolveCommandIntent(intentId, intentStateKey, intentSource, false),
      intentSource,
      currentStateKey,
      staleMessage: runeNavigationStaleMessage,
      requireIntent: true,
    });

    const targetIndex = resolveRunePageSlotIndex(player.currentRuneIndex, player.runes.length, slot);
    if (targetIndex === null) {
      throw new AppError('rune_slot_not_found', 'На этой позиции пусто. Возьмите другой знак со страницы.');
    }

    return this.repository.saveRuneCursor(player.playerId, targetIndex, {
        commandKey: 'SELECT_RUNE_PAGE_SLOT',
        intentId: intent.intentId,
        intentStateKey: intent.intentStateKey,
        expectedPlayerUpdatedAt: player.updatedAt,
      });
  }
}
