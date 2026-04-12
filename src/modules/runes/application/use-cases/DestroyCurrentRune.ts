import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import { getSelectedRune } from '../../../player/domain/player-stats';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

export class DestroyCurrentRune {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const rune = getSelectedRune(player);
    if (!rune) {
      throw new AppError('runes_not_found', 'У вас пока нет рун для распыления.');
    }

    const shardField = gameBalance.runes.profiles[rune.rarity].shardField;
    const shardReward = Math.max(1, gameBalance.runes.profiles[rune.rarity].lines * 2);

    await this.repository.deleteRune(player.playerId, rune.id);
    return this.repository.adjustInventory(player.playerId, { [shardField]: shardReward });
  }
}
