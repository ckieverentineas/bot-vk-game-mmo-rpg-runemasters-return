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

export type AllocationCommandIntentKey = 'ALLOCATE_STAT_POINT' | 'RESET_ALLOCATED_STATS';
export type RuneLoadoutCommandIntentKey = 'EQUIP_RUNE' | 'UNEQUIP_RUNE';
export type ExplorationCommandIntentKey = 'SKIP_TUTORIAL' | 'RETURN_TO_ADVENTURE';

export interface SaveAllocationOptions {
  readonly commandKey?: AllocationCommandIntentKey;
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly expectedAllocationPoints?: StatBlock;
  readonly expectedUnspentStatPoints?: number;
}

export interface SaveRuneLoadoutOptions {
  readonly commandKey?: RuneLoadoutCommandIntentKey;
  readonly intentId?: string;
  readonly intentStateKey?: string;
  readonly expectedPlayerUpdatedAt?: string;
  readonly expectedCurrentRuneIndex?: number;
  readonly expectedSelectedRuneId?: string | null;
  readonly expectedEquippedRuneId?: string | null;
  readonly expectedRuneIds?: readonly string[];
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

export interface FinalizeBattleResult {
  readonly player: PlayerState;
  readonly battle: BattleView;
}

export interface CommandIntentReplayResult {
  readonly status: 'APPLIED' | 'PENDING';
  readonly result?: PlayerState;
}

export interface GameRepository {
  findPlayerByVkId(vkId: number): Promise<PlayerState | null>;
  findPlayerById(playerId: number): Promise<PlayerState | null>;
  deletePlayerByVkId(vkId: number, expectedUpdatedAt?: string): Promise<void>;
  createPlayer(vkId: number): Promise<PlayerState>;
  getCommandIntentResult(playerId: number, intentId: string): Promise<CommandIntentReplayResult | null>;
  saveAllocation(playerId: number, allocationPoints: StatBlock, unspentStatPoints: number, options?: SaveAllocationOptions): Promise<PlayerState>;
  saveExplorationState(
    playerId: number,
    state: Pick<PlayerState, 'locationLevel' | 'highestLocationLevel' | 'victoryStreak' | 'defeatStreak' | 'tutorialState'>,
    options?: SaveExplorationOptions,
  ): Promise<PlayerState>;
  saveRuneCursor(playerId: number, currentRuneIndex: number): Promise<PlayerState>;
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
  createBattle(playerId: number, battle: CreateBattleInput): Promise<BattleView>;
  getActiveBattle(playerId: number): Promise<BattleView | null>;
  saveBattle(battle: BattleView): Promise<BattleView>;
  finalizeBattle(playerId: number, battle: BattleView): Promise<FinalizeBattleResult>;
  log(userId: number, action: string, details: unknown): Promise<void>;
}
