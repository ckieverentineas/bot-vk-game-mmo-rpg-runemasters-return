import type {
  BattleView,
  CreateBattleInput,
  InventoryDelta,
  PlayerSkillPointGain,
  PlayerState,
  ResourceReward,
  RuneDraft,
  RuneRarity,
  StatBlock,
} from '../../../../shared/types/game';
import type {
  PendingRewardAppliedResultSnapshot,
  PendingRewardOpenSnapshotV1,
} from '../../../rewards/domain/pending-reward-snapshot';
import type { TrophyActionCode } from '../../../rewards/domain/trophy-actions';
import type {
  PlayerBlueprintView,
  PlayerCraftedItemView,
  WorkshopCommandIntentKey,
  WorkshopMutationOptions,
} from '../../../workshop/application/workshop-persistence';
import type { WorkshopBlueprintCode } from '../../../workshop/domain/workshop-catalog';

export type RuneLoadoutCommandIntentKey = 'EQUIP_RUNE' | 'UNEQUIP_RUNE';
export type RuneNavigationCommandIntentKey = 'MOVE_RUNE_CURSOR' | 'SELECT_RUNE_PAGE_SLOT';
export type RuneCraftCommandIntentKey = 'CRAFT_RUNE' | 'REROLL_RUNE_STAT' | 'DESTROY_RUNE' | 'CRAFT_ITEM';
export type ExplorationCommandIntentKey = 'ENTER_TUTORIAL_MODE' | 'SKIP_TUTORIAL' | 'RETURN_TO_ADVENTURE' | 'EXPLORE_LOCATION';
export type QuestRewardCommandIntentKey = 'CLAIM_QUEST_REWARD';
export type DailyActivityCommandIntentKey = 'CLAIM_DAILY_TRACE';
export type BattleActionCommandIntentKey =
  | 'BATTLE_ENGAGE'
  | 'BATTLE_FLEE'
  | 'BATTLE_ATTACK'
  | 'BATTLE_DEFEND'
  | 'BATTLE_RUNE_SKILL';
export type BattleCommandIntentKey = BattleActionCommandIntentKey | 'EXPLORE_LOCATION';
export type GameCommandIntentKey =
  | RuneCraftCommandIntentKey
  | RuneLoadoutCommandIntentKey
  | RuneNavigationCommandIntentKey
  | ExplorationCommandIntentKey
  | QuestRewardCommandIntentKey
  | DailyActivityCommandIntentKey
  | WorkshopCommandIntentKey
  | BattleActionCommandIntentKey;

export interface SaveRuneLoadoutOptions {
  readonly commandKey?: RuneLoadoutCommandIntentKey;
  readonly targetSlot?: number;
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly expectedPlayerUpdatedAt?: string;
  readonly expectedCurrentRuneIndex?: number;
  readonly expectedUnlockedRuneSlotCount?: number;
  readonly expectedSelectedRuneId?: string | null;
  readonly expectedEquippedRuneId?: string | null;
  readonly expectedEquippedRuneIdsBySlot?: readonly (string | null)[];
  readonly expectedRuneIds?: readonly string[];
}

export interface SaveRuneCursorOptions {
  readonly commandKey?: RuneNavigationCommandIntentKey;
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly expectedPlayerUpdatedAt?: string;
}

export interface SaveExplorationOptions {
  readonly commandKey?: ExplorationCommandIntentKey;
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly expectedActiveBattleId?: string | null;
  readonly expectedLocationLevel?: number;
  readonly expectedHighestLocationLevel?: number;
  readonly expectedVictoryStreak?: number;
  readonly expectedDefeatStreak?: number;
  readonly expectedTutorialState?: PlayerState['tutorialState'];
}

export interface SaveBattleOptions {
  readonly commandKey?: BattleCommandIntentKey;
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly currentStateKey?: string;
  readonly playerSkillGains?: readonly PlayerSkillPointGain[];
}

export interface RecordInventoryDeltaResultOptions {
  readonly commandKey: GameCommandIntentKey;
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly currentStateKey?: string;
}

export interface RecordPlayerVitalsResultOptions {
  readonly commandKey: GameCommandIntentKey;
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly currentStateKey?: string;
}

export interface ClaimQuestRewardOptions {
  readonly commandKey: QuestRewardCommandIntentKey;
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly currentStateKey?: string;
}

export interface ClaimDailyActivityRewardOptions {
  readonly commandKey: DailyActivityCommandIntentKey;
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly currentStateKey?: string;
}

