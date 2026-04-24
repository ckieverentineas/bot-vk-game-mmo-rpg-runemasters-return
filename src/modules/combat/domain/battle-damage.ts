import type { BattlePlayerSnapshot, BattleView } from '../../../shared/types/game';

export interface GuardDamageResult {
  readonly blockedDamage: number;
  readonly dealtDamage: number;
}

export const getGuardPoints = (player: BattlePlayerSnapshot): number => player.guardPoints ?? 0;

export const addGuardPoints = (
  player: BattlePlayerSnapshot,
  guardGain: number,
  guardCap: number,
): void => {
  player.guardPoints = Math.min(guardCap, getGuardPoints(player) + guardGain);
};

export const consumeGuardAgainstDamage = (
  player: BattlePlayerSnapshot,
  rawDamage: number,
): GuardDamageResult => {
  const guardPoints = getGuardPoints(player);
  const blockedDamage = Math.min(guardPoints, rawDamage);
  const dealtDamage = rawDamage - blockedDamage;

  player.guardPoints = Math.max(0, guardPoints - blockedDamage);

  return {
    blockedDamage,
    dealtDamage,
  };
};

export const applyDamageToEnemy = (battle: BattleView, damage: number): void => {
  battle.enemy.currentHealth = Math.max(0, battle.enemy.currentHealth - damage);
};
