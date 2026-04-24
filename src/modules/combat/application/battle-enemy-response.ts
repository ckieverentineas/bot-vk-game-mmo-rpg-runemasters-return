import type { BattleView } from '../../../shared/types/game';
import type { GameRandom } from '../../shared/application/ports/GameRandom';
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
