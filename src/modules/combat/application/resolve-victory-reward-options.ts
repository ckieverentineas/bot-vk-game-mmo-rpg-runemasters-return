import { gameBalance } from '../../../config/game-balance';
import type { BattleView, PlayerState } from '../../../shared/types/game';
import { getSchoolDefinitionForArchetype } from '../../runes/domain/rune-schools';
import type { GameRandom } from '../../shared/application/ports/GameRandom';
import { systemGameRandom } from '../../shared/infrastructure/random/SystemGameRandom';
import { RuneFactory } from '../../runes/domain/rune-factory';
import {
  getSchoolNovicePathDefinitionForEnemy,
  hasRuneOfSchoolAtLeastRarity,
} from '../../player/domain/school-novice-path';
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

  const novicePath = getSchoolNovicePathDefinitionForEnemy(battle.enemy.code);
  if (novicePath) {
    const currentSchoolCode = battle.player.runeLoadout?.schoolCode
      ?? getSchoolDefinitionForArchetype(battle.player.runeLoadout?.archetypeCode)?.code
      ?? null;
    const requiredRarity = novicePath.minibossEnemyCode && novicePath.minibossRewardRarity && battle.enemy.code === novicePath.minibossEnemyCode
      ? novicePath.minibossRewardRarity
      : novicePath.rewardRarity;

    if (
      currentSchoolCode === novicePath.schoolCode
      && !hasRuneOfSchoolAtLeastRarity(player, novicePath.schoolCode, requiredRarity)
    ) {
      return {
        forcedRune: RuneFactory.create(
          Math.max(gameBalance.world.minAdventureLocationLevel, battle.locationLevel),
          requiredRarity,
          novicePath.forcedArchetypeCode,
          random,
        ),
      };
    }
  }

  return {};
};
