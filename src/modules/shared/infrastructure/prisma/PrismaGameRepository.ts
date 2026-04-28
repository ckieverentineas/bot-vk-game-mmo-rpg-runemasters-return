import { Prisma, PrismaClient } from '@prisma/client';

import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import { parseJson, stringifyJson } from '../../../../shared/utils/json';
import type {
  BattleView,
  BlueprintDelta,
  BlueprintDrop,
  CreateBattleInput,
  InventoryDelta,
  PartyView,
  PlayerSkillCode,
  PlayerSkillPointGain,
  PlayerState,
  ResourceReward,
  RuneDraft,
  RuneRarity,
  StatBlock,
} from '../../../../shared/types/game';
import { buildBattleSnapshot } from '../../domain/contracts/battle-snapshot';
import {
  derivePostBattleVitals,
  getEquippedRune,
  getEquippedRuneIdsBySlot,
  getSelectedRune,
  getUnlockedRuneSlotCount,
  resolveAdaptiveAdventureLocationLevel,
  resolveLevelProgression,
  shardFieldForRarity,
} from '../../../player/domain/player-stats';
import {
  applySchoolMasteryExperience,
  resolveBattleSchoolMasteryRewardGain,
  resolveUnlockedRuneSlotCountFromSchoolMasteries,
} from '../../../player/domain/school-mastery';
import { applyPlayerSkillExperience as applyPlayerSkillExperienceDomain } from '../../../player/domain/player-skills';
import { getSchoolNovicePathDefinitionForEnemy, hasRuneOfSchoolAtLeastRarity } from '../../../player/domain/school-novice-path';
import {
  type PendingRewardAppliedResultSnapshot,
  type PendingRewardSkillUpSnapshot,
  type PendingRewardWorkshopItemDurabilityChangeSnapshot,
} from '../../../rewards/domain/pending-reward-snapshot';
import type {
  TrophyActionCode,
} from '../../../rewards/domain/trophy-actions';
import { resolveTrophyToolItemCodes } from '../../../rewards/domain/trophy-tool-requirements';
import {
  buildPendingRewardInventoryDelta,
  buildPendingRewardSkillPointGains,
  createAppliedPendingRewardLedger,
  createPendingRewardLedgerForBattle,
  findPendingRewardTrophyAction,
  resolveBattlePlayerSchoolCode,
} from '../../../rewards/application/pending-reward-pipeline';
import { getSchoolDefinitionForArchetype } from '../../../runes/domain/rune-schools';
import {
  resolveRuneCraftSpend,
  resolveRuneRerollSpend,
} from '../../../runes/domain/rune-economy';
import {
  getWorkshopBlueprint,
  isWorkshopBlueprintCode,
  isWorkshopBlueprintRarity,
  type WorkshopBlueprintCode,
  type WorkshopBlueprintRarity,
} from '../../../workshop/domain/workshop-catalog';
import {
  isWorkshopBlueprintDiscoveryKind,
  isWorkshopBlueprintQuality,
  isWorkshopBlueprintSourceType,
  type WorkshopBlueprintDiscoveryKind,
  type WorkshopBlueprintQuality,
  type WorkshopBlueprintSourceType,
} from '../../../workshop/domain/workshop-blueprint-instances';
import type {
  PlayerBlueprintInstanceView,
  PlayerBlueprintView,
  PlayerCraftedItemView,
  WorkshopBlueprintModifierSnapshot,
  WorkshopCraftedItemOutcome,
  WorkshopMutationOptions,
} from '../../../workshop/application/workshop-persistence';
import { buildLoadoutSnapshotFromBattle } from '../../domain/contracts/loadout-snapshot';
import {
  isRewardLedgerEntry,
  type AppliedPendingRewardLedgerEntryV1,
  type PendingRewardLedgerEntryV1,
  type RewardLedgerEntry,
} from '../../domain/contracts/reward-ledger';
import {
  createQuestRewardLedgerEntry,
  QUEST_REWARD_SOURCE_TYPE,
} from '../../domain/contracts/quest-reward-ledger';
import { createDailyActivityLedgerEntry } from '../../domain/contracts/daily-activity-ledger';
import {
  BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE,
  createBestiaryEnemyKillMilestoneLedgerEntry,
  parseBestiaryEnemyKillMilestoneSourceId,
} from '../../domain/contracts/bestiary-enemy-kill-milestone-ledger';
import {
  BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE,
  createBestiaryLocationDiscoveryLedgerEntry,
} from '../../domain/contracts/bestiary-location-discovery-ledger';
import { createBattleVictoryRewardIntent } from '../../domain/contracts/reward-intent';
import {
  resolveEnemyThreatDefeat,
  resolveEnemyThreatSurvival,
} from '../../../world/domain/roaming-threats';
import type {
  ActiveEnemyThreatView,
  BestiaryEnemyKillMilestoneRewardClaimResult,
  ClaimQuestRewardOptions,
  ClaimDailyActivityRewardOptions,
  CollectPendingRewardResult,
  CreateBattleOptions,
  FinalizeBattleResult,
  BestiaryDiscoveryView,
  BestiaryLocationDiscoveryRewardClaimResult,
  GameCommandIntentKey,
  GameRepository,
  DailyActivityRewardClaimResult,
  PendingRewardSourceView,
  PendingRewardView,
  QuestRewardClaimResult,
  RecordInventoryAndVitalsResultOptions,
  RecordInventoryDeltaResultOptions,
  RecordPlayerVitalsResultOptions,
  RecoverPendingRewardsResult,
  SaveBattleOptions,
  SaveExplorationOptions,
  SaveRuneCursorOptions,
  SaveRuneLoadoutOptions,
  StartPartyBattleOptions,
} from '../../application/ports/GameRepository';
import {
  mapBattleRecord,
  mapPlayerRecord,
  type PlayerRecord,
} from './prisma-game-mappers';
import { PrismaCommandIntentPersistence } from './prisma-command-intent-persistence';
import { isPrismaUniqueConstraintError } from './prisma-error-utils';
import {
  buildInventoryAvailabilityWhere,
  buildInventoryDeltaInput,
} from './prisma-inventory-utils';
import {
  partyInclude,
  PrismaPartyPersistence,
} from './prisma-party-persistence';
import { PrismaPlayerPersistence } from './prisma-player-persistence';
import { PrismaWorkshopPersistence } from './prisma-workshop-persistence';

type TransactionClient = Prisma.TransactionClient;
type CommandIntentKey = GameCommandIntentKey;

type PersistedBattleState = Pick<BattleView, 'status' | 'turnOwner' | 'player' | 'enemy' | 'party' | 'encounter' | 'log' | 'result' | 'rewards' | 'actionRevision'>;

const spendRuneDust = async (
  client: TransactionClient,
  playerId: number,
  amount: number,
  message: string,
): Promise<void> => {
  if (amount <= 0) {
    return;
  }

  const spent = await client.player.updateMany({
    where: {
      id: playerId,
      gold: { gte: amount },
    },
    data: {
      gold: { decrement: amount },
    },
  });

  if (spent.count === 0) {
    throw new AppError('not_enough_rune_resources', message);
  }
};

const aggregatePlayerSkillPointGains = (
  gains: readonly PlayerSkillPointGain[],
): ReadonlyMap<PlayerSkillCode, number> => gains.reduce<Map<PlayerSkillCode, number>>((result, gain) => {
  const points = Number.isFinite(gain.points) ? Math.floor(gain.points) : 0;
  if (points <= 0) {
    return result;
  }

  result.set(gain.skillCode, (result.get(gain.skillCode) ?? 0) + points);
  return result;
}, new Map<PlayerSkillCode, number>());

const normalizeBlueprintDropQuantity = (quantity: number | undefined): number => {
  if (quantity === undefined) {
    return 1;
  }

  return Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
};

const requireKnownBlueprintDropValue = <TValue extends string>(
  value: string,
  isKnownValue: (candidate: string) => candidate is TValue,
  fieldName: string,
): TValue => {
  if (isKnownValue(value)) {
    return value;
  }

  throw new AppError(
    'invalid_blueprint_reward',
    `Награда содержит неизвестное поле чертежа мастерской: ${fieldName}.`,
  );
};

const resolveBlueprintDropRarity = (
  drop: BlueprintDrop,
  fallback: WorkshopBlueprintRarity,
): WorkshopBlueprintRarity => requireKnownBlueprintDropValue(
  drop.rarity ?? fallback,
  isWorkshopBlueprintRarity,
  'rarity',
);

const resolveBlueprintDropSourceType = (
  drop: BlueprintDrop,
): WorkshopBlueprintSourceType => requireKnownBlueprintDropValue(
  drop.sourceType ?? 'EVENT',
  isWorkshopBlueprintSourceType,
  'sourceType',
);

const resolveBlueprintDropDiscoveryKind = (
  drop: BlueprintDrop,
): WorkshopBlueprintDiscoveryKind => requireKnownBlueprintDropValue(
  drop.discoveryKind ?? 'COMMON',
  isWorkshopBlueprintDiscoveryKind,
  'discoveryKind',
);

const resolveBlueprintDropQuality = (
  drop: BlueprintDrop,
): WorkshopBlueprintQuality => requireKnownBlueprintDropValue(
  drop.quality ?? 'STURDY',
  isWorkshopBlueprintQuality,
  'quality',
);

const parseRewardLedgerEntrySnapshot = (value: string): RewardLedgerEntry => {
  const parsed = parseJson<unknown>(value, null);

  if (!isRewardLedgerEntry(parsed)) {
    throw new AppError('reward_ledger_snapshot_invalid', 'Трофейная запись рассыпалась. Вернитесь к добыче и попробуйте снова.');
  }

  return parsed;
};

const isPendingRewardLedgerEntryForCollection = (
  ledger: RewardLedgerEntry,
): ledger is PendingRewardLedgerEntryV1 => (
  ledger.status === 'PENDING' && 'pendingRewardSnapshot' in ledger
);

const isAppliedPendingRewardLedgerEntryForCollection = (
  ledger: RewardLedgerEntry,
): ledger is AppliedPendingRewardLedgerEntryV1 => (
  ledger.status === 'APPLIED' && 'pendingRewardSnapshot' in ledger
);

const isPendingRewardLedgerEntryForView = (
  ledger: RewardLedgerEntry,
): ledger is PendingRewardLedgerEntryV1 => (
  ledger.status === 'PENDING' && 'pendingRewardSnapshot' in ledger
);

const mapPendingRewardLedgerCreateData = (rewardLedger: PendingRewardLedgerEntryV1) => ({
  playerId: rewardLedger.playerId,
  ledgerKey: rewardLedger.ledgerKey,
  sourceType: rewardLedger.sourceType,
  sourceId: rewardLedger.sourceId,
  status: rewardLedger.status,
  entrySnapshot: stringifyJson(rewardLedger, '{}'),
  appliedAt: null,
});

interface CurrentRuneLoadoutState {
  readonly currentRuneIndex: number;
  readonly unlockedRuneSlotCount: number;
  readonly selectedRuneId: string | null;
  readonly equippedRuneId: string | null;
  readonly equippedRuneIdsBySlot: readonly (string | null)[];
  readonly runeIds: readonly string[];
}

interface DeletePlayerReceiptSnapshot {
  readonly vkId: number;
  readonly deletedPlayerId: number;
  readonly deletedPlayerUpdatedAt: string;
  readonly deletedPlayerLevel: number;
  readonly deletedRuneCount: number;
  readonly deletedAt: string;
}

const deletePlayerReceiptRetentionMs = 7 * 24 * 60 * 60 * 1000;

const buildDeletePlayerReceiptSnapshot = (
  vkId: number,
  player: { id: number; updatedAt: Date; level: number; runes: readonly { id: string }[] },
): DeletePlayerReceiptSnapshot => ({
  vkId,
  deletedPlayerId: player.id,
  deletedPlayerUpdatedAt: player.updatedAt.toISOString(),
  deletedPlayerLevel: player.level,
  deletedRuneCount: player.runes.length,
  deletedAt: new Date().toISOString(),
});

const isDeletePlayerReceiptSnapshot = (value: unknown): value is DeletePlayerReceiptSnapshot => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const snapshot = value as Record<string, unknown>;
  return typeof snapshot.vkId === 'number'
    && typeof snapshot.deletedPlayerId === 'number'
    && typeof snapshot.deletedPlayerUpdatedAt === 'string'
    && typeof snapshot.deletedPlayerLevel === 'number'
    && typeof snapshot.deletedRuneCount === 'number'
    && typeof snapshot.deletedAt === 'string';
};

const parseDeletePlayerReceiptSnapshot = (value: string): DeletePlayerReceiptSnapshot => {
  const parsed = JSON.parse(value) as unknown;
  if (!isDeletePlayerReceiptSnapshot(parsed)) {
    throw new AppError('delete_receipt_invalid', 'Не удалось подтвердить состояние удаления персонажа. Начните заново через «🎮 Начать».');
  }

  return parsed;
};

const isStaleBattleMutation = (
  expectedRevision: number,
  currentBattle: { status: string; actionRevision: number },
): boolean => (
  currentBattle.status === 'ACTIVE'
  && currentBattle.actionRevision > expectedRevision
);

const mapBattlePersistence = (battle: PersistedBattleState) => ({
  status: battle.status,
  turnOwner: battle.turnOwner,
  actionRevision: battle.actionRevision,
  battleSnapshot: stringifyJson(buildBattleSnapshot(battle), '{}'),
  playerLoadoutSnapshot: battle.player.runeLoadout
    ? stringifyJson(buildLoadoutSnapshotFromBattle(battle.player.runeLoadout), 'null')
    : null,
  playerSnapshot: stringifyJson(battle.player, '{}'),
  enemySnapshot: stringifyJson(battle.enemy, '{}'),
  log: stringifyJson(battle.log, '[]'),
  result: battle.result,
  rewardsSnapshot: battle.rewards ? stringifyJson(battle.rewards, 'null') : null,
});

