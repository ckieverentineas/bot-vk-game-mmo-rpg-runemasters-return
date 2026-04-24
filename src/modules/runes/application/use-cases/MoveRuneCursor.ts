import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { normalizeRuneIndex } from '../../../player/domain/player-stats';

import {
  assertFreshCommandIntent,
  loadCommandIntentReplay,
  resolveCommandIntent,
  type CommandIntentSource,
} from '../../../shared/application/command-intent';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type {
  CommandIntentReplayRepository,
  FindPlayerByVkIdRepository,
} from '../../../shared/application/ports/repository-scopes';
import { runeCollectionPageSize, resolveShiftedRunePageIndex } from '../../domain/rune-collection';
import { buildMoveRuneCursorIntentStateKey } from '../command-intent-state';

const runeNavigationPendingMessage = 'Рунный жест ещё в пути. Дождитесь ответа.';
const runeNavigationStaleMessage = 'Рунная страница сменилась. Вот нынешние знаки.';

type MoveRuneCursorRepository = CommandIntentReplayRepository
  & FindPlayerByVkIdRepository
  & Pick<GameRepository, 'saveRuneCursor'>;

export class MoveRuneCursor {
  public constructor(private readonly repository: MoveRuneCursorRepository) {}

  public async execute(
    vkId: number,
    direction: number,
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

    const currentStateKey = buildMoveRuneCursorIntentStateKey(player, direction);
    const intent = assertFreshCommandIntent({
      intent: resolveCommandIntent(intentId, intentStateKey, intentSource, false),
      intentSource,
      currentStateKey,
      staleMessage: runeNavigationStaleMessage,
      requireIntent: true,
    });

    const nextIndex = Math.abs(direction) >= runeCollectionPageSize
      ? resolveShiftedRunePageIndex(player.currentRuneIndex, player.runes.length, direction > 0 ? 1 : -1)
      : normalizeRuneIndex(player.currentRuneIndex + direction, player.runes.length);

    return this.repository.saveRuneCursor(player.playerId, nextIndex, {
        commandKey: 'MOVE_RUNE_CURSOR',
        intentId: intent.intentId,
        intentStateKey: intent.intentStateKey,
        expectedPlayerUpdatedAt: player.updatedAt,
      });
  }
}
