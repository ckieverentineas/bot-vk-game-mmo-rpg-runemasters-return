import type { InventoryLoot } from './inventory';
import type { RuneDraft, RuneRarity } from './runes';

export type TurnOwner = 'PLAYER' | 'ENEMY';

export type BattleActionType =
  | 'ENGAGE'
  | 'FLEE'
  | 'ATTACK'
  | 'DEFEND'
  | 'RUNE_SKILL'
  | 'RUNE_SKILL_SLOT_1'
  | 'RUNE_SKILL_SLOT_2'
  | 'USE_HEALING_PILL'
  | 'USE_FOCUS_PILL'
  | 'USE_GUARD_PILL'
  | 'USE_CLARITY_PILL';

export type BattleStatus = 'ACTIVE' | 'COMPLETED';
export type BattleResult = 'VICTORY' | 'DEFEAT' | 'FLED';
export type BattleEnemyIntentCode = 'HEAVY_STRIKE' | 'GUARD_BREAK';

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
  knowledge?: BattleEnemyKnowledgeSnapshot;
  roaming?: BattleEnemyRoamingSnapshot;
  hasUsedSignatureMove?: boolean;
}

export interface BattleEnemyIntentSnapshot {
  code: BattleEnemyIntentCode;
  title: string;
  description: string;
  bonusAttack: number;
  shattersGuard?: boolean;
}

export interface BattleEnemyKnowledgeSnapshot {
  readonly isDiscovered: boolean;
  readonly hasTrophyStudy: boolean;
  readonly victoryCount: number;
}

export type BattleEnemyRoamingDirection = 'LOWER_BIOME' | 'HIGHER_BIOME';

export interface BattleEnemyRoamingSnapshot {
  readonly direction: BattleEnemyRoamingDirection;
  readonly originBiomeCode: string;
  readonly originBiomeName: string;
  readonly levelBonus: number;
  readonly experienceBonus: number;
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
