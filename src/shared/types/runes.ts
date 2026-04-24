import type { StatBlock, StatKey } from './stats';

export type RuneRarity = 'USUAL' | 'UNUSUAL' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHICAL';
export type AbilityKind = 'ACTIVE' | 'PASSIVE';
export type AbilityTarget = 'SELF' | 'ENEMY' | 'BATTLEFIELD';

export interface RuneDraft extends StatBlock {
  runeCode?: string | null;
  archetypeCode?: string | null;
  activeAbilityCodes?: string[];
  passiveAbilityCodes?: string[];
  name: string;
  rarity: RuneRarity;
  isEquipped: boolean;
  equippedSlot?: number | null;
}

export interface RuneView extends RuneDraft {
  id: string;
  createdAt: string;
}

export interface AbilityDefinition {
  code: string;
  name: string;
  description: string;
  kind: AbilityKind;
  target: AbilityTarget;
  runeArchetypeCode: string;
  manaCost: number;
  cooldownTurns: number;
  tags: string[];
}

export interface SchoolDefinition {
  code: string;
  name: string;
  nameGenitive: string;
  starterArchetypeCode: string;
  styleLine: string;
  playPatternLine: string;
  battleLine: string;
  passiveLine: string;
}

export interface RuneArchetypeDefinition {
  code: string;
  schoolCode: string;
  name: string;
  description: string;
  passiveAbilityCodes: string[];
  activeAbilityCodes: string[];
  preferredStats: StatKey[];
}
