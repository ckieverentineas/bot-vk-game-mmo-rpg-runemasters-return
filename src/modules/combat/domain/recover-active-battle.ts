import type { BattleResult, BattleView } from '../../../shared/types/game';
import { cloneJsonValue } from '../../../shared/utils/json';

const createBattleRewards = (battle: BattleView, result: BattleResult): BattleView['rewards'] => (
  result === 'VICTORY'
    ? {
        experience: battle.enemy.experienceReward,
        gold: battle.enemy.goldReward,
        shards: {},
        droppedRune: null,
      }
    : {
        experience: 0,
        gold: 0,
        shards: {},
        droppedRune: null,
      }
);

const completeBattle = (battle: BattleView, result: BattleResult): BattleView => {
  const nextBattle = cloneJsonValue(battle);

  nextBattle.status = 'COMPLETED';
  nextBattle.result = result;
  nextBattle.turnOwner = 'PLAYER';
  nextBattle.rewards = createBattleRewards(nextBattle, result);

  return nextBattle;
};

export const recoverInvalidActiveBattle = (battle: BattleView): BattleView | null => {
  if (battle.status !== 'ACTIVE') {
    return null;
  }

  if (battle.player.currentHealth <= 0) {
    return completeBattle(battle, 'DEFEAT');
  }

  if (battle.enemy.currentHealth <= 0) {
    return completeBattle(battle, 'VICTORY');
  }

  return null;
};
