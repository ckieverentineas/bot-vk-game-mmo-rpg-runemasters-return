import type {
  BattleView,
  BiomeView,
  CreateBattleInput,
  InventoryDelta,
  MobTemplateView,
  PlayerState,
  RuneDraft,
  RuneRarity,
  StatBlock,
} from '../../../../shared/types/game';

export type RuneLoadoutCommandIntentKey = 'EQUIP_RUNE' | 'UNEQUIP_RUNE';
export type RuneNavigationCommandIntentKey = 'MOVE_RUNE_CURSOR' | 'SELECT_RUNE_PAGE_SLOT';
export type ExplorationCommandIntentKey = 'ENTER_TUTORIAL_MODE' | 'SKIP_TUTORIAL' | 'RETURN_TO_ADVENTURE';
export type BattleActionCommandIntentKey = 'BATTLE_ATTACK' | 'BATTLE_DEFEND' | 'BATTLE_RUNE_SKILL';
export type BattleCommandIntentKey = BattleActionCommandIntentKey | 'EXPLORE_LOCATION';

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
  adjustInventory(playerId: number, delta: InventoryDelta): Promise<PlayerState>;
  findBiomeForLocationLevel(locationLevel: number): Promise<BiomeView | null>;
  listMobTemplatesForBiome(biomeCode: string): Promise<MobTemplateView[]>;
  createBattle(playerId: number, battle: CreateBattleInput, options?: CreateBattleOptions): Promise<BattleView>;
  getActiveBattle(playerId: number): Promise<BattleView | null>;
  saveBattle(battle: BattleView, options?: SaveBattleOptions): Promise<BattleView>;
  finalizeBattle(playerId: number, battle: BattleView, options?: SaveBattleOptions): Promise<FinalizeBattleResult>;
  log(userId: number, action: string, details: unknown): Promise<void>;
}
