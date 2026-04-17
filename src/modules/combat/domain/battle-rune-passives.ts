import type { BattleView } from '../../../shared/types/game';

const hasPassive = (battle: BattleView, code: string): boolean => (
  battle.player.runeLoadout?.passiveAbilityCodes.includes(code) ?? false
);

export const resolveEmberAttackBonus = (battle: BattleView): number => (
  hasPassive(battle, 'ember_heart') ? 1 : 0
);

export const resolveStoneGuardGainBonus = (battle: BattleView): number => (
  hasPassive(battle, 'stone_guard') ? 2 : 0
);

export const resolveStoneGuardCapBonus = (battle: BattleView): number => (
  hasPassive(battle, 'stone_guard') ? 2 : 0
);

export const resolveEchoIntentAttackBonus = (battle: BattleView): number => {
  if (!hasPassive(battle, 'echo_mind') || !battle.enemy.intent) {
    return 0;
  }

  return 1 + Math.floor(battle.player.intelligence / 2);
};
