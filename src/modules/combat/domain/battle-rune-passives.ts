import type { BattleView } from '../../../shared/types/game';

const hasPassive = (battle: BattleView, code: string): boolean => (
  battle.player.runeLoadout?.passiveAbilityCodes.includes(code) ?? false
);

const hasSchoolMastery = (battle: BattleView, schoolCode: string, rank = 1): boolean => (
  battle.player.runeLoadout?.schoolCode === schoolCode
  && (battle.player.runeLoadout?.schoolMasteryRank ?? 0) >= rank
);

const hasActiveCooldownWindow = (battle: BattleView): boolean => (
  (battle.player.runeLoadout?.activeAbility?.currentCooldown ?? 0) > 0
);

export const resolveEmberAttackBonus = (battle: BattleView): number => (
  hasPassive(battle, 'ember_heart') ? 1 : 0
);

export const resolveEmberExecutionBonus = (battle: BattleView): number => (
  hasSchoolMastery(battle, 'ember') && battle.enemy.currentHealth <= Math.ceil(battle.enemy.maxHealth / 2)
    ? 1
    : 0
);

export const resolveEmberComboBonus = (battle: BattleView): number => (
  hasSchoolMastery(battle, 'ember')
    && hasActiveCooldownWindow(battle)
    && battle.enemy.currentHealth <= Math.ceil(battle.enemy.maxHealth / 2)
    ? 1
    : 0
);

export const resolveStoneGuardGainBonus = (battle: BattleView): number => (
  hasPassive(battle, 'stone_guard') ? 2 : 0
);

export const resolveStoneGuardCapBonus = (battle: BattleView): number => (
  hasPassive(battle, 'stone_guard') ? 2 : 0
);

export const resolveStoneMasteryGuardGainBonus = (battle: BattleView): number => (
  hasSchoolMastery(battle, 'stone') ? 1 : 0
);

export const resolveStoneSynergyDamageBonus = (battle: BattleView): number => (
  hasSchoolMastery(battle, 'stone') && (battle.player.guardPoints ?? 0) > 0 ? 1 : 0
);

export const resolveStoneSynergyGuardBonus = (battle: BattleView): number => (
  hasSchoolMastery(battle, 'stone') && (battle.player.guardPoints ?? 0) > 0 ? 1 : 0
);

export const resolveGaleMasteryAttackGuardGain = (battle: BattleView): number => (
  hasSchoolMastery(battle, 'gale') ? 1 : 0
);

export const resolveEchoIntentAttackBonus = (battle: BattleView): number => {
  if (!hasPassive(battle, 'echo_mind') || !battle.enemy.intent) {
    return 0;
  }

  return 1 + Math.floor(battle.player.intelligence / 2);
};

export const resolveEchoMasteryAttackBonus = (battle: BattleView): number => (
  hasSchoolMastery(battle, 'echo') && battle.enemy.intent ? 1 : 0
);
