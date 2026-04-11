export interface BiomeSeedDefinition {
  code: string;
  name: string;
  description: string;
  minLevel: number;
  maxLevel: number;
}

export interface MobTemplateSeedDefinition {
  biomeCode: string;
  code: string;
  name: string;
  kind: string;
  isElite: boolean;
  isBoss: boolean;
  baseHealth: number;
  baseAttack: number;
  baseDefence: number;
  baseMagicDefence: number;
  baseDexterity: number;
  baseIntelligence: number;
  healthScale: number;
  attackScale: number;
  defenceScale: number;
  magicDefenceScale: number;
  dexterityScale: number;
  intelligenceScale: number;
  baseExperience: number;
  baseGold: number;
  runeDropChance: number;
  lootTable: string;
  attackText: string;
}
