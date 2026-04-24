import type { BattleView } from '../../../shared/types/game';
import type { GameRandom } from '../../../shared/domain/GameRandom';
import { resolveEnemyTurnWithSignatureReaction } from './resolve-enemy-turn';

export const resolveEnemyResponseIfNeeded = (
  battle: BattleView,
  random: GameRandom,
): BattleView => {
  if (battle.status !== 'ACTIVE') {
    return battle;
  }

  return resolveEnemyTurnWithSignatureReaction(battle, random);
};