const resolvePersistedEquippedSlot = (rune: Pick<RuneDraft, 'equippedSlot' | 'isEquipped'>): number | null => (
  typeof rune.equippedSlot === 'number' && Number.isInteger(rune.equippedSlot) && rune.equippedSlot >= 0
    ? rune.equippedSlot
    : (rune.isEquipped ? 0 : null)
);

const mapRuneDraftPersistence = (playerId: number, rune: RuneDraft, isEquipped = rune.isEquipped) => {
  const equippedSlot = resolvePersistedEquippedSlot({
    equippedSlot: rune.equippedSlot,
    isEquipped,
  });

  return {
  playerId,
  runeCode: rune.runeCode ?? null,
  archetypeCode: rune.archetypeCode ?? null,
  passiveAbilityCodes: stringifyJson(rune.passiveAbilityCodes ?? [], '[]'),
  activeAbilityCodes: stringifyJson(rune.activeAbilityCodes ?? [], '[]'),
  name: rune.name,
  rarity: rune.rarity,
  health: rune.health,
  attack: rune.attack,
  defence: rune.defence,
  magicDefence: rune.magicDefence,
  dexterity: rune.dexterity,
  intelligence: rune.intelligence,
  isEquipped: equippedSlot !== null,
  equippedSlot,
};
};

export class PrismaGameRepository implements GameRepository {
  private readonly commandIntents: PrismaCommandIntentPersistence;
  private readonly partyPersistence: PrismaPartyPersistence;
  private readonly playerPersistence: PrismaPlayerPersistence;
  private readonly workshopPersistence: PrismaWorkshopPersistence;

  public constructor(private readonly prisma: PrismaClient) {
    this.commandIntents = new PrismaCommandIntentPersistence(prisma);
    this.playerPersistence = new PrismaPlayerPersistence(prisma);
    this.partyPersistence = new PrismaPartyPersistence(prisma, {
      requirePlayerRecord: (...args) => this.requirePlayerRecord(...args),
    });
    this.workshopPersistence = new PrismaWorkshopPersistence(prisma, {
      runWithCommandIntent: (...args) => this.runWithCommandIntent(...args),
      persistPlayerSkillGains: (...args) => this.persistPlayerSkillGains(...args),
    });
  }

  private buildCurrentRuneLoadoutState(player: PlayerState): CurrentRuneLoadoutState {
    return {
      currentRuneIndex: player.currentRuneIndex,
      unlockedRuneSlotCount: getUnlockedRuneSlotCount(player),
      selectedRuneId: getSelectedRune(player)?.id ?? null,
      equippedRuneId: getEquippedRune(player)?.id ?? null,
      equippedRuneIdsBySlot: getEquippedRuneIdsBySlot(player),
      runeIds: player.runes.map((rune) => rune.id),
    };
  }

  private assertExpectedRuneLoadoutState(player: PlayerState, options: SaveRuneLoadoutOptions): void {
    const currentState = this.buildCurrentRuneLoadoutState(player);

    if (
      (options.expectedCurrentRuneIndex !== undefined && currentState.currentRuneIndex !== options.expectedCurrentRuneIndex)
      || (options.expectedUnlockedRuneSlotCount !== undefined && currentState.unlockedRuneSlotCount !== options.expectedUnlockedRuneSlotCount)
      || (options.expectedSelectedRuneId !== undefined && currentState.selectedRuneId !== options.expectedSelectedRuneId)
      || (options.expectedEquippedRuneId !== undefined && currentState.equippedRuneId !== options.expectedEquippedRuneId)
      || (options.expectedEquippedRuneIdsBySlot !== undefined
        && (currentState.equippedRuneIdsBySlot.length !== options.expectedEquippedRuneIdsBySlot.length
          || currentState.equippedRuneIdsBySlot.some((runeId, index) => runeId !== options.expectedEquippedRuneIdsBySlot?.[index])))
      || (options.expectedRuneIds !== undefined
        && (currentState.runeIds.length !== options.expectedRuneIds.length
          || currentState.runeIds.some((runeId, index) => runeId !== options.expectedRuneIds?.[index])))
    ) {
      throw new AppError('stale_command_intent', 'Этот след уже выцвел. Вернитесь к свежей развилке.');
    }
  }

  private async reserveCommandIntent<TResult>(
    tx: TransactionClient,
    playerId: number,
    intentId: string,
    commandKey: CommandIntentKey,
    stateKey: string,
  ): Promise<TResult | null> {
    return this.commandIntents.reserve(tx, playerId, intentId, commandKey, stateKey);
  }

  private async finalizeCommandIntent<TResult>(
    tx: TransactionClient,
    playerId: number,
    intentId: string,
    result: TResult,
  ): Promise<void> {
    await this.commandIntents.finalize(tx, playerId, intentId, result);
  }

  private async runWithCommandIntent<TResult>(
    tx: TransactionClient,
    playerId: number,
    commandKey: CommandIntentKey,
    intentId: string | undefined,
    stateKey: string | undefined,
    currentStateKey: string | undefined,
    apply: () => Promise<TResult>,
  ): Promise<TResult> {
    return this.commandIntents.run(
      tx,
      playerId,
      commandKey,
      intentId,
      stateKey,
      currentStateKey,
      apply,
    );
  }

  private async logStaleBattleMutation(
    client: TransactionClient | PrismaClient,
    playerId: number,
    battle: Pick<BattleView, 'id' | 'status' | 'actionRevision'>,
    actualRevision: number,
  ): Promise<void> {
    const player = await client.player.findUnique({
      where: { id: playerId },
      include: {
        user: true,
      },
    });

    if (!player) {
      return;
    }

    await client.gameLog.create({
      data: {
        userId: player.userId,
        action: 'battle_stale_action_rejected',
        details: stringifyJson({
          battleId: battle.id,
          status: battle.status,
          expectedRevision: battle.actionRevision,
          actualRevision,
        }, '{}'),
      },
    });
  }

  public async listActiveEnemyThreatsForBiome(biomeCode: string): Promise<readonly ActiveEnemyThreatView[]> {
    return this.prisma.roamingThreat.findMany({
      where: {
        currentBiomeCode: biomeCode,
        status: 'ACTIVE',
      },
      orderBy: [
        { levelBonus: 'desc' },
        { survivalCount: 'desc' },
        { experience: 'desc' },
      ],
      take: 5,
      select: {
        enemyCode: true,
        enemyName: true,
        originBiomeCode: true,
        originBiomeName: true,
        currentBiomeCode: true,
        survivalCount: true,
        experience: true,
        levelBonus: true,
        lastSeenLocationLevel: true,
      },
    });
  }

  private async recordEnemyThreatSurvival(
    client: TransactionClient,
    battle: BattleView,
  ): Promise<void> {
    const threat = resolveEnemyThreatSurvival(battle);
    if (!threat) {
      return;
    }

    await client.roamingThreat.upsert({
      where: {
        enemyCode_originBiomeCode_currentBiomeCode: {
          enemyCode: threat.enemyCode,
          originBiomeCode: threat.originBiomeCode,
          currentBiomeCode: threat.currentBiomeCode,
        },
      },
      update: {
        enemyName: threat.enemyName,
        originBiomeName: threat.originBiomeName,
        lastSeenBattleId: threat.battleId,
        lastSeenLocationLevel: threat.lastSeenLocationLevel,
        lastSurvivalResult: threat.survivalResult,
        survivalCount: { increment: 1 },
        experience: { increment: threat.experienceGain },
        levelBonus: { increment: 1 },
        status: 'ACTIVE',
      },
      create: {
        enemyCode: threat.enemyCode,
        enemyName: threat.enemyName,
        originBiomeCode: threat.originBiomeCode,
        originBiomeName: threat.originBiomeName,
        currentBiomeCode: threat.currentBiomeCode,
        firstSeenBattleId: threat.battleId,
        lastSeenBattleId: threat.battleId,
        lastSeenLocationLevel: threat.lastSeenLocationLevel,
        lastSurvivalResult: threat.survivalResult,
        survivalCount: 1,
        experience: threat.experienceGain,
        levelBonus: threat.levelBonus,
        status: 'ACTIVE',
      },
    });
  }

  private async markEnemyThreatDefeated(
    client: TransactionClient,
    battle: BattleView,
  ): Promise<void> {
    const threat = resolveEnemyThreatDefeat(battle);
    if (!threat) {
      return;
    }

    await client.roamingThreat.updateMany({
      where: {
        enemyCode: threat.enemyCode,
        originBiomeCode: threat.originBiomeCode,
        currentBiomeCode: threat.currentBiomeCode,
        status: 'ACTIVE',
      },
      data: {
        lastSeenBattleId: threat.battleId,
        lastSeenLocationLevel: threat.lastSeenLocationLevel,
        status: 'DEFEATED',
      },
    });
  }

  private async getDeletePlayerReceiptStatus(
    tx: TransactionClient,
    vkId: number,
    intentId: string,
    stateKey: string,
  ): Promise<'APPLIED' | 'PENDING' | null> {
    const existing = await tx.deletePlayerReceipt.findUnique({
      where: {
        scopeVkId_intentId: {
          scopeVkId: vkId,
          intentId,
        },
      },
    });

    if (!existing) {
      return null;
    }

    if (existing.stateKey !== stateKey) {
      throw new AppError('stale_command_intent', 'Старое подтверждение больше не действует. Вернитесь в летопись, если всё ещё хотите удалить персонажа.');
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      await tx.deletePlayerReceipt.delete({
        where: {
          scopeVkId_intentId: {
            scopeVkId: vkId,
            intentId,
          },
        },
      });
      throw new AppError('stale_command_intent', 'Старое подтверждение больше не действует. Вернитесь в летопись, если всё ещё хотите удалить персонажа.');
    }

    if (existing.status === 'APPLIED') {
      parseDeletePlayerReceiptSnapshot(existing.resultSnapshot);
      return 'APPLIED';
    }

    return 'PENDING';
  }

  private ensureCollectableRewardLedger(
    ledger: RewardLedgerEntry,
    playerId: number,
    ledgerKey: string,
  ): void {
    if (ledger.playerId !== playerId || ledger.ledgerKey !== ledgerKey) {
      throw new AppError('reward_ledger_snapshot_invalid', 'Трофейная запись не сходится с добычей. Вернитесь к текущему трофею.');
    }
  }

  private async buildCollectedPendingRewardResult(
    tx: TransactionClient,
    playerId: number,
    ledger: AppliedPendingRewardLedgerEntryV1,
  ): Promise<CollectPendingRewardResult> {
    return {
      player: mapPlayerRecord(await this.requirePlayerRecord(tx, playerId)),
      ledgerKey: ledger.ledgerKey,
      selectedActionCode: ledger.pendingRewardSnapshot.selectedActionCode,
      appliedResult: ledger.pendingRewardSnapshot.appliedResult,
    };
  }

  private async tryReplayCollectedPendingReward(
    tx: TransactionClient,
    playerId: number,
    ledgerKey: string,
  ): Promise<CollectPendingRewardResult | null> {
    const record = await tx.rewardLedgerRecord.findUnique({
      where: { ledgerKey },
    });

    if (!record || record.playerId !== playerId) {
      return null;
    }

    const ledger = parseRewardLedgerEntrySnapshot(record.entrySnapshot);
    this.ensureCollectableRewardLedger(ledger, playerId, ledgerKey);

    if (!isAppliedPendingRewardLedgerEntryForCollection(ledger)) {
      return null;
    }

    return this.buildCollectedPendingRewardResult(tx, playerId, ledger);
  }

  private async resolvePendingRewardSkillUps(
    tx: TransactionClient,
    playerId: number,
    gains: readonly PlayerSkillPointGain[],
  ): Promise<readonly PendingRewardSkillUpSnapshot[]> {
    const aggregatedGains = aggregatePlayerSkillPointGains(gains);

    if (aggregatedGains.size === 0) {
      return [];
    }

    const skillCodes = [...aggregatedGains.keys()];
    const persistedSkills = await tx.playerSkill.findMany({
      where: {
        playerId,
        skillCode: {
          in: skillCodes,
        },
      },
    });
    const persistedSkillsByCode = new Map<PlayerSkillCode, (typeof persistedSkills)[number]>(
      persistedSkills.map((skill) => [skill.skillCode as PlayerSkillCode, skill]),
    );

    return [...aggregatedGains.entries()].map(([skillCode, points]) => {
      const currentSkill = persistedSkillsByCode.get(skillCode);
      const nextSkill = applyPlayerSkillExperienceDomain(
        currentSkill
          ? {
              skillCode,
              experience: currentSkill.experience,
              rank: currentSkill.rank,
            }
          : null,
        skillCode,
        points,
      );

      return {
        skillCode,
        experienceBefore: currentSkill?.experience ?? 0,
        experienceAfter: nextSkill.experience,
        rankBefore: currentSkill?.rank ?? 0,
        rankAfter: nextSkill.rank,
      };
    });
  }

  private async persistPendingRewardSkillUps(
    tx: TransactionClient,
    playerId: number,
    skillUps: readonly PendingRewardSkillUpSnapshot[],
  ): Promise<void> {
    for (const skillUp of skillUps) {
      await tx.playerSkill.upsert({
        where: {
          playerId_skillCode: {
            playerId,
            skillCode: skillUp.skillCode,
          },
        },
        update: {
          experience: skillUp.experienceAfter,
          rank: skillUp.rankAfter,
        },
        create: {
          playerId,
          skillCode: skillUp.skillCode,
          experience: skillUp.experienceAfter,
          rank: skillUp.rankAfter,
        },
      });
    }
  }

