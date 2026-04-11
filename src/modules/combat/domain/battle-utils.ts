import { gameBalance } from '../../../config/game-balance';
import type { BattleView } from '../../../shared/types/game';
import { cloneJsonValue } from '../../../shared/utils/json';

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

export const cloneBattle = (battle: BattleView): BattleView => cloneJsonValue(battle);

export const calculatePhysicalDamage = (attack: number, defence: number): number => {
  const mitigatedDamage = attack - Math.floor(defence / 2);
  return Math.max(1, mitigatedDamage + randomInt(-1, 1));
};

export const appendBattleLog = (entries: readonly string[], ...nextEntries: string[]): string[] => (
  [...entries, ...nextEntries].slice(-gameBalance.combat.battleLogLimit)
);