export interface CreateBattleOptions {
  readonly commandKey?: 'EXPLORE_LOCATION';
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly currentStateKey?: string;
}

export interface FinalizeBattleResult {
  readonly player: PlayerState;
  readonly battle: BattleView;
}

export interface CollectPendingRewardResult {
  readonly player: PlayerState;
  readonly ledgerKey: string;
  readonly selectedActionCode: TrophyActionCode;
  readonly appliedResult: PendingRewardAppliedResultSnapshot;
}

export interface QuestRewardClaimResult {
  readonly player: PlayerState;
  readonly questCode: string;
  readonly reward: ResourceReward;
  readonly claimed: boolean;
}

export interface DailyActivityRewardClaimResult {
  readonly player: PlayerState;
  readonly activityCode: string;
  readonly gameDay: string;
  readonly reward: ResourceReward;
  readonly claimed: boolean;
}

export interface BestiaryEnemyVictoryCountView {
  readonly enemyCode: string;
  readonly victoryCount: number;
}

export interface BestiaryEnemyKillMilestoneClaimView {
  readonly enemyCode: string;
  readonly threshold: number;
}

export interface BestiaryLocationDiscoveryRewardClaimResult {
  readonly player: PlayerState;
  readonly biomeCode: string;
  readonly reward: ResourceReward;
  readonly claimed: boolean;
}

export interface BestiaryEnemyKillMilestoneRewardClaimResult {
  readonly player: PlayerState;
  readonly enemyCode: string;
  readonly threshold: number;
  readonly reward: ResourceReward;
  readonly claimed: boolean;
}

export interface PendingRewardSourceView {
  readonly battleId: string;
  readonly enemyCode: string;
  readonly enemyName: string;
  readonly enemyKind: string;
}

export interface PendingRewardView {
  readonly ledgerKey: string;
  readonly source: PendingRewardSourceView | null;
  readonly snapshot: PendingRewardOpenSnapshotV1;
}

export interface BestiaryDiscoveryView {
  readonly discoveredEnemyCodes: readonly string[];
  readonly rewardedEnemyCodes: readonly string[];
  readonly enemyVictoryCounts: readonly BestiaryEnemyVictoryCountView[];
  readonly claimedLocationRewardCodes: readonly string[];
  readonly claimedKillMilestones: readonly BestiaryEnemyKillMilestoneClaimView[];
}

export interface RecoverPendingRewardsResult {
  readonly scanned: number;
  readonly recovered: number;
  readonly skipped: number;
}

export interface CommandIntentReplayResult<TResult = PlayerState> {
  readonly status: 'APPLIED' | 'PENDING';
  readonly result?: TResult;
}

export interface CreatePlayerResult {
  readonly player: PlayerState;
  readonly created: boolean;
  readonly recoveredFromRace: boolean;
}

