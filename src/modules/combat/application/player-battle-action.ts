import type {
  BattleActionType,
  BattleView,
  PlayerSkillPointGain,
} from '../../../shared/types/game';
import type { GameRandom } from '../../shared/application/ports/GameRandom';
import { BattleEngine } from '../domain/battle-engine';
import { resolveBattleActionSkillGains } from '../domain/battle-action-skill-growth';

export interface PlayerBattleActionResolution {
  readonly battle: BattleView;
  readonly playerSkillGains: readonly PlayerSkillPointGain[];
}

const resolveFleeSucceeded = (
  battle: BattleView,
  action: BattleActionType,
  random: Pick<GameRandom, 'rollPercentage'>,
): boolean => (
  action === 'FLEE'
  && battle.encounter?.canFlee === true
  && random.rollPercentage(battle.encounter.fleeChancePercent)
);

export const resolvePlayerBattleAction = (
  battle: BattleView,
  action: BattleActionType,
  random: Pick<GameRandom, 'rollPercentage'>,
): PlayerBattleActionResolution => {
  const fleeSucceeded = resolveFleeSucceeded(battle, action, random);
  const battleAfterPlayerAction = BattleEngine.performPlayerAction(battle, action, { fleeSucceeded });
  const playerSkillGains = resolveBattleActionSkillGains({
    action,
    before: battle,
    afterPlayerAction: battleAfterPlayerAction,
  });

  return {
    battle: battleAfterPlayerAction,
    playerSkillGains,
  };
};
