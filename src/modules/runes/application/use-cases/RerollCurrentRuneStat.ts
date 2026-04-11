import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState, StatKey } from '../../../../shared/types/game';
import { getSelectedRune } from '../../../player/domain/player-stats';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { RuneFactory } from '../../domain/rune-factory';

export class RerollCurrentRuneStat {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number, stat: StatKey): Promise<PlayerState> {
    const player = await this.repository.findPlayerByVkId(vkId);
    if (!player) {
      throw new AppError('player_not_found', 'Напишите «начать», чтобы создать персонажа.');
    }

    const rune = getSelectedRune(player);
    if (!rune) {
      throw new AppError('runes_not_found', 'У вас пока нет рун.');
    }

    const shardField = gameBalance.runes.profiles[rune.rarity].shardField;
    if (player.inventory[shardField] <= 0) {
      throw new AppError('not_enough_shards', 'Для изменения стата нужен хотя бы один осколок той же редкости.');
    }

    await this.repository.adjustInventory(player.playerId, { [shardField]: -1 });

    const nextRune = RuneFactory.rerollStat(rune, stat, player.locationLevel);
    return this.repository.updateRuneStats(player.playerId, rune.id, {
      health: nextRune.health,
      attack: nextRune.attack,
      defence: nextRune.defence,
      magicDefence: nextRune.magicDefence,
      dexterity: nextRune.dexterity,
      intelligence: nextRune.intelligence,
    });
  }
}

