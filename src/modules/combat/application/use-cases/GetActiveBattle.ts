import { AppError } from '../../../../shared/domain/AppError';
import type { BattleView } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRandom } from '../../../../shared/domain/GameRandom';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { FindPlayerByVkIdRepository } from '../../../shared/application/ports/repository-scopes';

import { finalizeRecoveredBattleIfNeeded } from '../finalize-recovered-battle';

type GetActiveBattleRepository = FindPlayerByVkIdRepository & Pick<
  GameRepository,
  'finalizeBattle' | 'getActiveBattle' | 'saveBattle'
>;

export class GetActiveBattle {
  public constructor(
    private readonly repository: GetActiveBattleRepository,
    private readonly random: GameRandom,
  ) {}

  public async execute(vkId: number): Promise<BattleView> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const activeBattle = await this.repository.getActiveBattle(player.playerId);
    if (!activeBattle) {
      throw new AppError('battle_not_found', 'Сейчас нет активного боя. Сначала используйте «исследовать».');
    }

    const recoveredBattle = await finalizeRecoveredBattleIfNeeded(this.repository, player, activeBattle, this.random);
    if (recoveredBattle.recovered && recoveredBattle.battle.status === 'COMPLETED') {
      throw new AppError('battle_not_found', 'Активный бой уже завершён. Начните новый через «исследовать».');
    }

    return recoveredBattle.battle;
  }
}
