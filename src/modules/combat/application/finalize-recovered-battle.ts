import type { BattleView, PlayerState } from '../../../shared/types/game';
import type { GameRandom } from '../../shared/application/ports/GameRandom';

import type { GameRepository, SaveBattleOptions } from '../../shared/application/ports/GameRepository';
import { BattleEngine } from '../domain/battle-engine';
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
  random: GameRandom,
  options?: SaveBattleOptions,
): Promise<RecoveredBattleFinalization> => {
  const recoveredBattle = recoverInvalidActiveBattle(battle);

  if (!recoveredBattle) {
    if (battle.status === 'ACTIVE' && battle.turnOwner === 'ENEMY') {
      const resolvedBattle = BattleEngine.resolveEnemyTurn(battle);

      if (resolvedBattle.status === 'COMPLETED') {
        const finalized = await repository.finalizeBattle(player.playerId, resolvedBattle, options);

        return {
          battle: finalized.battle,
          recovered: true,
        };
      }

      const savedBattle = await repository.saveBattle(resolvedBattle, options);

      return {
        battle: savedBattle,
        recovered: true,
      };
    }

    return {
      battle,
      recovered: false,
    };
  }

  const rewardResolution = recoveredBattle.result === 'VICTORY'
    ? RewardEngine.applyVictoryRewards(recoveredBattle, resolveVictoryRewardOptions(player, recoveredBattle, random), random)
    : { battle: recoveredBattle, droppedRune: null };

  const finalized = await repository.finalizeBattle(player.playerId, rewardResolution.battle, options);

  return {
    battle: finalized.battle,
    recovered: true,
  };
};
