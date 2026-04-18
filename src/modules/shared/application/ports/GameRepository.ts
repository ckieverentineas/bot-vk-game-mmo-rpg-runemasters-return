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

export interface FinalizeBattleResult {
  readonly player: PlayerState;
  readonly battle: BattleView;
}

export interface GameRepository {
  findPlayerByVkId(vkId: number): Promise<PlayerState | null>;
  findPlayerById(playerId: number): Promise<PlayerState | null>;
  deletePlayerByVkId(vkId: number): Promise<void>;
  createPlayer(vkId: number): Promise<PlayerState>;
  saveAllocation(playerId: number, allocationPoints: StatBlock, unspentStatPoints: number): Promise<PlayerState>;
  saveExplorationState(
    playerId: number,
    state: Pick<PlayerState, 'locationLevel' | 'highestLocationLevel' | 'victoryStreak' | 'defeatStreak' | 'tutorialState'>,
  ): Promise<PlayerState>;
  saveRuneCursor(playerId: number, currentRuneIndex: number): Promise<PlayerState>;
  equipRune(playerId: number, runeId: string | null): Promise<PlayerState>;
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