export interface GameRepository {
  findPlayerByVkId(vkId: number): Promise<PlayerState | null>;
  findPlayerById(playerId: number): Promise<PlayerState | null>;
  deletePlayerByVkId(vkId: number, expectedUpdatedAt?: string): Promise<void>;
  confirmDeletePlayer(vkId: number, intentId: string, stateKey: string): Promise<void>;
  createPlayer(vkId: number): Promise<CreatePlayerResult>;
  getCommandIntentResult<TResult = PlayerState>(
    playerId: number,
    intentId: string,
    expectedCommandKeys?: readonly string[],
    expectedStateKey?: string,
  ): Promise<CommandIntentReplayResult<TResult> | null>;
  storeCommandIntentResult<TResult>(playerId: number, intentId: string, result: TResult): Promise<void>;
  recordCommandIntentResult<TResult>(
    playerId: number,
    commandKey: GameCommandIntentKey,
    intentId: string | undefined,
    intentStateKey: string | undefined,
    currentStateKey: string | undefined,
    result: TResult,
  ): Promise<TResult>;
  recordInventoryDeltaResult<TResult>(
    playerId: number,
    delta: InventoryDelta,
    options: RecordInventoryDeltaResultOptions,
    buildResult: (player: PlayerState) => TResult,
  ): Promise<TResult>;
  recordPlayerVitalsResult<TResult>(
    playerId: number,
    vitals: Required<Pick<PlayerState, 'currentHealth' | 'currentMana'>>,
    options: RecordPlayerVitalsResultOptions,
    buildResult: (player: PlayerState) => TResult,
  ): Promise<TResult>;
  applyPlayerSkillExperience(playerId: number, gains: readonly PlayerSkillPointGain[]): Promise<PlayerState>;
  listClaimedQuestRewardCodes(playerId: number): Promise<readonly string[]>;
  listBestiaryDiscovery(playerId: number): Promise<BestiaryDiscoveryView>;
  claimBestiaryLocationDiscoveryReward(
    playerId: number,
    biomeCode: string,
    reward: ResourceReward,
  ): Promise<BestiaryLocationDiscoveryRewardClaimResult>;
  claimBestiaryEnemyKillMilestoneReward(
    playerId: number,
    enemyCode: string,
    threshold: number,
    reward: ResourceReward,
  ): Promise<BestiaryEnemyKillMilestoneRewardClaimResult>;
  claimQuestReward(
    playerId: number,
    questCode: string,
    reward: ResourceReward,
    options?: ClaimQuestRewardOptions,
  ): Promise<QuestRewardClaimResult>;
  claimDailyActivityReward(
    playerId: number,
    activityCode: string,
    gameDay: string,
    reward: ResourceReward,
    options?: ClaimDailyActivityRewardOptions,
  ): Promise<DailyActivityRewardClaimResult>;
  findPendingReward(playerId: number): Promise<PendingRewardView | null>;
  collectPendingReward(playerId: number, ledgerKey: string, actionCode: TrophyActionCode): Promise<CollectPendingRewardResult>;
  recoverPendingRewardsOnStart(): Promise<RecoverPendingRewardsResult>;
  saveExplorationState(
    playerId: number,
    state: Pick<PlayerState, 'locationLevel' | 'highestLocationLevel' | 'victoryStreak' | 'defeatStreak' | 'tutorialState'>,
    options?: SaveExplorationOptions,
  ): Promise<PlayerState>;
  saveRuneCursor(playerId: number, currentRuneIndex: number, options?: SaveRuneCursorOptions): Promise<PlayerState>;
  equipRune(playerId: number, runeId: string | null, options?: SaveRuneLoadoutOptions): Promise<PlayerState>;
  createRune(playerId: number, rune: RuneDraft): Promise<PlayerState>;
  craftRune(playerId: number, rarity: RuneRarity, rune: RuneDraft, intentId?: string, intentStateKey?: string, currentStateKey?: string): Promise<PlayerState>;
  updateRuneStats(playerId: number, runeId: string, stats: StatBlock): Promise<PlayerState>;
  rerollRuneStat(playerId: number, runeId: string, rarity: RuneRarity, stats: StatBlock, intentId?: string, intentStateKey?: string, currentStateKey?: string): Promise<PlayerState>;
  deleteRune(playerId: number, runeId: string): Promise<PlayerState>;
  destroyRune(playerId: number, runeId: string, refund: InventoryDelta, intentId?: string, intentStateKey?: string, currentStateKey?: string): Promise<PlayerState>;
  craftPlayerItem(playerId: number, cost: InventoryDelta, statDelta: StatBlock, intentId?: string, intentStateKey?: string, currentStateKey?: string): Promise<PlayerState>;
  listPlayerBlueprints(playerId: number): Promise<readonly PlayerBlueprintView[]>;
  listPlayerCraftedItems(playerId: number): Promise<readonly PlayerCraftedItemView[]>;
  grantPlayerBlueprint(
    playerId: number,
    blueprintCode: WorkshopBlueprintCode,
    quantity: number,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerBlueprintView>;
  craftWorkshopItem(
    playerId: number,
    blueprintCode: WorkshopBlueprintCode,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView>;
  repairWorkshopItem(
    playerId: number,
    itemId: string,
    repairBlueprintCode: WorkshopBlueprintCode,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView>;
  equipWorkshopItem(
    playerId: number,
    itemId: string,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView>;
  unequipWorkshopItem(
    playerId: number,
    itemId: string,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView>;
  adjustInventory(playerId: number, delta: InventoryDelta): Promise<PlayerState>;
  createBattle(playerId: number, battle: CreateBattleInput, options?: CreateBattleOptions): Promise<BattleView>;
  getActiveBattle(playerId: number): Promise<BattleView | null>;
  saveBattle(battle: BattleView, options?: SaveBattleOptions): Promise<BattleView>;
  finalizeBattle(playerId: number, battle: BattleView, options?: SaveBattleOptions): Promise<FinalizeBattleResult>;
  log(userId: number, action: string, details: unknown): Promise<void>;
}
