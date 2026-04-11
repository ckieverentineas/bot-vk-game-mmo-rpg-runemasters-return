import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { normalizeRuneIndex } from '../../../player/domain/player-stats';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class GetRuneCollection {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    const player = await this.repository.findPlayerByVkId(vkId);
    if (!player) {
      throw new AppError('player_not_found', 'Напишите «начать», чтобы создать персонажа.');
    }

    if (player.runes.length === 0) {
      return player;
    }

    const normalizedIndex = normalizeRuneIndex(player.currentRuneIndex, player.runes.length);
    return normalizedIndex === player.currentRuneIndex
      ? player
      : this.repository.saveRuneCursor(player.playerId, normalizedIndex);
  }
}

