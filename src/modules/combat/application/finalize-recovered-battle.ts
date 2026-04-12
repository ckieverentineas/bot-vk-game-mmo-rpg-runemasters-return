import type { BattleView } from '../../../shared/types/game';

import type { GameRepository } from '../../shared/application/ports/GameRepository';
import { recoverInvalidActiveBattle } from '../domain/recover-active-battle';
import { RewardEngine } from '../domain/reward-engine';

interface RecoveredBattleFinalization {
  readonly battle: BattleView;
  readonly recovered: boolean;
}

export const finalizeRecoveredBattleIfNeeded = async (
  repository: GameRepository,
  playerId: number,
  battle: BattleView,
): Promise<RecoveredBattleFinalization> => {
  const recoveredBattle = recoverInvalidActiveBattle(battle);

  if (!recoveredBattle) {
    return {
      battle,
      recovered: false,
    };
  }

  const rewardResolution = recoveredBattle.result === 'VICTORY'
    ? RewardEngine.applyVictoryRewards(recoveredBattle)
    : { battle: recoveredBattle, droppedRune: null };

  await repository.finalizeBattle(playerId, rewardResolution.battle, rewardResolution.droppedRune);

  return {
    battle: rewardResolution.battle,
    recovered: true,
  };
};
