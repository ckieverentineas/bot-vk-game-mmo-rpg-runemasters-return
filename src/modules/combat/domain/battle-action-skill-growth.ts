import type {
  BattleActionType,
  BattlePlayerSnapshot,
  BattleView,
  PlayerSkillPointGain,
} from '../../../shared/types/game';
import { getBattleRuneLoadoutForAction, isRuneSkillAction } from './battle-rune-loadouts';

interface BattleActionSkillGrowthContext {
  readonly action: BattleActionType;
  readonly before: BattleView;
  readonly afterPlayerAction: BattleView;
}

const battleActionSkillPointGain = 1;

const getGuardPoints = (player: BattlePlayerSnapshot): number => player.guardPoints ?? 0;

const createSkillGain = (skillCode: PlayerSkillPointGain['skillCode']): PlayerSkillPointGain => ({
  skillCode,
  points: battleActionSkillPointGain,
});

const didDamageEnemy = (before: BattleView, after: BattleView): boolean => (
  after.enemy.currentHealth < before.enemy.currentHealth
);

const didRaiseGuard = (before: BattleView, after: BattleView): boolean => (
  getGuardPoints(after.player) > getGuardPoints(before.player)
);

const didUseRuneResources = (
  action: BattleActionType,
  before: BattleView,
  after: BattleView,
): boolean => {
  const beforeAbility = getBattleRuneLoadoutForAction(before, action)?.activeAbility ?? null;
  const afterAbility = getBattleRuneLoadoutForAction(after, action)?.activeAbility ?? null;

  if (!beforeAbility || !afterAbility) {
    return false;
  }

  return after.player.currentMana < before.player.currentMana
    || afterAbility.currentCooldown > beforeAbility.currentCooldown;
};

export const resolveBattleActionSkillGains = ({
  action,
  before,
  afterPlayerAction,
}: BattleActionSkillGrowthContext): readonly PlayerSkillPointGain[] => {
  if (action === 'ATTACK' && didDamageEnemy(before, afterPlayerAction)) {
    return [createSkillGain('combat.striking')];
  }

  if (action === 'DEFEND' && didRaiseGuard(before, afterPlayerAction)) {
    return [createSkillGain('combat.guard')];
  }

  if (isRuneSkillAction(action) && didUseRuneResources(action, before, afterPlayerAction)) {
    return [createSkillGain('rune.active_use')];
  }

  return [];
};