  private async persistPlayerSkillGains(
    tx: TransactionClient,
    playerId: number,
    gains: readonly PlayerSkillPointGain[] | undefined,
  ): Promise<void> {
    const aggregatedGains = aggregatePlayerSkillPointGains(gains ?? []);

    if (aggregatedGains.size === 0) {
      return;
    }

    const skillCodes = [...aggregatedGains.keys()];
    const persistedSkills = await tx.playerSkill.findMany({
      where: {
        playerId,
        skillCode: {
          in: skillCodes,
        },
      },
    });
    const persistedSkillsByCode = new Map<PlayerSkillCode, (typeof persistedSkills)[number]>(
      persistedSkills.map((skill) => [skill.skillCode as PlayerSkillCode, skill]),
    );

    for (const [skillCode, points] of aggregatedGains) {
      const currentSkill = persistedSkillsByCode.get(skillCode);
      const nextSkill = applyPlayerSkillExperienceDomain(
        currentSkill
          ? {
              skillCode,
              experience: currentSkill.experience,
              rank: currentSkill.rank,
            }
          : null,
        skillCode,
        points,
      );

      await tx.playerSkill.upsert({
        where: {
          playerId_skillCode: {
            playerId,
            skillCode,
          },
        },
        update: {
          experience: nextSkill.experience,
          rank: nextSkill.rank,
        },
        create: {
          playerId,
          skillCode,
          experience: nextSkill.experience,
          rank: nextSkill.rank,
        },
      });
    }
  }

  public async findPlayerByVkId(vkId: number): Promise<PlayerState | null> {
    return this.playerPersistence.findPlayerByVkId(vkId);
  }

  public async findPlayerById(playerId: number): Promise<PlayerState | null> {
    return this.playerPersistence.findPlayerById(playerId);
  }

  public async storeCommandIntentResult<TResult>(playerId: number, intentId: string, result: TResult): Promise<void> {
    await this.commandIntents.storeResult(playerId, intentId, result);
  }

  public async recordCommandIntentResult<TResult>(
    playerId: number,
    commandKey: GameCommandIntentKey,
    intentId: string | undefined,
    intentStateKey: string | undefined,
    currentStateKey: string | undefined,
    result: TResult,
  ): Promise<TResult> {
    return this.commandIntents.recordResult(
      playerId,
      commandKey,
      intentId,
      intentStateKey,
      currentStateKey,
      result,
    );
  }

  public async recordInventoryDeltaResult<TResult>(
    playerId: number,
    delta: InventoryDelta,
    options: RecordInventoryDeltaResultOptions,
    buildResult: (player: PlayerState) => TResult,
  ): Promise<TResult> {
    return this.prisma.$transaction((tx) => this.runWithCommandIntent(
      tx,
      playerId,
      options.commandKey,
      options.intentId,
      options.intentStateKey,
      options.currentStateKey,
      async () => {
        const updatedPlayer = await this.applyInventoryDelta(tx, playerId, delta);
        return buildResult(updatedPlayer);
      },
    ));
  }

  public async recordPlayerVitalsResult<TResult>(
    playerId: number,
    vitals: Required<Pick<PlayerState, 'currentHealth' | 'currentMana'>>,
    options: RecordPlayerVitalsResultOptions,
    buildResult: (player: PlayerState) => TResult,
  ): Promise<TResult> {
    return this.prisma.$transaction((tx) => this.runWithCommandIntent(
      tx,
      playerId,
      options.commandKey,
      options.intentId,
      options.intentStateKey,
      options.currentStateKey,
      async () => {
        await tx.playerProgress.update({
          where: { playerId },
          data: {
            currentHealth: vitals.currentHealth,
            currentMana: vitals.currentMana,
          },
        });

        const updatedPlayer = mapPlayerRecord(await this.requirePlayerRecord(tx, playerId));
        return buildResult(updatedPlayer);
      },
    ));
  }

  public async recordInventoryAndVitalsResult<TResult>(
    playerId: number,
    delta: InventoryDelta,
    vitals: Required<Pick<PlayerState, 'currentHealth' | 'currentMana'>>,
    options: RecordInventoryAndVitalsResultOptions,
    buildResult: (player: PlayerState) => TResult,
  ): Promise<TResult> {
    return this.prisma.$transaction((tx) => this.runWithCommandIntent(
      tx,
      playerId,
      options.commandKey,
      options.intentId,
      options.intentStateKey,
      options.currentStateKey,
      async () => {
        await this.applyInventoryDelta(tx, playerId, delta);
        await tx.playerProgress.update({
          where: { playerId },
          data: {
            currentHealth: vitals.currentHealth,
            currentMana: vitals.currentMana,
          },
        });

        const updatedPlayer = mapPlayerRecord(await this.requirePlayerRecord(tx, playerId));
        return buildResult(updatedPlayer);
      },
    ));
  }

  public async applyPlayerSkillExperience(
    playerId: number,
    gains: readonly PlayerSkillPointGain[],
  ): Promise<PlayerState> {
    return this.prisma.$transaction(async (tx) => {
      await this.persistPlayerSkillGains(tx, playerId, gains);
      return mapPlayerRecord(await this.requirePlayerRecord(tx, playerId));
    });
  }

