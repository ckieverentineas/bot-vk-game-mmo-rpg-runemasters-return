import { AppError } from '../../../../shared/domain/AppError';
import type { BattleView } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';

import { finalizeRecoveredBattleIfNeeded } from '../finalize-recovered-battle';

export class GetActiveBattle {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<BattleView> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const activeBattle = await this.repository.getActiveBattle(player.playerId);
    if (!activeBattle) {
      throw new AppError('battle_not_found', 'Сейчас нет активного боя. Сначала используйте «исследовать».');
    }

    const recoveredBattle = await finalizeRecoveredBattleIfNeeded(this.repository, player.playerId, activeBattle);
    if (recoveredBattle.recovered) {
      throw new AppError('battle_not_found', 'Активный бой уже завершён. Начните новый через «исследовать».');
    }

    return recoveredBattle.battle;
  }
}
