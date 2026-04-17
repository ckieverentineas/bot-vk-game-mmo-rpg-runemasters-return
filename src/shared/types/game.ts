export type StatKey = 'health' | 'attack' | 'defence' | 'magicDefence' | 'dexterity' | 'intelligence';
export type TurnOwner = 'PLAYER' | 'ENEMY';
export type BattleActionType = 'ATTACK' | 'DEFEND' | 'RUNE_SKILL';
export type BattleStatus = 'ACTIVE' | 'COMPLETED';
export type BattleResult = 'VICTORY' | 'DEFEAT';
export type BattleEnemyIntentCode = 'HEAVY_STRIKE' | 'GUARD_BREAK';
export type TutorialState = 'ACTIVE' | 'SKIPPED' | 'COMPLETED';
export type RuneRarity = 'USUAL' | 'UNUSUAL' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHICAL';
export type ShardField = 'usualShards' | 'unusualShards' | 'rareShards' | 'epicShards' | 'legendaryShards' | 'mythicalShards';
export type MaterialField = 'leather' | 'bone' | 'herb' | 'essence' | 'metal' | 'crystal';
export type InventoryField = ShardField | MaterialField;
export type AbilityKind = 'ACTIVE' | 'PASSIVE';
export type AbilityTarget = 'SELF' | 'ENEMY' | 'BATTLEFIELD';

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

export interface InventoryView {
  usualShards: number;
  unusualShards: number;
  rareShards: number;
  epicShards: number;
  legendaryShards: number;
  mythicalShards: number;
  leather: number;
  bone: number;
  herb: number;
  essence: number;
  metal: number;
  crystal: number;
}

export type InventoryDelta = Partial<Record<InventoryField, number>>;
export type InventoryLoot = Partial<Record<MaterialField, number>>;

export interface RuneDraft extends StatBlock {
  runeCode?: string | null;
  archetypeCode?: string | null;
  activeAbilityCodes?: string[];
  passiveAbilityCodes?: string[];
  name: string;
  rarity: RuneRarity;
  isEquipped: boolean;
}

export interface RuneView extends RuneDraft {
  id: string;
  createdAt: string;
}

export interface PlayerState {
  userId: number;
  vkId: number;
  playerId: number;
  level: number;
  experience: number;
  gold: number;
  baseStats: StatBlock;
  allocationPoints: StatBlock;
  unspentStatPoints: number;
  locationLevel: number;
  currentRuneIndex: number;
  activeBattleId: string | null;
  victories: number;
  victoryStreak: number;
  defeats: number;
  defeatStreak: number;
  mobsKilled: number;
  highestLocationLevel: number;
  tutorialState: TutorialState;
  inventory: InventoryView;
  runes: RuneView[];
  createdAt: string;
  updatedAt: string;
}

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

export interface BattlePlayerSnapshot {
  playerId: number;
  name: string;
  attack: number;
  defence: number;
  magicDefence: number;
  dexterity: number;
  intelligence: number;
  maxHealth: number;
  currentHealth: number;
  maxMana: number;
  currentMana: number;
  runeLoadout?: BattleRuneLoadoutSnapshot | null;
  guardPoints?: number;
}

export interface BattleRuneActionSnapshot {
  code: string;
  name: string;
  manaCost: number;
  cooldownTurns: number;
  currentCooldown: number;
}

export interface BattleRuneLoadoutSnapshot {
  runeId: string;
  runeName: string;
  archetypeCode: string | null;
  archetypeName: string | null;
  passiveAbilityCodes: string[];
  activeAbility: BattleRuneActionSnapshot | null;
}

export interface BattleEnemySnapshot {
  code: string;
  name: string;
  kind: string;
  isElite: boolean;
  isBoss: boolean;
  attack: number;
  defence: number;
  magicDefence: number;
  dexterity: number;
  intelligence: number;
  maxHealth: number;
  currentHealth: number;
  maxMana: number;
  currentMana: number;
  experienceReward: number;
  goldReward: number;
  runeDropChance: number;
  attackText: string;
  intent?: BattleEnemyIntentSnapshot | null;
  hasUsedSignatureMove?: boolean;
}

export interface BattleEnemyIntentSnapshot {
  code: BattleEnemyIntentCode;
  title: string;
  description: string;
  bonusAttack: number;
  shattersGuard?: boolean;
}

export interface BattleRewardView {
  experience: number;
  gold: number;
  shards: Partial<Record<RuneRarity, number>>;
  droppedRune: RuneDraft | null;
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

export interface RuneArchetypeDefinition {
  code: string;
  name: string;
  description: string;
  passiveAbilityCodes: string[];
  activeAbilityCodes: string[];
  preferredStats: StatKey[];
}

export interface BattleView {
  id: string;
  playerId: number;
  status: BattleStatus;
  battleType: 'PVE';
  locationLevel: number;
  biomeCode: string;
  enemyCode: string;
  turnOwner: TurnOwner;
  player: BattlePlayerSnapshot;
  enemy: BattleEnemySnapshot;
  log: string[];
  result: BattleResult | null;
  rewards: BattleRewardView | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateBattleInput = Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>;
