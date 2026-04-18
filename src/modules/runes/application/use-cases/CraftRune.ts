import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState, RuneRarity } from '../../../../shared/types/game';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildCraftIntentStateKey } from '../command-intent-state';
import { RuneFactory } from '../../domain/rune-factory';

const rarityPriority: RuneRarity[] = ['MYTHICAL', 'LEGENDARY', 'EPIC', 'RARE', 'UNUSUAL', 'USUAL'];

export class CraftRune {
  public constructor(
    private readonly repository: GameRepository,
    private readonly random: GameRandom,
  ) {}

  public async execute(vkId: number, intentId?: string, intentStateKey?: string): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const rarity = rarityPriority.find((candidate) => {
      const shardField = gameBalance.runes.profiles[candidate].shardField;
      return player.inventory[shardField] >= gameBalance.runes.craftCost;
    });

    if (!rarity) {
      throw new AppError('not_enough_shards', 'Недостаточно осколков для создания руны. Нужно минимум 10 осколков одной редкости.');
    }

    const currentStateKey = buildCraftIntentStateKey(player);

    return this.repository.craftRune(
      player.playerId,
      rarity,
      RuneFactory.create(player.locationLevel, rarity, undefined, this.random),
      intentId,
      intentStateKey,
      intentId ? currentStateKey : undefined,
    );
  }
}
