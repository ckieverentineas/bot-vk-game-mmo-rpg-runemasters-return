import type { BattleView, PlayerState } from '../../../shared/types/game';

import type { GameRepository } from '../../shared/application/ports/GameRepository';
import { recoverInvalidActiveBattle } from '../domain/recover-active-battle';
import { RewardEngine } from '../domain/reward-engine';
import { resolveVictoryRewardOptions } from './resolve-victory-reward-options';

interface RecoveredBattleFinalization {
  readonly battle: BattleView;
  readonly recovered: boolean;
}

export const finalizeRecoveredBattleIfNeeded = async (
  repository: GameRepository,
  player: Pick<PlayerState, 'playerId' | 'tutorialState' | 'runes'>,
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
    ? RewardEngine.applyVictoryRewards(recoveredBattle, resolveVictoryRewardOptions(player, recoveredBattle))
    : { battle: recoveredBattle, droppedRune: null };

  await repository.finalizeBattle(player.playerId, rewardResolution.battle, rewardResolution.droppedRune);

  return {
    battle: rewardResolution.battle,
    recovered: true,
  };
};
