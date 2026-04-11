import { AppError } from '../../../../shared/domain/AppError';
import type { BattleView } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { recoverInvalidActiveBattle } from '../../domain/recover-active-battle';
import { RewardEngine } from '../../domain/reward-engine';

export class GetActiveBattle {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<BattleView> {
    const player = await this.repository.findPlayerByVkId(vkId);
    if (!player) {
      throw new AppError('player_not_found', 'Напишите «начать», чтобы создать персонажа.');
    }

    const battle = await this.repository.getActiveBattle(player.playerId);
    if (!battle) {
      throw new AppError('battle_not_found', 'Сейчас нет активного боя. Сначала используйте «исследовать».');
    }

    const recoveredBattle = recoverInvalidActiveBattle(battle);
    if (recoveredBattle) {
      const rewardedRecoveredBattle = recoveredBattle.result === 'VICTORY'
        ? RewardEngine.applyVictoryRewards(recoveredBattle)
        : { battle: recoveredBattle, droppedRune: null };

      await this.repository.finalizeBattle(player.playerId, rewardedRecoveredBattle.battle, rewardedRecoveredBattle.droppedRune);
      throw new AppError('battle_not_found', 'Активный бой уже завершён. Начните новый через «исследовать».');
    }

    return battle;
  }
}