  public async listClaimedQuestRewardCodes(playerId: number): Promise<readonly string[]> {
    const records = await this.prisma.rewardLedgerRecord.findMany({
      where: {
        playerId,
        sourceType: QUEST_REWARD_SOURCE_TYPE,
        status: 'APPLIED',
      },
      select: {
        sourceId: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return records.map((record) => record.sourceId);
  }

  public async listBestiaryDiscovery(playerId: number): Promise<BestiaryDiscoveryView> {
    const [battleRows, rewardRows] = await Promise.all([
      this.prisma.battleSession.findMany({
        where: { playerId },
        select: {
          id: true,
          enemyCode: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      this.prisma.rewardLedgerRecord.findMany({
        where: {
          playerId,
          sourceType: {
            in: [
              'BATTLE_VICTORY',
              BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE,
              BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE,
            ],
          },
          status: 'APPLIED',
        },
        select: {
          sourceType: true,
          sourceId: true,
        },
        orderBy: {
          appliedAt: 'asc',
        },
      }),
    ]);
    const battlesById = new Map(battleRows.map((battleRow) => [battleRow.id, battleRow]));
    const discoveredEnemyCodes = new Set<string>();
    const rewardedEnemyCodes = new Set<string>();
    const victoryCountsByEnemyCode = new Map<string, number>();
    const claimedLocationRewardCodes = new Set<string>();
    const claimedKillMilestoneKeys = new Set<string>();
    const claimedKillMilestones: Array<BestiaryDiscoveryView['claimedKillMilestones'][number]> = [];

    for (const battleRow of battleRows) {
      discoveredEnemyCodes.add(battleRow.enemyCode);
    }

    for (const rewardRow of rewardRows) {
      if (rewardRow.sourceType === 'BATTLE_VICTORY') {
        const battleRow = battlesById.get(rewardRow.sourceId);

        if (battleRow) {
          rewardedEnemyCodes.add(battleRow.enemyCode);
          victoryCountsByEnemyCode.set(
            battleRow.enemyCode,
            (victoryCountsByEnemyCode.get(battleRow.enemyCode) ?? 0) + 1,
          );
        }

        continue;
      }

      if (rewardRow.sourceType === BESTIARY_LOCATION_DISCOVERY_SOURCE_TYPE) {
        claimedLocationRewardCodes.add(rewardRow.sourceId);
        continue;
      }

      if (rewardRow.sourceType === BESTIARY_ENEMY_KILL_MILESTONE_SOURCE_TYPE) {
        const milestone = parseBestiaryEnemyKillMilestoneSourceId(rewardRow.sourceId);

        if (!milestone) {
          continue;
        }

        const milestoneKey = `${milestone.enemyCode}:${milestone.threshold}`;
        if (!claimedKillMilestoneKeys.has(milestoneKey)) {
          claimedKillMilestoneKeys.add(milestoneKey);
          claimedKillMilestones.push(milestone);
        }
      }
    }

    return {
      discoveredEnemyCodes: [...discoveredEnemyCodes],
      rewardedEnemyCodes: [...rewardedEnemyCodes],
      enemyVictoryCounts: [...victoryCountsByEnemyCode.entries()].map(([enemyCode, victoryCount]) => ({
        enemyCode,
        victoryCount,
      })),
      claimedLocationRewardCodes: [...claimedLocationRewardCodes],
      claimedKillMilestones,
    };
  }

  public async claimBestiaryLocationDiscoveryReward(
    playerId: number,
    biomeCode: string,
    reward: ResourceReward,
  ): Promise<BestiaryLocationDiscoveryRewardClaimResult> {
    const appliedAt = new Date();
    const ledger = createBestiaryLocationDiscoveryLedgerEntry(
      playerId,
      biomeCode,
      reward,
      appliedAt.toISOString(),
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        try {
          await tx.rewardLedgerRecord.create({
            data: {
              playerId,
              ledgerKey: ledger.ledgerKey,
              sourceType: ledger.sourceType,
              sourceId: ledger.sourceId,
              status: ledger.status,
              entrySnapshot: stringifyJson(ledger, '{}'),
              appliedAt,
            },
          });
        } catch (error) {
          if (!isPrismaUniqueConstraintError(error)) {
            throw error;
          }

          return {
            player: mapPlayerRecord(await this.requirePlayerRecord(tx, playerId)),
            biomeCode,
            reward,
            claimed: false,
          };
        }

        return {
          player: await this.applyResourceReward(tx, playerId, reward),
          biomeCode,
          reward,
          claimed: true,
        };
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        return {
          player: mapPlayerRecord(await this.requirePlayerRecord(this.prisma, playerId)),
          biomeCode,
          reward,
          claimed: false,
        };
      }

      throw error;
    }
  }

  public async claimBestiaryEnemyKillMilestoneReward(
    playerId: number,
    enemyCode: string,
    threshold: number,
    reward: ResourceReward,
  ): Promise<BestiaryEnemyKillMilestoneRewardClaimResult> {
    const appliedAt = new Date();
    const ledger = createBestiaryEnemyKillMilestoneLedgerEntry(
      playerId,
      enemyCode,
      threshold,
      reward,
      appliedAt.toISOString(),
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        try {
          await tx.rewardLedgerRecord.create({
            data: {
              playerId,
              ledgerKey: ledger.ledgerKey,
              sourceType: ledger.sourceType,
              sourceId: ledger.sourceId,
              status: ledger.status,
              entrySnapshot: stringifyJson(ledger, '{}'),
              appliedAt,
            },
          });
        } catch (error) {
          if (!isPrismaUniqueConstraintError(error)) {
            throw error;
          }

          return {
            player: mapPlayerRecord(await this.requirePlayerRecord(tx, playerId)),
            enemyCode,
            threshold,
            reward,
            claimed: false,
          };
        }

        return {
          player: await this.applyResourceReward(tx, playerId, reward),
          enemyCode,
          threshold,
          reward,
          claimed: true,
        };
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        return {
          player: mapPlayerRecord(await this.requirePlayerRecord(this.prisma, playerId)),
          enemyCode,
          threshold,
          reward,
          claimed: false,
        };
      }

      throw error;
    }
  }

  public async claimQuestReward(
    playerId: number,
    questCode: string,
    reward: ResourceReward,
    options?: ClaimQuestRewardOptions,
  ): Promise<QuestRewardClaimResult> {
    const appliedAt = new Date();
    const ledger = createQuestRewardLedgerEntry(
      playerId,
      questCode,
      reward,
      appliedAt.toISOString(),
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const applyQuestReward = async (): Promise<QuestRewardClaimResult> => {
          try {
            await tx.rewardLedgerRecord.create({
              data: {
                playerId,
                ledgerKey: ledger.ledgerKey,
                sourceType: ledger.sourceType,
                sourceId: ledger.sourceId,
                status: ledger.status,
                entrySnapshot: stringifyJson(ledger, '{}'),
                appliedAt,
              },
            });
          } catch (error) {
            if (!isPrismaUniqueConstraintError(error)) {
              throw error;
            }

            return {
              player: mapPlayerRecord(await this.requirePlayerRecord(tx, playerId)),
              questCode,
              reward,
              claimed: false,
            };
          }

          return {
            player: await this.applyResourceReward(tx, playerId, reward),
            questCode,
            reward,
            claimed: true,
          };
        };

        if (options?.commandKey && options.intentId && options.intentStateKey) {
          return this.runWithCommandIntent(
            tx,
            playerId,
            options.commandKey,
            options.intentId,
            options.intentStateKey,
            options.currentStateKey,
            applyQuestReward,
          );
        }

        return applyQuestReward();
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        return {
          player: mapPlayerRecord(await this.requirePlayerRecord(this.prisma, playerId)),
          questCode,
          reward,
          claimed: false,
        };
      }

      throw error;
    }
  }

  public async claimDailyActivityReward(
    playerId: number,
    activityCode: string,
    gameDay: string,
    reward: ResourceReward,
    options?: ClaimDailyActivityRewardOptions,
  ): Promise<DailyActivityRewardClaimResult> {
    const appliedAt = new Date();
    const ledger = createDailyActivityLedgerEntry(
      playerId,
      activityCode,
      gameDay,
      reward,
      appliedAt.toISOString(),
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const applyDailyActivityReward = async (): Promise<DailyActivityRewardClaimResult> => {
          try {
            await tx.rewardLedgerRecord.create({
              data: {
                playerId,
                ledgerKey: ledger.ledgerKey,
                sourceType: ledger.sourceType,
                sourceId: ledger.sourceId,
                status: ledger.status,
                entrySnapshot: stringifyJson(ledger, '{}'),
                appliedAt,
              },
            });
          } catch (error) {
            if (!isPrismaUniqueConstraintError(error)) {
              throw error;
            }

            return {
              player: mapPlayerRecord(await this.requirePlayerRecord(tx, playerId)),
              activityCode,
              gameDay,
              reward,
              claimed: false,
            };
          }

          return {
            player: await this.applyResourceReward(tx, playerId, reward),
            activityCode,
            gameDay,
            reward,
            claimed: true,
          };
        };

        if (options?.commandKey && options.intentId && options.intentStateKey) {
          return this.runWithCommandIntent(
            tx,
            playerId,
            options.commandKey,
            options.intentId,
            options.intentStateKey,
            options.currentStateKey,
            applyDailyActivityReward,
          );
        }

        return applyDailyActivityReward();
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        return {
          player: mapPlayerRecord(await this.requirePlayerRecord(this.prisma, playerId)),
          activityCode,
          gameDay,
          reward,
          claimed: false,
        };
      }

      throw error;
    }
  }

  public async findPendingReward(playerId: number): Promise<PendingRewardView | null> {
    const record = await this.prisma.rewardLedgerRecord.findFirst({
      where: {
        playerId,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!record) {
      return null;
    }

    const ledger = parseRewardLedgerEntrySnapshot(record.entrySnapshot);
    this.ensureCollectableRewardLedger(ledger, playerId, record.ledgerKey);

    if (!isPendingRewardLedgerEntryForView(ledger)) {
      return null;
    }

    return {
      ledgerKey: ledger.ledgerKey,
      source: await this.findPendingRewardSource(ledger),
      snapshot: ledger.pendingRewardSnapshot,
    };
  }

  public async collectPendingReward(
    playerId: number,
    ledgerKey: string,
    actionCode: TrophyActionCode,
  ): Promise<CollectPendingRewardResult> {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.rewardLedgerRecord.findUnique({
        where: { ledgerKey },
      });

      if (!record || record.playerId !== playerId) {
        throw new AppError('pending_reward_not_found', 'Эта награда уже ушла с поля. Вернитесь к текущей добыче.');
      }

      const ledger = parseRewardLedgerEntrySnapshot(record.entrySnapshot);
      this.ensureCollectableRewardLedger(ledger, playerId, ledgerKey);

      if (isAppliedPendingRewardLedgerEntryForCollection(ledger)) {
        return this.buildCollectedPendingRewardResult(tx, playerId, ledger);
      }

      if (!isPendingRewardLedgerEntryForCollection(ledger)) {
        throw new AppError('pending_reward_not_found', 'Эта награда уже ушла с поля. Вернитесь к текущей добыче.');
      }

      const action = findPendingRewardTrophyAction(ledger, actionCode);
      const inventoryDelta = buildPendingRewardInventoryDelta(action);
      const skillUps = await this.resolvePendingRewardSkillUps(
        tx,
        playerId,
        buildPendingRewardSkillPointGains(action),
      );
      const appliedAt = new Date();
      const appliedAtIso = appliedAt.toISOString();
      const appliedResult: PendingRewardAppliedResultSnapshot = {
        baseRewardApplied: true,
        inventoryDelta,
        skillUps,
        statUps: [],
        schoolUps: [],
      };
      const appliedLedger = createAppliedPendingRewardLedger({
        ledger,
        action,
        appliedResult,
        appliedAt: appliedAtIso,
      });
      const claimed = await tx.rewardLedgerRecord.updateMany({
        where: {
          playerId,
          ledgerKey,
          status: 'PENDING',
        },
        data: {
          status: 'APPLIED',
          entrySnapshot: stringifyJson(appliedLedger, '{}'),
          appliedAt,
        },
      });

      if (claimed.count === 0) {
        const replay = await this.tryReplayCollectedPendingReward(tx, playerId, ledgerKey);

        if (replay) {
          return replay;
        }

        throw new AppError('command_retry_pending', 'Трофей уже разбирается. Подождите мгновение.');
      }

      await this.applyInventoryDelta(tx, playerId, inventoryDelta);
      await this.persistPendingRewardSkillUps(tx, playerId, skillUps);

      const workshopItemDurabilityChanges = await this.decayTrophyToolLoadout(tx, playerId, action.code);
      const collectedAppliedResult: PendingRewardAppliedResultSnapshot = workshopItemDurabilityChanges.length > 0
        ? {
            ...appliedResult,
            workshopItemDurabilityChanges,
          }
        : appliedResult;

      if (workshopItemDurabilityChanges.length > 0) {
        const finalAppliedLedger = createAppliedPendingRewardLedger({
          ledger,
          action,
          appliedResult: collectedAppliedResult,
          appliedAt: appliedAtIso,
        });

        const refreshedLedger = await tx.rewardLedgerRecord.updateMany({
          where: {
            playerId,
            ledgerKey,
            status: 'APPLIED',
          },
          data: {
            entrySnapshot: stringifyJson(finalAppliedLedger, '{}'),
          },
        });

        if (refreshedLedger.count === 0) {
          throw new AppError('command_retry_pending', 'Трофей уже разбирается. Подождите мгновение.');
        }
      }

      return {
        player: mapPlayerRecord(await this.requirePlayerRecord(tx, playerId)),
        ledgerKey: appliedLedger.ledgerKey,
        selectedActionCode: action.code,
        appliedResult: collectedAppliedResult,
      };
    });
  }

  public async recoverPendingRewardsOnStart(): Promise<RecoverPendingRewardsResult> {
    return this.prisma.$transaction(async (tx) => {
      const completedVictories = await tx.battleSession.findMany({
        where: {
          status: 'COMPLETED',
          result: 'VICTORY',
        },
        orderBy: {
          updatedAt: 'asc',
        },
      });

      let recovered = 0;
      let skipped = 0;

      for (const battleRecord of completedVictories) {
        const battle = mapBattleRecord(battleRecord);
        const rewardLedger = createPendingRewardLedgerForBattle({
          playerId: battle.playerId,
          battle,
          createdAt: battleRecord.updatedAt.toISOString(),
        });

        if (!rewardLedger) {
          skipped += 1;
          continue;
        }

        const existingReward = await tx.rewardLedgerRecord.findUnique({
          where: {
            ledgerKey: rewardLedger.ledgerKey,
          },
        });

        if (existingReward) {
          skipped += 1;
          continue;
        }

        try {
          await tx.rewardLedgerRecord.create({
            data: mapPendingRewardLedgerCreateData(rewardLedger),
          });
          recovered += 1;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            skipped += 1;
            continue;
          }

          throw error;
        }
      }

      return {
        scanned: completedVictories.length,
        recovered,
        skipped,
      };
    });
  }

  public async deletePlayerByVkId(vkId: number, expectedUpdatedAt?: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (expectedUpdatedAt) {
        const deletedPlayer = await tx.player.deleteMany({
          where: {
            updatedAt: new Date(expectedUpdatedAt),
            user: {
              vkId,
            },
          },
        });

        if (deletedPlayer.count === 0) {
          throw new AppError('stale_command_intent', 'Старое подтверждение больше не действует. Вернитесь в летопись, если всё ещё хотите удалить персонажа.');
        }

        await tx.user.delete({
          where: { vkId },
        });
        return;
      }

      await tx.user.delete({
        where: { vkId },
      });
    });
  }

  public async confirmDeletePlayer(vkId: number, intentId: string, stateKey: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await this.getDeletePlayerReceiptStatus(tx, vkId, intentId, stateKey);
      if (existing === 'APPLIED') {
        return;
      }

      if (existing === 'PENDING') {
        throw new AppError('command_retry_pending', 'Прошлый жест ещё в пути. Дождитесь ответа.');
      }

      const player = await tx.player.findFirst({
        where: {
          user: {
            vkId,
          },
        },
        select: {
          id: true,
          level: true,
          updatedAt: true,
          runes: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!player) {
        throw new AppError('player_not_found', 'Персонаж не найден. «🎮 Начать» создаст нового мастера.');
      }

      if (player.updatedAt.toISOString() !== stateKey) {
        throw new AppError('stale_command_intent', 'Старое подтверждение больше не действует. Вернитесь в летопись, если всё ещё хотите удалить персонажа.');
      }

      try {
        await tx.deletePlayerReceipt.create({
          data: {
            scopeVkId: vkId,
            intentId,
            stateKey,
            expiresAt: new Date(Date.now() + deletePlayerReceiptRetentionMs),
          },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
          throw error;
        }

        const retried = await this.getDeletePlayerReceiptStatus(tx, vkId, intentId, stateKey);
        if (retried === 'APPLIED') {
          return;
        }

        throw new AppError('command_retry_pending', 'Прошлый жест ещё в пути. Дождитесь ответа.');
      }

      try {
        const deletedPlayer = await tx.player.deleteMany({
          where: {
            id: player.id,
            updatedAt: new Date(stateKey),
            user: {
              vkId,
            },
          },
        });

        if (deletedPlayer.count === 0) {
          throw new AppError('stale_command_intent', 'Старое подтверждение больше не действует. Вернитесь в летопись, если всё ещё хотите удалить персонажа.');
        }

        await tx.user.delete({
          where: { vkId },
        });

        await tx.deletePlayerReceipt.update({
          where: {
            scopeVkId_intentId: {
              scopeVkId: vkId,
              intentId,
            },
          },
          data: {
            status: 'APPLIED',
            resultSnapshot: stringifyJson(buildDeletePlayerReceiptSnapshot(vkId, player), '{}'),
            appliedAt: new Date(),
          },
        });
      } catch (error) {
        await tx.deletePlayerReceipt.deleteMany({
          where: {
            scopeVkId: vkId,
            intentId,
            stateKey,
            status: 'PENDING',
          },
        });
        throw error;
      }
    });
  }

  public async createPlayer(
    vkId: number,
    options?: Parameters<GameRepository['createPlayer']>[1],
  ): Promise<{ player: PlayerState; created: boolean; recoveredFromRace: boolean }> {
    return this.playerPersistence.createPlayer(vkId, options);
  }

  public async getCommandIntentResult<TResult = PlayerState>(
    playerId: number,
    intentId: string,
    expectedCommandKeys?: readonly string[],
    expectedStateKey?: string,
  ): Promise<{ status: 'APPLIED' | 'PENDING'; result?: TResult } | null> {
    return this.commandIntents.getResult<TResult>(
      playerId,
      intentId,
      expectedCommandKeys,
      expectedStateKey,
    );
  }

  public async saveExplorationState(
    playerId: number,
    state: Pick<PlayerState, 'locationLevel' | 'highestLocationLevel' | 'victoryStreak' | 'defeatStreak' | 'tutorialState'>,
    options?: SaveExplorationOptions,
  ): Promise<PlayerState> {
    return this.prisma.$transaction(async (tx) => {
      const apply = async (): Promise<PlayerState> => {
        const update = options?.expectedLocationLevel !== undefined
          || options?.expectedActiveBattleId !== undefined
          || options?.expectedHighestLocationLevel !== undefined
          || options?.expectedVictoryStreak !== undefined
          || options?.expectedDefeatStreak !== undefined
          || options?.expectedTutorialState !== undefined
          ? await tx.playerProgress.updateMany({
              where: {
                playerId,
                ...(options?.expectedActiveBattleId !== undefined ? { activeBattleId: options.expectedActiveBattleId } : {}),
                ...(options?.expectedLocationLevel !== undefined ? { locationLevel: options.expectedLocationLevel } : {}),
                ...(options?.expectedHighestLocationLevel !== undefined ? { highestLocationLevel: options.expectedHighestLocationLevel } : {}),
                ...(options?.expectedVictoryStreak !== undefined ? { victoryStreak: options.expectedVictoryStreak } : {}),
                ...(options?.expectedDefeatStreak !== undefined ? { defeatStreak: options.expectedDefeatStreak } : {}),
                ...(options?.expectedTutorialState !== undefined ? { tutorialState: options.expectedTutorialState } : {}),
              },
              data: {
                locationLevel: state.locationLevel,
                highestLocationLevel: state.highestLocationLevel,
                victoryStreak: state.victoryStreak,
                defeatStreak: state.defeatStreak,
                tutorialState: state.tutorialState,
              },
            })
          : { count: 1 };

        if (update.count === 0) {
          throw new AppError('stale_command_intent', 'Этот след уже выцвел. Вернитесь к свежей развилке.');
        }

        if (options?.expectedLocationLevel === undefined
          && options?.expectedActiveBattleId === undefined
          && options?.expectedHighestLocationLevel === undefined
          && options?.expectedVictoryStreak === undefined
          && options?.expectedDefeatStreak === undefined
          && options?.expectedTutorialState === undefined) {
          await tx.playerProgress.update({
            where: { playerId },
            data: {
              locationLevel: state.locationLevel,
              highestLocationLevel: state.highestLocationLevel,
              victoryStreak: state.victoryStreak,
              defeatStreak: state.defeatStreak,
              tutorialState: state.tutorialState,
            },
          });
        }

        return mapPlayerRecord(await this.requirePlayerRecord(tx, playerId));
      };

      if (options?.commandKey && options.intentId && options.intentStateKey) {
        return this.runWithCommandIntent(
          tx,
          playerId,
          options.commandKey,
          options.intentId,
          options.intentStateKey,
          options.intentStateKey,
          apply,
        );
      }

      return apply();
    });
  }

  public async saveRuneCursor(playerId: number, currentRuneIndex: number, options?: SaveRuneCursorOptions): Promise<PlayerState> {
    return this.prisma.$transaction(async (tx) => {
      const apply = async (): Promise<PlayerState> => {
        if (options?.expectedPlayerUpdatedAt) {
          const playerGuard = await tx.player.updateMany({
            where: {
              id: playerId,
              updatedAt: new Date(options.expectedPlayerUpdatedAt),
            },
            data: {
              updatedAt: new Date(),
            },
          });

          if (playerGuard.count === 0) {
            throw new AppError('stale_command_intent', 'Рунная страница сменилась. Вот нынешние знаки.');
          }
        }

        await tx.playerProgress.update({
          where: { playerId },
          data: { currentRuneIndex },
        });

        if (!options?.expectedPlayerUpdatedAt) {
          await tx.player.update({
            where: { id: playerId },
            data: { updatedAt: new Date() },
          });
        }

        return mapPlayerRecord(await this.requirePlayerRecord(tx, playerId));
      };

      if (options?.commandKey && options.intentId && options.intentStateKey) {
        return this.runWithCommandIntent(
          tx,
          playerId,
          options.commandKey,
          options.intentId,
          options.intentStateKey,
          options.intentStateKey,
          apply,
        );
      }

      return apply();
    });
  }

  public async equipRune(playerId: number, runeId: string | null, options?: SaveRuneLoadoutOptions): Promise<PlayerState> {
    return this.prisma.$transaction(async (tx) => {
      const apply = async (): Promise<PlayerState> => {
        const targetSlot = options?.targetSlot ?? 0;

        if (!Number.isInteger(targetSlot) || targetSlot < 0) {
          throw new AppError('invalid_rune_slot', 'Такого рунного гнезда нет. Вернитесь к текущим рунам.');
        }

        if (options?.expectedPlayerUpdatedAt) {
          const playerGuard = await tx.player.updateMany({
            where: {
              id: playerId,
              updatedAt: new Date(options.expectedPlayerUpdatedAt),
            },
            data: {
              updatedAt: new Date(),
            },
          });

          if (playerGuard.count === 0) {
            throw new AppError('stale_command_intent', 'Этот след уже выцвел. Вернитесь к свежей развилке.');
          }
        }

        let currentPlayer: PlayerState | null = null;

        if (options?.expectedSelectedRuneId !== undefined
          || options?.expectedUnlockedRuneSlotCount !== undefined
          || options?.expectedEquippedRuneId !== undefined
          || options?.expectedEquippedRuneIdsBySlot !== undefined
          || options?.expectedRuneIds !== undefined) {
          currentPlayer = mapPlayerRecord(await this.requirePlayerRecord(tx, playerId));
          this.assertExpectedRuneLoadoutState(currentPlayer, options);
        }

        currentPlayer ??= mapPlayerRecord(await this.requirePlayerRecord(tx, playerId));

        if (targetSlot >= getUnlockedRuneSlotCount(currentPlayer)) {
          throw new AppError('rune_slot_locked', 'Этот слот рун пока закрыт. Продвигайтесь дальше, чтобы открыть его.');
        }

        await tx.rune.updateMany({
          where: { playerId, equippedSlot: targetSlot },
          data: { isEquipped: false, equippedSlot: null },
        });

        if (runeId) {
          const equipped = await tx.rune.updateMany({
            where: { id: runeId, playerId },
            data: { isEquipped: true, equippedSlot: targetSlot },
          });

          if (equipped.count === 0) {
            throw new AppError('rune_not_found', 'Выбранный знак уже ушёл из коллекции. Вернитесь к рунам.');
          }
        }

        if (!options?.expectedPlayerUpdatedAt) {
          await tx.player.update({
            where: { id: playerId },
            data: { updatedAt: new Date() },
          });
        }

        const updatedPlayer = await this.requirePlayerRecord(tx, playerId);
        return mapPlayerRecord(updatedPlayer);
      };

      if (options?.commandKey && options.intentId && options.intentStateKey) {
        return this.runWithCommandIntent(
          tx,
          playerId,
          options.commandKey,
          options.intentId,
          options.intentStateKey,
          options.intentStateKey,
          apply,
        );
      }

      return apply();
    });
  }

  public async createRune(playerId: number, rune: RuneDraft): Promise<PlayerState> {
    await this.prisma.$transaction(async (tx) => {
      await tx.rune.create({
        data: mapRuneDraftPersistence(playerId, rune),
      });

      await tx.player.update({
        where: { id: playerId },
        data: { updatedAt: new Date() },
      });
    });

    return this.requirePlayer(playerId);
  }

  public async craftRune(
    playerId: number,
    rarity: RuneRarity,
    rune: RuneDraft,
    intentId?: string,
    intentStateKey?: string,
    currentStateKey?: string,
  ): Promise<PlayerState> {
    return this.prisma.$transaction(async (tx) => {
      return this.runWithCommandIntent(tx, playerId, 'CRAFT_RUNE', intentId, intentStateKey, currentStateKey, async () => {
        const spend = resolveRuneCraftSpend(rarity);
        await spendRuneDust(tx, playerId, spend.gold, 'Пыли уже не хватает для новой руны. Вернитесь к алтарю после пары побед.');

        const inventorySpend = buildInventoryDeltaInput(spend.inventoryDelta);
        const spent = await tx.playerInventory.updateMany({
          where: buildInventoryAvailabilityWhere(playerId, spend.inventoryDelta),
          data: inventorySpend as Prisma.PlayerInventoryUpdateManyMutationInput,
        });

        if (spent.count === 0) {
          throw new AppError('not_enough_shards', 'Осколков или материалов уже не хватает для новой руны. Вернитесь к алтарю.');
        }

        await tx.rune.create({
          data: mapRuneDraftPersistence(playerId, rune),
        });

        let updatedPlayer = await this.requirePlayerRecord(tx, playerId);

        await tx.playerProgress.update({
          where: { playerId },
          data: {
            currentRuneIndex: Math.max(0, updatedPlayer.runes.length - 1),
          },
        });

        await tx.player.update({
          where: { id: playerId },
          data: { updatedAt: new Date() },
        });

        updatedPlayer = await this.requirePlayerRecord(tx, playerId);
        return mapPlayerRecord(updatedPlayer);
      });
    });
  }

  public async updateRuneStats(playerId: number, runeId: string, stats: StatBlock): Promise<PlayerState> {
    const updated = await this.prisma.rune.updateMany({
      where: { id: runeId, playerId },
      data: {
        health: stats.health,
        attack: stats.attack,
        defence: stats.defence,
        magicDefence: stats.magicDefence,
        dexterity: stats.dexterity,
        intelligence: stats.intelligence,
      },
    });

    if (updated.count === 0) {
      throw new AppError('rune_not_found', 'Выбранный знак уже ушёл из коллекции. Вернитесь к рунам.');
    }

    await this.prisma.player.update({
      where: { id: playerId },
      data: { updatedAt: new Date() },
    });

    return this.requirePlayer(playerId);
  }

  public async rerollRuneStat(
    playerId: number,
    runeId: string,
    rarity: RuneRarity,
    stats: StatBlock,
    intentId?: string,
    intentStateKey?: string,
    currentStateKey?: string,
  ): Promise<PlayerState> {
    return this.prisma.$transaction(async (tx) => {
      return this.runWithCommandIntent(tx, playerId, 'REROLL_RUNE_STAT', intentId, intentStateKey, currentStateKey, async () => {
        const spend = resolveRuneRerollSpend(rarity);
        await spendRuneDust(tx, playerId, spend.gold, 'Пыли уже не хватает для перековки. Вернитесь к алтарю после пары побед.');

        const inventorySpend = buildInventoryDeltaInput(spend.inventoryDelta);
        const spent = await tx.playerInventory.updateMany({
          where: buildInventoryAvailabilityWhere(playerId, spend.inventoryDelta),
          data: inventorySpend as Prisma.PlayerInventoryUpdateManyMutationInput,
        });

        if (spent.count === 0) {
          throw new AppError('not_enough_shards', 'Осколок уже потрачен. Вернитесь к алтарю.');
        }

        const updatedRune = await tx.rune.updateMany({
          where: { id: runeId, playerId },
          data: {
            health: stats.health,
            attack: stats.attack,
            defence: stats.defence,
            magicDefence: stats.magicDefence,
            dexterity: stats.dexterity,
            intelligence: stats.intelligence,
          },
        });

        if (updatedRune.count === 0) {
          throw new AppError('rune_not_found', 'Выбранный знак уже ушёл из алтаря. Вернитесь к алтарю.');
        }

        await tx.player.update({
          where: { id: playerId },
          data: { updatedAt: new Date() },
        });

        const updatedPlayer = await this.requirePlayerRecord(tx, playerId);
        return mapPlayerRecord(updatedPlayer);
      });
    });
  }

  public async deleteRune(playerId: number, runeId: string): Promise<PlayerState> {
    const deleted = await this.prisma.rune.deleteMany({
      where: { id: runeId, playerId },
    });

    if (deleted.count === 0) {
      throw new AppError('rune_not_found', 'Выбранный знак уже ушёл из коллекции. Вернитесь к рунам.');
    }

    await this.prisma.player.update({
      where: { id: playerId },
      data: { updatedAt: new Date() },
    });

    return this.requirePlayer(playerId);
  }

  public async destroyRune(
    playerId: number,
    runeId: string,
    refund: InventoryDelta,
    intentId?: string,
    intentStateKey?: string,
    currentStateKey?: string,
  ): Promise<PlayerState> {
    return this.prisma.$transaction(async (tx) => {
      return this.runWithCommandIntent(tx, playerId, 'DESTROY_RUNE', intentId, intentStateKey, currentStateKey, async () => {
        const deleted = await tx.rune.deleteMany({
          where: { id: runeId, playerId },
        });

        if (deleted.count === 0) {
          throw new AppError('rune_not_found', 'Этот знак уже ушёл из алтаря. Вернитесь к алтарю.');
        }

        const inventoryUpdate = buildInventoryDeltaInput(refund);
        if (Object.keys(inventoryUpdate).length > 0) {
          await tx.playerInventory.update({
            where: { playerId },
            data: inventoryUpdate as Prisma.PlayerInventoryUpdateInput,
          });
        }

        await tx.player.update({
          where: { id: playerId },
          data: { updatedAt: new Date() },
        });

        const updatedPlayer = await this.requirePlayerRecord(tx, playerId);
        return mapPlayerRecord(updatedPlayer);
      });
    });
  }

  public async craftPlayerConsumable(
    playerId: number,
    cost: InventoryDelta,
    consumableDelta: InventoryDelta,
    skillGains: readonly PlayerSkillPointGain[],
    intentId?: string,
    intentStateKey?: string,
    currentStateKey?: string,
  ): Promise<PlayerState> {
    return this.prisma.$transaction(async (tx) => this.runWithCommandIntent(
      tx,
      playerId,
      'CRAFT_ITEM',
      intentId,
      intentStateKey,
      currentStateKey,
      async () => {
        const inventorySpend = buildInventoryDeltaInput(cost);
        const spent = await tx.playerInventory.updateMany({
          where: buildInventoryAvailabilityWhere(playerId, cost),
          data: inventorySpend as Prisma.PlayerInventoryUpdateManyMutationInput,
        });

        if (spent.count === 0) {
          throw new AppError('not_enough_crafting_resources', 'Материалы для пилюли уже потрачены. Вернитесь к Мастерской.');
        }

        const consumableUpdate = buildInventoryDeltaInput(consumableDelta);
        if (Object.keys(consumableUpdate).length > 0) {
          await tx.playerInventory.update({
            where: { playerId },
            data: consumableUpdate as Prisma.PlayerInventoryUpdateInput,
          });
        }

        await this.persistPlayerSkillGains(tx, playerId, skillGains);

        await tx.player.update({
          where: { id: playerId },
          data: { updatedAt: new Date() },
        });

        return mapPlayerRecord(await this.requirePlayerRecord(tx, playerId));
      },
    ));
  }

  public async purchaseWorkshopShopOffer(
    playerId: number,
    priceDust: number,
    inventoryDelta: InventoryDelta,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerState> {
    return this.prisma.$transaction((tx) => this.runWithCommandIntent(
      tx,
      playerId,
      'BUY_WORKSHOP_SHOP_OFFER',
      options?.intentId,
      options?.intentStateKey,
      options?.currentStateKey,
      async () => {
        const spentDust = await tx.player.updateMany({
          where: {
            id: playerId,
            gold: { gte: priceDust },
          },
          data: {
            gold: { decrement: priceDust },
            updatedAt: new Date(),
          },
        });

        if (spentDust.count === 0) {
          throw new AppError('not_enough_dust', 'Пыли уже не хватает для покупки в лавке мастерской.');
        }

        const inventoryUpdate = buildInventoryDeltaInput(inventoryDelta);
        if (Object.keys(inventoryUpdate).length > 0) {
          await tx.playerInventory.update({
            where: { playerId },
            data: inventoryUpdate as Prisma.PlayerInventoryUpdateInput,
          });
        }

        return mapPlayerRecord(await this.requirePlayerRecord(tx, playerId));
      },
    ));
  }

  public async listPlayerBlueprints(playerId: number): Promise<readonly PlayerBlueprintView[]> {
    return this.workshopPersistence.listPlayerBlueprints(playerId);
  }

  public async listPlayerBlueprintInstances(playerId: number): Promise<readonly PlayerBlueprintInstanceView[]> {
    return this.workshopPersistence.listPlayerBlueprintInstances(playerId);
  }

  public async listPlayerCraftedItems(playerId: number): Promise<readonly PlayerCraftedItemView[]> {
    return this.workshopPersistence.listPlayerCraftedItems(playerId);
  }

  public async grantPlayerBlueprint(
    playerId: number,
    blueprintCode: WorkshopBlueprintCode,
    quantity: number,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerBlueprintView> {
    return this.workshopPersistence.grantPlayerBlueprint(playerId, blueprintCode, quantity, options);
  }

  public async craftWorkshopItem(
    playerId: number,
    blueprintInstanceId: string,
    outcome: WorkshopCraftedItemOutcome,
    dustCost: number,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView> {
    return this.workshopPersistence.craftWorkshopItem(playerId, blueprintInstanceId, outcome, dustCost, options);
  }

  public async awakenWorkshopBlueprintFeature(
    playerId: number,
    blueprintInstanceId: string,
    radianceCost: number,
    modifierSnapshot: WorkshopBlueprintModifierSnapshot,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerBlueprintInstanceView> {
    return this.workshopPersistence.awakenWorkshopBlueprintFeature(
      playerId,
      blueprintInstanceId,
      radianceCost,
      modifierSnapshot,
      options,
    );
  }

  public async repairWorkshopItem(
    playerId: number,
    itemId: string,
    repairBlueprintInstanceId: string,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView> {
    return this.workshopPersistence.repairWorkshopItem(playerId, itemId, repairBlueprintInstanceId, options);
  }

  public async equipWorkshopItem(
    playerId: number,
    itemId: string,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView> {
    return this.workshopPersistence.equipWorkshopItem(playerId, itemId, options);
  }

  public async unequipWorkshopItem(
    playerId: number,
    itemId: string,
    options?: WorkshopMutationOptions,
  ): Promise<PlayerCraftedItemView> {
    return this.workshopPersistence.unequipWorkshopItem(playerId, itemId, options);
  }

  public async adjustInventory(playerId: number, delta: InventoryDelta): Promise<PlayerState> {
    return this.applyInventoryDelta(this.prisma, playerId, delta);
  }

  private async applyBlueprintDelta(
    client: TransactionClient | PrismaClient,
    playerId: number,
    delta: BlueprintDelta,
  ): Promise<void> {
    for (const [rawBlueprintCode, rawQuantity] of Object.entries(delta)) {
      if (!isWorkshopBlueprintCode(rawBlueprintCode)) {
        throw new AppError('invalid_blueprint_reward', 'Награда содержит неизвестный чертеж мастерской.');
      }

      const quantity = Number.isFinite(rawQuantity ?? 0)
        ? Math.max(0, Math.floor(rawQuantity ?? 0))
        : 0;
      if (quantity <= 0) {
        continue;
      }

      const blueprint = getWorkshopBlueprint(rawBlueprintCode);
      const discoveredAt = new Date();

      await client.playerBlueprint.upsert({
        where: {
          playerId_blueprintCode: {
            playerId,
            blueprintCode: rawBlueprintCode,
          },
        },
        update: {
          quantity: { increment: quantity },
        },
        create: {
          playerId,
          blueprintCode: rawBlueprintCode,
          quantity,
        },
      });

      for (let copyIndex = 0; copyIndex < quantity; copyIndex += 1) {
        await client.playerBlueprintInstance.create({
          data: {
            playerId,
            blueprintCode: rawBlueprintCode,
            rarity: blueprint.rarity,
            sourceType: 'LEGACY',
            sourceId: null,
            discoveryKind: 'LEGACY',
            quality: 'STURDY',
            craftPotential: 'legacy_delta',
            modifierSnapshot: '{}',
            status: 'AVAILABLE',
            discoveredAt,
          },
        });
      }
    }
  }

  private async applyBlueprintDrops(
    client: TransactionClient | PrismaClient,
    playerId: number,
    drops: readonly BlueprintDrop[],
  ): Promise<void> {
    const discoveredAt = new Date();

    for (const drop of drops) {
      if (!isWorkshopBlueprintCode(drop.blueprintCode)) {
        throw new AppError('invalid_blueprint_reward', 'Награда содержит неизвестный чертеж мастерской.');
      }

      const quantity = normalizeBlueprintDropQuantity(drop.quantity);
      if (quantity <= 0) {
        continue;
      }

      const blueprint = getWorkshopBlueprint(drop.blueprintCode);
      const data = {
        playerId,
        blueprintCode: drop.blueprintCode,
        rarity: resolveBlueprintDropRarity(drop, blueprint.rarity),
        sourceType: resolveBlueprintDropSourceType(drop),
        sourceId: drop.sourceId ?? null,
        discoveryKind: resolveBlueprintDropDiscoveryKind(drop),
        quality: resolveBlueprintDropQuality(drop),
        craftPotential: drop.craftPotential ?? 'default',
        modifierSnapshot: stringifyJson(drop.modifierSnapshot ?? {}, '{}'),
        status: 'AVAILABLE',
        discoveredAt,
      };

      for (let copyIndex = 0; copyIndex < quantity; copyIndex += 1) {
        await client.playerBlueprintInstance.create({ data });
      }
    }
  }

  private async applyResourceReward(
    client: TransactionClient | PrismaClient,
    playerId: number,
    reward: ResourceReward,
  ): Promise<PlayerState> {
    if (reward.gold !== undefined && reward.gold !== 0) {
      await client.player.update({
        where: { id: playerId },
        data: {
          gold: {
            increment: reward.gold,
          },
        },
      });
    }

    if (reward.radiance !== undefined && reward.radiance !== 0) {
      await client.player.update({
        where: { id: playerId },
        data: {
          radiance: {
            increment: reward.radiance,
          },
        },
      });
    }

    if (reward.inventoryDelta) {
      await this.applyInventoryDelta(client, playerId, reward.inventoryDelta);
    }

    if (reward.blueprintDelta) {
      await this.applyBlueprintDelta(client, playerId, reward.blueprintDelta);
    }

    if (reward.blueprintDrops) {
      await this.applyBlueprintDrops(client, playerId, reward.blueprintDrops);
    }

    return mapPlayerRecord(await this.requirePlayerRecord(client, playerId));
  }

  private async applyInventoryDelta(
    client: TransactionClient | PrismaClient,
    playerId: number,
    delta: InventoryDelta,
  ): Promise<PlayerState> {
    const data = buildInventoryDeltaInput(delta);
    if (Object.keys(data).length === 0) {
      return mapPlayerRecord(await this.requirePlayerRecord(client, playerId));
    }

    const updated = await client.playerInventory.updateMany({
      where: buildInventoryAvailabilityWhere(playerId, delta),
      data: data as Prisma.PlayerInventoryUpdateManyMutationInput,
    });

    if (updated.count === 0) {
      throw new AppError('inventory_underflow', 'Ресурсов уже не хватает. Вернитесь к текущему экрану.');
    }

    return mapPlayerRecord(await this.requirePlayerRecord(client, playerId));
  }

  private async decayWorkshopLoadout(
    client: TransactionClient,
    playerId: number,
    battle: BattleView,
  ): Promise<void> {
    await this.workshopPersistence.decayLoadout(client, playerId, battle);
  }

  private async decayTrophyToolLoadout(
    client: TransactionClient,
    playerId: number,
    actionCode: TrophyActionCode,
  ): Promise<readonly PendingRewardWorkshopItemDurabilityChangeSnapshot[]> {
    const itemCodes = resolveTrophyToolItemCodes(actionCode);
    if (itemCodes.length === 0) {
      return [];
    }

    return this.workshopPersistence.decayEquippedItemsByCode(client, playerId, itemCodes);
  }

  public async getActiveParty(playerId: number): Promise<PartyView | null> {
    return this.partyPersistence.getActiveParty(playerId);
  }

  public async createParty(playerId: number): Promise<PartyView> {
    return this.partyPersistence.createParty(playerId);
  }

  public async joinPartyByInviteCode(playerId: number, inviteCode: string): Promise<PartyView> {
    return this.partyPersistence.joinPartyByInviteCode(playerId, inviteCode);
  }

  public async leaveParty(playerId: number): Promise<void> {
    await this.partyPersistence.leaveParty(playerId);
  }

  public async disbandParty(playerId: number): Promise<void> {
    await this.partyPersistence.disbandParty(playerId);
  }

  public async startPartyBattle(
    leaderPlayerId: number,
    partyId: string,
    battle: CreateBattleInput,
    options?: StartPartyBattleOptions,
  ): Promise<BattleView> {
    return this.prisma.$transaction(async (tx) => {
      const apply = async (): Promise<BattleView> => {
        const party = await tx.playerParty.findFirst({
          where: {
            id: partyId,
            leaderPlayerId,
            status: { in: ['OPEN', 'IN_BATTLE'] },
          },
          include: partyInclude,
        });

        if (!party) {
          throw new AppError('party_not_found', 'Отряд не найден или вы не ведёте этот отряд.');
        }

        if (party.status === 'IN_BATTLE' && party.activeBattleId) {
          const activeBattle = await tx.battleSession.findFirst({
            where: {
              id: party.activeBattleId,
              status: 'ACTIVE',
            },
          });

          if (activeBattle) {
            return mapBattleRecord(activeBattle);
          }
        }

        if (party.members.length < party.maxMembers) {
          throw new AppError('party_not_ready', 'Для отрядного выхода нужен второй мастер.');
        }

        const memberPlayerIds = party.members.map((member) => member.playerId);
        const busyMemberCount = await tx.playerProgress.count({
          where: {
            playerId: { in: memberPlayerIds },
            activeBattleId: { not: null },
          },
        });

        if (busyMemberCount > 0) {
          throw new AppError('party_member_busy', 'Кто-то из отряда уже занят боем.');
        }

        const persistedBattle = mapBattlePersistence(battle);
        const battleRow = await tx.battleSession.create({
          data: {
            playerId: leaderPlayerId,
            battleType: battle.battleType,
            locationLevel: battle.locationLevel,
            biomeCode: battle.biomeCode,
            enemyCode: battle.enemyCode,
            enemyName: battle.enemy.name,
            ...persistedBattle,
          },
        });

        const claimedProgress = await tx.playerProgress.updateMany({
          where: {
            playerId: { in: memberPlayerIds },
            activeBattleId: null,
          },
          data: { activeBattleId: battleRow.id },
        });

        if (claimedProgress.count !== memberPlayerIds.length) {
          await tx.battleSession.delete({ where: { id: battleRow.id } });
          throw new AppError('party_member_busy', 'Кто-то из отряда уже успел начать другой бой.');
        }

        await tx.playerParty.update({
          where: { id: party.id },
          data: {
            status: 'IN_BATTLE',
            activeBattleId: battleRow.id,
          },
        });

        return mapBattleRecord(battleRow);
      };

      if (options?.commandKey && options.intentId && options.intentStateKey) {
        return this.runWithCommandIntent(
          tx,
          leaderPlayerId,
          options.commandKey,
          options.intentId,
          options.intentStateKey,
          options.currentStateKey,
          apply,
        );
      }

      return apply();
    });
  }

  public async createBattle(playerId: number, battle: CreateBattleInput, options?: CreateBattleOptions): Promise<BattleView> {
    const created = await this.prisma.$transaction(async (tx) => {
      const apply = async (): Promise<BattleView> => {
        const existingBattle = await tx.battleSession.findFirst({
          where: {
            playerId,
            status: 'ACTIVE',
          },
          orderBy: { createdAt: 'asc' },
        });

        if (existingBattle) {
          await tx.playerProgress.update({
            where: { playerId },
            data: { activeBattleId: existingBattle.id },
          });

          return mapBattleRecord(existingBattle);
        }

        const persistedBattle = mapBattlePersistence(battle);

        const battleRow = await tx.battleSession.create({
          data: {
            playerId,
            battleType: battle.battleType,
            locationLevel: battle.locationLevel,
            biomeCode: battle.biomeCode,
            enemyCode: battle.enemyCode,
            enemyName: battle.enemy.name,
            ...persistedBattle,
          },
        });

        const claimedProgress = await tx.playerProgress.updateMany({
          where: {
            playerId,
            activeBattleId: null,
          },
          data: { activeBattleId: battleRow.id },
        });

        if (claimedProgress.count === 0) {
          const fallbackBattle = await tx.battleSession.findFirst({
            where: {
              playerId,
              status: 'ACTIVE',
            },
            orderBy: { createdAt: 'asc' },
          });

          if (fallbackBattle && fallbackBattle.id !== battleRow.id) {
            await tx.playerProgress.update({
              where: { playerId },
              data: { activeBattleId: fallbackBattle.id },
            });
            await tx.battleSession.delete({ where: { id: battleRow.id } });
            return mapBattleRecord(fallbackBattle);
          }

          await tx.playerProgress.update({
            where: { playerId },
            data: { activeBattleId: battleRow.id },
          });
        }

        return mapBattleRecord(battleRow);
      };

      if (options?.commandKey && options.intentId && options.intentStateKey) {
        return this.runWithCommandIntent(
          tx,
          playerId,
          options.commandKey,
          options.intentId,
          options.intentStateKey,
          options.currentStateKey,
          apply,
        );
      }

      return apply();
    });

    return created;
  }

  public async getActiveBattle(playerId: number): Promise<BattleView | null> {
    const progressDelegate = (this.prisma as unknown as {
      readonly playerProgress?: {
        readonly findUnique?: (args: {
          readonly where: { readonly playerId: number };
          readonly select: { readonly activeBattleId: true };
        }) => Promise<{ readonly activeBattleId: string | null } | null>;
      };
    }).playerProgress;
    const progress = typeof progressDelegate?.findUnique === 'function'
      ? await progressDelegate.findUnique({
          where: { playerId },
          select: { activeBattleId: true },
        })
      : null;

    if (progress?.activeBattleId) {
      const activeBattle = await this.prisma.battleSession.findFirst({
        where: {
          id: progress.activeBattleId,
          status: 'ACTIVE',
        },
      });

      if (activeBattle) {
        return mapBattleRecord(activeBattle);
      }
    }

    const battle = await this.prisma.battleSession.findFirst({
      where: {
        playerId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    return battle ? mapBattleRecord(battle) : null;
  }

  public async saveBattle(battle: BattleView, options?: SaveBattleOptions): Promise<BattleView> {
    const actingPlayerId = options?.actingPlayerId ?? battle.playerId;

    return this.prisma.$transaction(async (tx) => {
      const apply = async (): Promise<BattleView> => {
        const persistedBattle = mapBattlePersistence(battle);
        const { actionRevision: expectedRevision, ...persistedState } = persistedBattle;
        void expectedRevision;
        const nextBattleSnapshot = stringifyJson(buildBattleSnapshot({
          ...battle,
          actionRevision: battle.actionRevision + 1,
        }), '{}');
        const saved = await tx.battleSession.updateMany({
          where: {
            id: battle.id,
            playerId: battle.playerId,
            status: 'ACTIVE',
            actionRevision: battle.actionRevision,
          },
          data: {
            ...persistedState,
            battleSnapshot: nextBattleSnapshot,
            actionRevision: {
              increment: 1,
            },
          },
        });

        if (saved.count === 0) {
          const currentBattle = await tx.battleSession.findFirst({
            where: {
              id: battle.id,
              playerId: battle.playerId,
            },
          });

          if (!currentBattle) {
            throw new AppError('battle_not_found', 'Текущая схватка уже рассеялась. Ищите новую встречу.');
          }

          if (isStaleBattleMutation(battle.actionRevision, currentBattle)) {
            await this.logStaleBattleMutation(tx, actingPlayerId, battle, currentBattle.actionRevision);
          }

          return mapBattleRecord(currentBattle);
        }

        const currentBattle = await tx.battleSession.findFirst({
          where: {
            id: battle.id,
            playerId: battle.playerId,
          },
        });

        if (!currentBattle) {
          throw new AppError('battle_not_found', 'Текущая схватка уже рассеялась. Ищите новую встречу.');
        }

        await this.persistPlayerSkillGains(tx, actingPlayerId, options?.playerSkillGains);

        return mapBattleRecord(currentBattle);
      };

      if (options?.commandKey && options.intentId && options.intentStateKey) {
        return this.runWithCommandIntent<BattleView>(
          tx,
          actingPlayerId,
          options.commandKey,
          options.intentId,
          options.intentStateKey,
          options.currentStateKey,
          apply,
        );
      }

      return apply();
    });
  }

  public async saveBattleWithInventoryDelta(
    battle: BattleView,
    delta: InventoryDelta,
    options?: SaveBattleOptions,
  ): Promise<BattleView> {
    const actingPlayerId = options?.actingPlayerId ?? battle.playerId;

    return this.prisma.$transaction(async (tx) => {
      const apply = async (): Promise<BattleView> => {
        const persistedBattle = mapBattlePersistence(battle);
        const { actionRevision: expectedRevision, ...persistedState } = persistedBattle;
        void expectedRevision;
        const nextBattleSnapshot = stringifyJson(buildBattleSnapshot({
          ...battle,
          actionRevision: battle.actionRevision + 1,
        }), '{}');
        const saved = await tx.battleSession.updateMany({
          where: {
            id: battle.id,
            playerId: battle.playerId,
            status: 'ACTIVE',
            actionRevision: battle.actionRevision,
          },
          data: {
            ...persistedState,
            battleSnapshot: nextBattleSnapshot,
            actionRevision: {
              increment: 1,
            },
          },
        });

        if (saved.count === 0) {
          const currentBattle = await tx.battleSession.findFirst({
            where: {
              id: battle.id,
              playerId: battle.playerId,
            },
          });

          if (!currentBattle) {
            throw new AppError('battle_not_found', 'Текущая схватка уже рассеялась. Ищите новую встречу.');
          }

          if (isStaleBattleMutation(battle.actionRevision, currentBattle)) {
            await this.logStaleBattleMutation(tx, actingPlayerId, battle, currentBattle.actionRevision);
          }

          return mapBattleRecord(currentBattle);
        }

        await this.applyInventoryDelta(tx, actingPlayerId, delta);

        const currentBattle = await tx.battleSession.findFirst({
          where: {
            id: battle.id,
            playerId: battle.playerId,
          },
        });

        if (!currentBattle) {
          throw new AppError('battle_not_found', 'Текущая схватка уже рассеялась. Ищите новую встречу.');
        }

        await this.persistPlayerSkillGains(tx, actingPlayerId, options?.playerSkillGains);

        return mapBattleRecord(currentBattle);
      };

      if (options?.commandKey && options.intentId && options.intentStateKey) {
        return this.runWithCommandIntent<BattleView>(
          tx,
          actingPlayerId,
          options.commandKey,
          options.intentId,
          options.intentStateKey,
          options.currentStateKey,
          apply,
        );
      }

      return apply();
    });
  }

  public async finalizeBattle(playerId: number, battle: BattleView, options?: SaveBattleOptions): Promise<FinalizeBattleResult> {
    return this.prisma.$transaction(async (tx) => {
      if (options?.commandKey && options.intentId && options.intentStateKey) {
        const existing = await this.reserveCommandIntent<BattleView>(
          tx,
          playerId,
          options.intentId,
          options.commandKey,
          options.intentStateKey,
        );

        if (existing) {
          const updatedPlayer = await this.requirePlayerRecord(tx, playerId);
          return {
            player: mapPlayerRecord(updatedPlayer),
            battle: existing,
          };
        }

        if (options.currentStateKey !== undefined && options.currentStateKey !== options.intentStateKey) {
          throw new AppError('stale_command_intent', 'Этот след уже выцвел. Вернитесь к свежей развилке.');
        }
      }

      const persistedBattle = mapBattlePersistence(battle);
      const { actionRevision: expectedRevision, ...persistedState } = persistedBattle;
      void expectedRevision;
      const nextBattleSnapshot = stringifyJson(buildBattleSnapshot({
        ...battle,
        actionRevision: battle.actionRevision + 1,
      }), '{}');
      const finalized = await tx.battleSession.updateMany({
        where: {
          id: battle.id,
          playerId: battle.playerId,
          status: 'ACTIVE',
          actionRevision: battle.actionRevision,
        },
        data: {
          ...persistedState,
          battleSnapshot: nextBattleSnapshot,
          actionRevision: {
            increment: 1,
          },
        },
      });

      const currentBattle = await tx.battleSession.findFirst({
        where: {
          id: battle.id,
          playerId: battle.playerId,
        },
      });

      if (!currentBattle) {
        throw new AppError('battle_not_found', 'Текущая схватка уже рассеялась. Ищите новую встречу.');
      }

      if (finalized.count === 0) {
        if (isStaleBattleMutation(battle.actionRevision, currentBattle)) {
          await this.logStaleBattleMutation(tx, playerId, battle, currentBattle.actionRevision);
        }

        const mappedBattle = mapBattleRecord(currentBattle);
        if (options?.commandKey && options.intentId && options.intentStateKey) {
          await this.finalizeCommandIntent<BattleView>(tx, playerId, options.intentId, mappedBattle);
        }

        const updatedPlayer = await this.requirePlayerRecord(tx, playerId);
        return {
          player: mapPlayerRecord(updatedPlayer),
          battle: mappedBattle,
        };
      }

      if (battle.battleType === 'PARTY_PVE' && battle.party) {
        let updatedActor: PlayerState | null = null;

        for (const member of battle.party.members) {
          const memberBattle = this.buildBattleForPartyMember(battle, member.playerId);
          const memberSkillGains = member.playerId === playerId
            ? options?.playerSkillGains
            : undefined;
          const updatedMember = await this.applyBattleOutcomeToPlayer(
            tx,
            member.playerId,
            memberBattle,
            memberSkillGains,
          );

          if (member.playerId === playerId) {
            updatedActor = updatedMember;
          }
        }

        await this.recordEnemyThreatSurvival(tx, battle);
        await this.markEnemyThreatDefeated(tx, battle);

        await tx.playerParty.updateMany({
          where: {
            id: battle.party.id,
            activeBattleId: battle.id,
          },
          data: {
            status: 'OPEN',
            activeBattleId: null,
          },
        });

        const finalizedBattle = await tx.battleSession.findFirst({
          where: {
            id: battle.id,
            playerId: battle.playerId,
          },
        });

        if (!finalizedBattle) {
          throw new AppError('battle_not_found', 'Текущая схватка уже рассеялась. Ищите новую встречу.');
        }

        const result = {
          player: updatedActor ?? mapPlayerRecord(await this.requirePlayerRecord(tx, playerId)),
          battle: mapBattleRecord(finalizedBattle),
        };

        if (options?.commandKey && options.intentId && options.intentStateKey) {
          await this.finalizeCommandIntent<BattleView>(tx, playerId, options.intentId, result.battle);
        }

        return result;
      }

      const player = await this.requirePlayerRecord(tx, playerId);
      const currentPlayer = mapPlayerRecord(player);
      const rewardIntent = battle.result === 'VICTORY'
        ? createBattleVictoryRewardIntent(playerId, battle)
        : null;

      if (battle.result === 'VICTORY' && !rewardIntent) {
        throw new AppError('battle_reward_missing', 'Нельзя завершить победный бой без зафиксированной награды.');
      }

      let nextLevel = player.level;
      let nextExperience = player.experience;
      let nextGold = player.gold;
      let nextVictories = player.progress?.victories ?? 0;
      let nextDefeats = player.progress?.defeats ?? 0;
      let nextMobsKilled = player.progress?.mobsKilled ?? 0;
      let nextVictoryStreak = currentPlayer.victoryStreak;
      let nextDefeatStreak = currentPlayer.defeatStreak;
      let nextLocationLevel = currentPlayer.locationLevel;
      let nextHighestLocationLevel = currentPlayer.highestLocationLevel;
      let nextTutorialState = currentPlayer.tutorialState;
      let nextUnlockedRuneSlotCount = getUnlockedRuneSlotCount(currentPlayer);
      const nextVitals = derivePostBattleVitals(battle.player, { battleResult: battle.result });
      const inventoryDelta: InventoryDelta = {};
      const schoolMasteryReward = resolveBattleSchoolMasteryRewardGain(battle);

      if (battle.result === 'VICTORY' && rewardIntent) {
        const progression = resolveLevelProgression(
          player.level,
          player.experience,
          rewardIntent.payload.experience,
        );
        nextLevel = progression.level;
        nextExperience = progression.experience;
        nextGold = player.gold + rewardIntent.payload.gold;
        nextVictories += 1;
        nextVictoryStreak += 1;
        nextDefeatStreak = 0;
        nextMobsKilled += 1;

        if (battle.locationLevel > gameBalance.world.introLocationLevel) {
          nextHighestLocationLevel = Math.max(currentPlayer.highestLocationLevel, battle.locationLevel);
        }

        for (const [rarity, amount] of Object.entries(rewardIntent.payload.shards) as Array<[RuneRarity, number | undefined]>) {
          if (amount !== undefined && amount > 0) {
            const shardField = shardFieldForRarity(rarity);
            inventoryDelta[shardField] = (inventoryDelta[shardField] ?? 0) + amount;
          }
        }
      } else if (battle.result === 'DEFEAT') {
        nextDefeats += 1;
        nextVictoryStreak = 0;
        nextDefeatStreak += 1;
      }

      const projectedPlayer: PlayerState = {
        ...currentPlayer,
        level: nextLevel,
        experience: nextExperience,
        gold: nextGold,
        victories: nextVictories,
        victoryStreak: nextVictoryStreak,
        defeats: nextDefeats,
        defeatStreak: nextDefeatStreak,
        mobsKilled: nextMobsKilled,
        tutorialState: nextTutorialState,
        currentHealth: nextVitals.currentHealth,
        currentMana: nextVitals.currentMana,
      };

      const nextAdventureLocationLevel = resolveAdaptiveAdventureLocationLevel(projectedPlayer);

      if (battle.locationLevel === gameBalance.world.introLocationLevel) {
        if (currentPlayer.tutorialState === 'ACTIVE') {
          if (battle.result === 'VICTORY') {
            nextTutorialState = 'COMPLETED';
            nextLocationLevel = nextAdventureLocationLevel;
          } else {
            nextLocationLevel = gameBalance.world.introLocationLevel;
          }
        } else {
          nextLocationLevel = nextAdventureLocationLevel;
        }
      } else {
        nextLocationLevel = nextAdventureLocationLevel;
      }

      if (schoolMasteryReward) {
        const currentMastery = currentPlayer.schoolMasteries?.find((entry) => entry.schoolCode === schoolMasteryReward.schoolCode) ?? null;
        const nextMastery = applySchoolMasteryExperience(currentMastery, schoolMasteryReward.schoolCode, schoolMasteryReward.experienceGain);
        const nextSchoolMasteries = [
          ...(currentPlayer.schoolMasteries?.filter((entry) => entry.schoolCode !== schoolMasteryReward.schoolCode) ?? []),
          nextMastery,
        ];

        nextUnlockedRuneSlotCount = resolveUnlockedRuneSlotCountFromSchoolMasteries(
          { schoolMasteries: nextSchoolMasteries },
          nextUnlockedRuneSlotCount,
        );

        await tx.playerSchoolMastery.upsert({
          where: {
            playerId_schoolCode: {
              playerId,
              schoolCode: schoolMasteryReward.schoolCode,
            },
          },
          update: {
            experience: nextMastery.experience,
            rank: nextMastery.rank,
          },
          create: {
            playerId,
            schoolCode: schoolMasteryReward.schoolCode,
            experience: nextMastery.experience,
            rank: nextMastery.rank,
          },
        });
      }

      await tx.player.update({
        where: { id: playerId },
        data: {
          level: nextLevel,
          experience: nextExperience,
          gold: nextGold,
        },
      });

      await tx.playerProgress.update({
        where: { playerId },
        data: {
          locationLevel: nextLocationLevel,
          unlockedRuneSlotCount: nextUnlockedRuneSlotCount,
          activeBattleId: null,
          currentHealth: nextVitals.currentHealth,
          currentMana: nextVitals.currentMana,
          tutorialState: nextTutorialState,
          victories: nextVictories,
          victoryStreak: nextVictoryStreak,
          defeats: nextDefeats,
          defeatStreak: nextDefeatStreak,
          mobsKilled: nextMobsKilled,
          highestLocationLevel: nextHighestLocationLevel,
        },
      });

      const inventoryUpdate = buildInventoryDeltaInput(inventoryDelta);
      if (Object.keys(inventoryUpdate).length > 0) {
        await tx.playerInventory.update({
          where: { playerId },
          data: inventoryUpdate as Prisma.PlayerInventoryUpdateInput,
        });
      }

      if (rewardIntent?.payload.droppedRune) {
        await tx.rune.create({
          data: mapRuneDraftPersistence(playerId, rewardIntent.payload.droppedRune, false),
        });
      }

      if (rewardIntent) {
        const rewardLedger = createPendingRewardLedgerForBattle({
          playerId,
          battle,
          createdAt: new Date().toISOString(),
          playerSkills: currentPlayer.skills,
        });

        if (!rewardLedger) {
          throw new AppError('battle_reward_missing', 'РќРµР»СЊР·СЏ Р·Р°РІРµСЂС€РёС‚СЊ РїРѕР±РµРґРЅС‹Р№ Р±РѕР№ Р±РµР· Р·Р°С„РёРєСЃРёСЂРѕРІР°РЅРЅРѕР№ РЅР°РіСЂР°РґС‹.');
        }

        const novicePath = getSchoolNovicePathDefinitionForEnemy(battle.enemy.code);
        const battleSchoolCode = resolveBattlePlayerSchoolCode(battle);
        const rewardRune = rewardIntent.payload.droppedRune;
        const rewardRuneSchoolCode = getSchoolDefinitionForArchetype(rewardRune?.archetypeCode)?.code ?? null;
        const hadTargetRarityBefore = novicePath
          ? hasRuneOfSchoolAtLeastRarity(currentPlayer, novicePath.schoolCode, novicePath.rewardRarity)
          : null;
        const isSchoolNoviceAligned = novicePath !== null
          && battleSchoolCode === novicePath.schoolCode
          && rewardRune !== null
          && rewardRuneSchoolCode === novicePath.schoolCode
          && rewardRune.rarity === novicePath.rewardRarity
          && hadTargetRarityBefore === false;

        await tx.rewardLedgerRecord.create({
          data: mapPendingRewardLedgerCreateData(rewardLedger),
        });

        await tx.gameLog.create({
          data: {
            userId: player.userId,
            action: 'reward_claim_applied',
            details: stringifyJson({
              ledgerKey: rewardLedger.ledgerKey,
              sourceType: rewardLedger.sourceType,
              sourceId: rewardLedger.sourceId,
              battleId: battle.id,
              enemyCode: battle.enemy.code,
              battleSchoolCode,
              isSchoolNoviceAligned,
              novicePathSchoolCode: novicePath?.schoolCode ?? null,
              noviceTargetRewardRarity: novicePath?.rewardRarity ?? null,
              hadTargetRarityBefore,
              rewardRuneArchetypeCode: rewardRune?.archetypeCode ?? null,
              rewardRuneRarity: rewardRune?.rarity ?? null,
            }, '{}'),
          },
        });
      }

      await this.recordEnemyThreatSurvival(tx, battle);
      await this.markEnemyThreatDefeated(tx, battle);
      await this.decayWorkshopLoadout(tx, playerId, battle);
      await this.persistPlayerSkillGains(tx, playerId, options?.playerSkillGains);

      const updatedPlayer = await this.requirePlayerRecord(tx, playerId);
      const finalizedBattle = await tx.battleSession.findFirst({
        where: {
          id: battle.id,
          playerId,
        },
      });

      if (!finalizedBattle) {
        throw new AppError('battle_not_found', 'Текущая схватка уже рассеялась. Ищите новую встречу.');
      }

      const result = {
        player: mapPlayerRecord(updatedPlayer),
        battle: mapBattleRecord(finalizedBattle),
      };

      if (options?.commandKey && options.intentId && options.intentStateKey) {
        await this.finalizeCommandIntent<BattleView>(tx, playerId, options.intentId, result.battle);
      }

      return result;
    });
  }

  private buildBattleForPartyMember(battle: BattleView, playerId: number): BattleView {
    const member = battle.party?.members.find((partyMember) => partyMember.playerId === playerId);

    return member
      ? { ...battle, player: member.snapshot }
      : battle;
  }

  private async applyBattleOutcomeToPlayer(
    tx: TransactionClient,
    playerId: number,
    battle: BattleView,
    playerSkillGains?: readonly PlayerSkillPointGain[],
  ): Promise<PlayerState> {
    const player = await this.requirePlayerRecord(tx, playerId);
    const currentPlayer = mapPlayerRecord(player);
    const rewardIntent = battle.result === 'VICTORY'
      ? createBattleVictoryRewardIntent(playerId, battle)
      : null;

    if (battle.result === 'VICTORY' && !rewardIntent) {
      throw new AppError('battle_reward_missing', 'Нельзя завершить победный бой без зафиксированной награды.');
    }

    let nextLevel = player.level;
    let nextExperience = player.experience;
    let nextGold = player.gold;
    let nextVictories = player.progress?.victories ?? 0;
    let nextDefeats = player.progress?.defeats ?? 0;
    let nextMobsKilled = player.progress?.mobsKilled ?? 0;
    let nextVictoryStreak = currentPlayer.victoryStreak;
    let nextDefeatStreak = currentPlayer.defeatStreak;
    let nextLocationLevel = currentPlayer.locationLevel;
    let nextHighestLocationLevel = currentPlayer.highestLocationLevel;
    let nextTutorialState = currentPlayer.tutorialState;
    let nextUnlockedRuneSlotCount = getUnlockedRuneSlotCount(currentPlayer);
    const nextVitals = derivePostBattleVitals(battle.player, { battleResult: battle.result });
    const inventoryDelta: InventoryDelta = {};
    const schoolMasteryReward = resolveBattleSchoolMasteryRewardGain(battle);

    if (battle.result === 'VICTORY' && rewardIntent) {
      const progression = resolveLevelProgression(
        player.level,
        player.experience,
        rewardIntent.payload.experience,
      );
      nextLevel = progression.level;
      nextExperience = progression.experience;
      nextGold = player.gold + rewardIntent.payload.gold;
      nextVictories += 1;
      nextVictoryStreak += 1;
      nextDefeatStreak = 0;
      nextMobsKilled += 1;

      if (battle.locationLevel > gameBalance.world.introLocationLevel) {
        nextHighestLocationLevel = Math.max(currentPlayer.highestLocationLevel, battle.locationLevel);
      }

      for (const [rarity, amount] of Object.entries(rewardIntent.payload.shards) as Array<[RuneRarity, number | undefined]>) {
        if (amount !== undefined && amount > 0) {
          const shardField = shardFieldForRarity(rarity);
          inventoryDelta[shardField] = (inventoryDelta[shardField] ?? 0) + amount;
        }
      }
    } else if (battle.result === 'DEFEAT') {
      nextDefeats += 1;
      nextVictoryStreak = 0;
      nextDefeatStreak += 1;
    }

    const projectedPlayer: PlayerState = {
      ...currentPlayer,
      level: nextLevel,
      experience: nextExperience,
      gold: nextGold,
      victories: nextVictories,
      victoryStreak: nextVictoryStreak,
      defeats: nextDefeats,
      defeatStreak: nextDefeatStreak,
      mobsKilled: nextMobsKilled,
      tutorialState: nextTutorialState,
      currentHealth: nextVitals.currentHealth,
      currentMana: nextVitals.currentMana,
    };

    const nextAdventureLocationLevel = resolveAdaptiveAdventureLocationLevel(projectedPlayer);

    if (battle.locationLevel === gameBalance.world.introLocationLevel) {
      if (currentPlayer.tutorialState === 'ACTIVE') {
        if (battle.result === 'VICTORY') {
          nextTutorialState = 'COMPLETED';
          nextLocationLevel = nextAdventureLocationLevel;
        } else {
          nextLocationLevel = gameBalance.world.introLocationLevel;
        }
      } else {
        nextLocationLevel = nextAdventureLocationLevel;
      }
    } else {
      nextLocationLevel = nextAdventureLocationLevel;
    }

    if (schoolMasteryReward) {
      const currentMastery = currentPlayer.schoolMasteries?.find((entry) => entry.schoolCode === schoolMasteryReward.schoolCode) ?? null;
      const nextMastery = applySchoolMasteryExperience(currentMastery, schoolMasteryReward.schoolCode, schoolMasteryReward.experienceGain);
      const nextSchoolMasteries = [
        ...(currentPlayer.schoolMasteries?.filter((entry) => entry.schoolCode !== schoolMasteryReward.schoolCode) ?? []),
        nextMastery,
      ];

      nextUnlockedRuneSlotCount = resolveUnlockedRuneSlotCountFromSchoolMasteries(
        { schoolMasteries: nextSchoolMasteries },
        nextUnlockedRuneSlotCount,
      );

      await tx.playerSchoolMastery.upsert({
        where: {
          playerId_schoolCode: {
            playerId,
            schoolCode: schoolMasteryReward.schoolCode,
          },
        },
        update: {
          experience: nextMastery.experience,
          rank: nextMastery.rank,
        },
        create: {
          playerId,
          schoolCode: schoolMasteryReward.schoolCode,
          experience: nextMastery.experience,
          rank: nextMastery.rank,
        },
      });
    }

    await tx.player.update({
      where: { id: playerId },
      data: {
        level: nextLevel,
        experience: nextExperience,
        gold: nextGold,
      },
    });

    await tx.playerProgress.update({
      where: { playerId },
      data: {
        locationLevel: nextLocationLevel,
        unlockedRuneSlotCount: nextUnlockedRuneSlotCount,
        activeBattleId: null,
        currentHealth: nextVitals.currentHealth,
        currentMana: nextVitals.currentMana,
        tutorialState: nextTutorialState,
        victories: nextVictories,
        victoryStreak: nextVictoryStreak,
        defeats: nextDefeats,
        defeatStreak: nextDefeatStreak,
        mobsKilled: nextMobsKilled,
        highestLocationLevel: nextHighestLocationLevel,
      },
    });

    const inventoryUpdate = buildInventoryDeltaInput(inventoryDelta);
    if (Object.keys(inventoryUpdate).length > 0) {
      await tx.playerInventory.update({
        where: { playerId },
        data: inventoryUpdate as Prisma.PlayerInventoryUpdateInput,
      });
    }

    if (rewardIntent?.payload.droppedRune) {
      await tx.rune.create({
        data: mapRuneDraftPersistence(playerId, rewardIntent.payload.droppedRune, false),
      });
    }

    if (rewardIntent) {
      const rewardLedger = createPendingRewardLedgerForBattle({
        playerId,
        battle,
        createdAt: new Date().toISOString(),
        playerSkills: currentPlayer.skills,
      });

      if (!rewardLedger) {
        throw new AppError('battle_reward_missing', 'Нельзя завершить победный бой без зафиксированной награды.');
      }

      await tx.rewardLedgerRecord.create({
        data: mapPendingRewardLedgerCreateData(rewardLedger),
      });
    }

    await this.decayWorkshopLoadout(tx, playerId, battle);
    await this.persistPlayerSkillGains(tx, playerId, playerSkillGains);

    return mapPlayerRecord(await this.requirePlayerRecord(tx, playerId));
  }

  public async log(userId: number, action: string, details: unknown): Promise<void> {
    await this.prisma.gameLog.create({
      data: {
        userId,
        action,
        details: stringifyJson(details ?? {}, '{}'),
      },
    });
  }

  private async requirePlayer(playerId: number): Promise<PlayerState> {
    return this.playerPersistence.requirePlayer(playerId);
  }

  private async requirePlayerRecord(client: TransactionClient | PrismaClient, playerId: number): Promise<PlayerRecord> {
    return this.playerPersistence.requirePlayerRecord(client, playerId);
  }

  private async findPendingRewardSource(ledger: PendingRewardLedgerEntryV1): Promise<PendingRewardSourceView | null> {
    if (ledger.sourceType !== 'BATTLE_VICTORY') {
      return null;
    }

    const battleRecord = await this.prisma.battleSession.findUnique({
      where: {
        id: ledger.sourceId,
      },
    });

    if (!battleRecord) {
      return null;
    }

    const battle = mapBattleRecord(battleRecord);

    return {
      battleId: battle.id,
      enemyCode: battle.enemyCode,
      enemyName: battle.enemy.name,
      enemyKind: battle.enemy.kind,
    };
  }

}
