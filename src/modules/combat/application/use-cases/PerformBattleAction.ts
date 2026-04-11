import { AppError } from '../../../../shared/domain/AppError';
import type { BattleView } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { BattleEngine } from '../../domain/battle-engine';
import { recoverInvalidActiveBattle } from '../../domain/recover-active-battle';
import { RewardEngine } from '../../domain/reward-engine';

export class PerformBattleAction {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<BattleView> {
    const player = await this.repository.findPlayerByVkId(vkId);
    if (!player) {
      throw new AppError('player_not_found', 'Напишите «начать», чтобы создать персонажа.');
    }

    const activeBattle = await this.repository.getActiveBattle(player.playerId);
    if (!activeBattle) {
      throw new AppError('battle_not_found', 'Сейчас у вас нет активного боя.');
    }

    const recoveredBattle = recoverInvalidActiveBattle(activeBattle);
    if (recoveredBattle) {
      const rewardedRecoveredBattle = recoveredBattle.result === 'VICTORY'
        ? RewardEngine.applyVictoryRewards(recoveredBattle)
        : { battle: recoveredBattle, droppedRune: null };

      await this.repository.finalizeBattle(player.playerId, rewardedRecoveredBattle.battle, rewardedRecoveredBattle.droppedRune);
      return rewardedRecoveredBattle.battle;
    }

    let battle = BattleEngine.attack(activeBattle);

    if (battle.status === 'ACTIVE') {
      battle = BattleEngine.resolveEnemyTurn(battle);
    }

    if (battle.status === 'COMPLETED') {
      const rewarded = battle.result === 'VICTORY'
        ? RewardEngine.applyVictoryRewards(battle)
        : { battle, droppedRune: null };

      await this.repository.finalizeBattle(player.playerId, rewarded.battle, rewarded.droppedRune);
      return rewarded.battle;
    }

    return this.repository.saveBattle(battle);
  }
}
