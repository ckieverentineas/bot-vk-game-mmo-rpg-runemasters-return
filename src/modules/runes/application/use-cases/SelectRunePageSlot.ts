import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { resolveRunePageSlotIndex } from '../../domain/rune-collection';

export class SelectRunePageSlot {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number, slot: 0 | 1 | 2 | 3): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    if (player.runes.length === 0) {
      throw new AppError('runes_not_found', 'У вас пока нет рун. Сначала добудьте или создайте их.');
    }

    const targetIndex = resolveRunePageSlotIndex(player.currentRuneIndex, player.runes.length, slot);
    if (targetIndex === null) {
      throw new AppError('rune_slot_not_found', 'На этой позиции нет руны. Выберите другой слот на странице.');
    }

    return this.repository.saveRuneCursor(player.playerId, targetIndex);
  }
}
