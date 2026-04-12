import { AppError } from '../../../../shared/domain/AppError';
import type { BattleView } from '../../../../shared/types/game';
import { requirePlayerByVkId } from '../../../shared/application/require-player';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { BattleEngine } from '../../domain/battle-engine';

import { finalizeRecoveredBattleIfNeeded } from '../finalize-recovered-battle';
import { RewardEngine } from '../../domain/reward-engine';

export class PerformBattleAction {
  public constructor(private readonly repository: GameRepository) {}

  public async execute(vkId: number): Promise<BattleView> {
    const player = await requirePlayerByVkId(this.repository, vkId);

    const activeBattle = await this.repository.getActiveBattle(player.playerId);
    if (!activeBattle) {
      throw new AppError('battle_not_found', 'Сейчас у вас нет активного боя.');
    }

    const recoveredBattle = await finalizeRecoveredBattleIfNeeded(this.repository, player.playerId, activeBattle);
    if (recoveredBattle.recovered) {
      return recoveredBattle.battle;
    }

    let battle = BattleEngine.attack(recoveredBattle.battle);

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
