import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState, StatKey } from '../../../../shared/types/game';
import { getSelectedRune } from '../../../player/domain/player-stats';
import type { GameRandom } from '../../../shared/application/ports/GameRandom';

import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { RuneFactory } from '../../domain/rune-factory';

export class RerollCurrentRuneStat {
  public constructor(
    private readonly repository: GameRepository,
    private readonly random: GameRandom,
  ) {}

  public async execute(vkId: number, stat: StatKey): Promise<PlayerState> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const rune = getSelectedRune(player);
    if (!rune) {
      throw new AppError('runes_not_found', 'У вас пока нет рун.');
    }

    const shardField = gameBalance.runes.profiles[rune.rarity].shardField;
    if (player.inventory[shardField] <= 0) {
      throw new AppError('not_enough_shards', 'Для изменения стата нужен хотя бы один осколок той же редкости.');
    }

    const nextRune = RuneFactory.rerollStat(rune, stat, player.locationLevel, this.random);
    return this.repository.rerollRuneStat(player.playerId, rune.id, rune.rarity, {
      health: nextRune.health,
      attack: nextRune.attack,
      defence: nextRune.defence,
      magicDefence: nextRune.magicDefence,
      dexterity: nextRune.dexterity,
      intelligence: nextRune.intelligence,
    });
  }
}
