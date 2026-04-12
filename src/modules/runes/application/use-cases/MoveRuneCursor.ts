import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { normalizeRuneIndex } from '../../../player/domain/player-stats';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class MoveRuneCursor {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number, direction: 1 | -1): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (player.runes.length === 0) {
      throw new AppError('runes_not_found', 'У вас пока нет рун. Сначала добудьте или создайте их.');
    }

    const nextIndex = normalizeRuneIndex(player.currentRuneIndex + direction, player.runes.length);
    return this.repository.saveRuneCursor(player.playerId, nextIndex);
  }
}
