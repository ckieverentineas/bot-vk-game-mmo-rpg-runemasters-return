import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState, RuneRarity } from '../../../../shared/types/game';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { RuneFactory } from '../../domain/rune-factory';

const rarityPriority: RuneRarity[] = ['MYTHICAL', 'LEGENDARY', 'EPIC', 'RARE', 'UNUSUAL', 'USUAL'];

export class CraftRune {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const rarity = rarityPriority.find((candidate) => {
      const shardField = gameBalance.runes.profiles[candidate].shardField;
      return player.inventory[shardField] >= gameBalance.runes.craftCost;
    });

    if (!rarity) {
      throw new AppError('not_enough_shards', 'Недостаточно осколков для создания руны. Нужно минимум 10 осколков одной редкости.');
    }

    const shardField = gameBalance.runes.profiles[rarity].shardField;
    await this.repository.adjustInventory(player.playerId, {
      [shardField]: -gameBalance.runes.craftCost,
    });

    let updated = await this.repository.createRune(player.playerId, RuneFactory.create(player.locationLevel, rarity));
    updated = await this.repository.saveRuneCursor(updated.playerId, Math.max(0, updated.runes.length - 1));
    return updated;
  }
}
