export type StatKey = 'health' | 'attack' | 'defence' | 'magicDefence' | 'dexterity' | 'intelligence';
export type TurnOwner = 'PLAYER' | 'ENEMY';
export type BattleActionType = 'ENGAGE' | 'FLEE' | 'ATTACK' | 'DEFEND' | 'RUNE_SKILL' | 'RUNE_SKILL_SLOT_1' | 'RUNE_SKILL_SLOT_2';
export type BattleStatus = 'ACTIVE' | 'COMPLETED';
export type BattleResult = 'VICTORY' | 'DEFEAT' | 'FLED';
export type BattleEnemyIntentCode = 'HEAVY_STRIKE' | 'GUARD_BREAK';
export type TutorialState = 'ACTIVE' | 'SKIPPED' | 'COMPLETED';
export type RuneRarity = 'USUAL' | 'UNUSUAL' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHICAL';
export type ShardField = 'usualShards' | 'unusualShards' | 'rareShards' | 'epicShards' | 'legendaryShards' | 'mythicalShards';
export type MaterialField = 'leather' | 'bone' | 'herb' | 'essence' | 'metal' | 'crystal';
export type InventoryField = ShardField | MaterialField;
export type AbilityKind = 'ACTIVE' | 'PASSIVE';
export type AbilityTarget = 'SELF' | 'ENEMY' | 'BATTLEFIELD';
export type PlayerSkillCategory = 'combat' | 'defence' | 'gathering' | 'rune';
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
export type PlayerSkillCode = GatheringSkillCode | CombatSkillCode | DefenceSkillCode | RuneSkillCode;

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
export type BlueprintDelta = Partial<Record<string, number>>;

export interface ResourceReward {
  readonly gold?: number;
  readonly radiance?: number;
  readonly inventoryDelta?: InventoryDelta;
  readonly blueprintDelta?: BlueprintDelta;
}

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

export interface PlayerState {
  userId: number;
  vkId: number;
  playerId: number;
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
  supportRuneLoadout?: BattleRuneLoadoutSnapshot | null;
  workshopLoadout?: BattleWorkshopItemSnapshot[];
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
  runeRarity?: RuneRarity | null;
  schoolProgressStage?: 'FIRST_SIGN' | 'SEAL' | null;
  archetypeCode: string | null;
  archetypeName: string | null;
  schoolCode?: string | null;
  schoolMasteryRank?: number;
  passiveAbilityCodes: string[];
  activeAbility: BattleRuneActionSnapshot | null;
}

export interface BattleWorkshopItemSnapshot {
  id: string;
  itemCode: string;
  itemClass: string;
  slot: string;
  durability: number;
  maxDurability: number;
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
  lootTable?: InventoryLoot;
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

export type BattleEncounterKind =
  | 'TRAIL'
  | 'AMBUSH'
  | 'WEARY_ENEMY'
  | 'ELITE_TRAIL';

export interface BattleEncounterView {
  status: 'OFFERED' | 'ENGAGED' | 'FLED';
  initialTurnOwner: TurnOwner;
  canFlee: boolean;
  fleeChancePercent: number;
  kind?: BattleEncounterKind;
  title?: string;
  description?: string;
  effectLine?: string;
}

export interface BattleRewardView {
  experience: number;
  gold: number;
  shards: Partial<Record<RuneRarity, number>>;
  droppedRune: RuneDraft | null;
}

export interface BattlePartyMemberSnapshot {
  playerId: number;
  vkId: number;
  name: string;
  snapshot: BattlePlayerSnapshot;
}

export interface BattlePartySnapshot {
  id: string;
  inviteCode: string;
  leaderPlayerId: number;
  currentTurnPlayerId: number | null;
  enemyTargetPlayerId: number | null;
  actedPlayerIds: number[];
  members: BattlePartyMemberSnapshot[];
}

export type PartyStatus = 'OPEN' | 'IN_BATTLE' | 'COMPLETED';

export interface PartyMemberView {
  playerId: number;
  vkId: number;
  name: string;
  role: 'LEADER' | 'MEMBER';
  joinedAt: string;
}

export interface PartyView {
  id: string;
  inviteCode: string;
  leaderPlayerId: number;
  status: PartyStatus;
  activeBattleId: string | null;
  maxMembers: number;
  members: PartyMemberView[];
  createdAt: string;
  updatedAt: string;
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

export interface BattleView {
  id: string;
  playerId: number;
  status: BattleStatus;
  battleType: 'PVE' | 'PARTY_PVE';
  actionRevision: number;
  locationLevel: number;
  biomeCode: string;
  enemyCode: string;
  turnOwner: TurnOwner;
  player: BattlePlayerSnapshot;
  enemy: BattleEnemySnapshot;
  party?: BattlePartySnapshot | null;
  encounter?: BattleEncounterView | null;
  log: string[];
  result: BattleResult | null;
  rewards: BattleRewardView | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateBattleInput = Omit<BattleView, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>;
