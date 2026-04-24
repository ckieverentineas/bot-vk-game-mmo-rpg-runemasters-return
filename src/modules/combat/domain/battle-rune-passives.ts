import type { BattleView } from '../../../shared/types/game';
import {
  getExactlyReadEnemyIntent,
  getReadableEnemyIntent,
} from './enemy-intent-reading';
import { listBattleRuneLoadouts } from './battle-rune-loadouts';

const hasPassive = (battle: BattleView, code: string): boolean => (
  listBattleRuneLoadouts(battle.player).some(({ loadout }) => loadout.passiveAbilityCodes.includes(code))
);

const countPassive = (battle: BattleView, code: string): number => (
  listBattleRuneLoadouts(battle.player)
    .filter(({ loadout }) => loadout.passiveAbilityCodes.includes(code))
    .length
);

const hasSchoolMastery = (battle: BattleView, schoolCode: string, rank = 1): boolean => (
  listBattleRuneLoadouts(battle.player).some(({ loadout }) => (
    loadout.schoolCode === schoolCode && (loadout.schoolMasteryRank ?? 0) >= rank
  ))
);

const hasSchoolSeal = (battle: BattleView, schoolCode: string): boolean => (
  listBattleRuneLoadouts(battle.player).some(({ loadout }) => (
    loadout.schoolCode === schoolCode && loadout.schoolProgressStage === 'SEAL'
  ))
);

const hasActiveCooldownWindow = (battle: BattleView): boolean => (
  listBattleRuneLoadouts(battle.player).some(({ loadout }) => (
    (loadout.activeAbility?.currentCooldown ?? 0) > 0
  ))
);

const hasRevealedIntent = (battle: BattleView): boolean => getReadableEnemyIntent(battle) !== null;

const isGuardBreakIntent = (battle: BattleView): boolean => getReadableEnemyIntent(battle)?.code === 'GUARD_BREAK';

const isHeavyStrikeIntent = (battle: BattleView): boolean => getReadableEnemyIntent(battle)?.code === 'HEAVY_STRIKE';

export const resolveEmberAttackBonus = (battle: BattleView): number => (
  countPassive(battle, 'ember_heart')
);

export const resolveEmberPressureIntentBonus = (battle: BattleView): number => (
  hasPassive(battle, 'ember_heart') && isGuardBreakIntent(battle) ? 1 : 0
);

export const resolveEmberSealPressureBonus = (battle: BattleView): number => (
  hasSchoolSeal(battle, 'ember') ? 1 : 0
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
  countPassive(battle, 'stone_guard') * 2
);

export const resolveStoneGuardCapBonus = (battle: BattleView): number => (
  countPassive(battle, 'stone_guard') * 2
);

export const resolveStoneHoldIntentGuardBonus = (battle: BattleView): number => (
  hasPassive(battle, 'stone_guard') && isHeavyStrikeIntent(battle) ? 1 : 0
);

export const resolveStoneSealGuardBonus = (battle: BattleView): number => (
  hasSchoolSeal(battle, 'stone') ? 1 : 0
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

export const resolveGaleTempoIntentGuardBonus = (battle: BattleView): number => (
  hasRevealedIntent(battle) ? 1 : 0
);

export const resolveGaleSealTempoGuardBonus = (battle: BattleView): number => (
  hasSchoolSeal(battle, 'gale') ? 1 : 0
);

export const resolveEchoIntentAttackBonus = (battle: BattleView): number => {
  if (!hasPassive(battle, 'echo_mind') || !getExactlyReadEnemyIntent(battle)) {
    return 0;
  }

  return 1 + Math.floor(battle.player.intelligence / 2);
};


export const resolveEchoMasteryAttackBonus = (battle: BattleView): number => (
  hasSchoolMastery(battle, 'echo') && getExactlyReadEnemyIntent(battle) ? 1 : 0
);

export const resolveEchoSealIntentBonus = (battle: BattleView): number => (
  hasSchoolSeal(battle, 'echo') && getExactlyReadEnemyIntent(battle) ? 1 : 0
);
