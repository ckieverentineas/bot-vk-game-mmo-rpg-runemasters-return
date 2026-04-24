import type { InventoryLoot } from './inventory';
import type { StatBlock, StatScaleBlock } from './stats';

export interface BiomeView {
  id: number;
  code: string;
  name: string;
  description: string;
  minLevel: number;
  maxLevel: number;
}

export interface MobTemplateView {
  code: string;
  biomeCode: string;
  name: string;
  kind: string;
  isElite: boolean;
  isBoss: boolean;
  baseStats: StatBlock;
  scales: StatScaleBlock;
  baseExperience: number;
  baseGold: number;
  runeDropChance: number;
  lootTable: InventoryLoot;
  attackText: string;
}
