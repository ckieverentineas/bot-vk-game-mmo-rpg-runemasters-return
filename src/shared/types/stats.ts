export type StatKey = 'health' | 'attack' | 'defence' | 'magicDefence' | 'dexterity' | 'intelligence';

export interface StatBlock {
  health: number;
  attack: number;
  defence: number;
  magicDefence: number;
  dexterity: number;
  intelligence: number;
}

export interface StatScaleBlock {
  health: number;
  attack: number;
  defence: number;
  magicDefence: number;
  dexterity: number;
  intelligence: number;
}
