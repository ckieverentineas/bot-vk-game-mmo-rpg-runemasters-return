import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { getSelectedRune } from '../../../player/domain/player-stats';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class EquipCurrentRune {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    const player = await this.repository.findPlayerByVkId(vkId);
    if (!player) {
      throw new AppError('player_not_found', 'Напишите «начать», чтобы создать персонажа.');
    }

    const rune = getSelectedRune(player);
    if (!rune) {
      throw new AppError('runes_not_found', 'У вас пока нет рун.');
    }

    return this.repository.equipRune(player.playerId, rune.id);
  }
}

