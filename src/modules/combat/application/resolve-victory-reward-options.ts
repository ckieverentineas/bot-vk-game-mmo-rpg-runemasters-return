import { gameBalance } from '../../../config/game-balance';
import type { BattleView, PlayerState } from '../../../shared/types/game';
import type { GameRandom } from '../../shared/application/ports/GameRandom';
import { systemGameRandom } from '../../shared/infrastructure/random/SystemGameRandom';
import { RuneFactory } from '../../runes/domain/rune-factory';
import type { VictoryRewardOptions } from '../domain/reward-engine';

export const resolveVictoryRewardOptions = (
  player: Pick<PlayerState, 'tutorialState' | 'runes'>,
  battle: BattleView,
  random: GameRandom = systemGameRandom,
): VictoryRewardOptions => {
  if (
    player.tutorialState === 'ACTIVE'
    && player.runes.length === 0
    && battle.locationLevel === gameBalance.world.introLocationLevel
    && battle.enemy.code === 'training-wisp'
  ) {
    return {
      forcedRune: RuneFactory.create(gameBalance.world.minAdventureLocationLevel, 'UNUSUAL', 'ember', random),
    };
  }

  return {};
};
