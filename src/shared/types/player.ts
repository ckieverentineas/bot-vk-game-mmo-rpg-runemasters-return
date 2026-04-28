import type { InventoryView } from './inventory';
import type { RuneView } from './runes';
import type { StatBlock } from './stats';

export type TutorialState = 'ACTIVE' | 'SKIPPED' | 'COMPLETED';
export type PlayerSkillCategory = 'combat' | 'defence' | 'gathering' | 'rune' | 'crafting';

export type GatheringSkillCode =
  | 'gathering.skinning'
  | 'gathering.reagent_gathering'
  | 'gathering.essence_extraction';

export type CombatSkillCode =
  | 'combat.striking'
  | 'combat.guard';

export type DefenceSkillCode = 'defence.endurance';

export type RuneSkillCode =
  | 'rune.active_use'
  | 'rune.preparation';

export type CraftingSkillCode =
  | 'crafting.alchemy'
  | 'crafting.workshop';

export type PlayerSkillCode =
  | GatheringSkillCode
  | CombatSkillCode
  | DefenceSkillCode
  | RuneSkillCode
  | CraftingSkillCode;

export interface SchoolMasteryView {
  schoolCode: string;
  experience: number;
  rank: number;
}

export interface PlayerSkillView {
  skillCode: PlayerSkillCode;
  experience: number;
  rank: number;
}

export interface PlayerSkillPointGain {
  skillCode: PlayerSkillCode;
  points: number;
}

export interface PlayerState {
  userId: number;
  vkId: number;
  playerId: number;
  name: string;
  level: number;
  experience: number;
  gold: number;
  radiance: number;
  baseStats: StatBlock;
  currentHealth?: number;
  currentMana?: number;
  locationLevel: number;
  currentRuneIndex: number;
  unlockedRuneSlotCount?: number;
  activeBattleId: string | null;
  victories: number;
  victoryStreak: number;
  defeats: number;
  defeatStreak: number;
  mobsKilled: number;
  highestLocationLevel: number;
  tutorialState: TutorialState;
  inventory: InventoryView;
  schoolMasteries?: SchoolMasteryView[];
  skills?: PlayerSkillView[];
  runes: RuneView[];
  createdAt: string;
  updatedAt: string;
}
