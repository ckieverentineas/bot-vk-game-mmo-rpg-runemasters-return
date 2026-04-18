import { Prisma, PrismaClient } from '@prisma/client';

import { env } from '../../../../config/env';
import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import { parseJson, stringifyJson } from '../../../../shared/utils/json';
import type {
  BattleView,
  BiomeView,
  CreateBattleInput,
  InventoryDelta,
  InventoryLoot,
  MobTemplateView,
  PlayerState,
  RuneDraft,
  RuneRarity,
  RuneView,
  StatBlock,
} from '../../../../shared/types/game';
import { buildBattleSnapshot, isBattleSnapshot, type BattleSnapshot } from '../../domain/contracts/battle-snapshot';
import {
  emptyInventory,
  emptyStats,
  getEquippedRune,
  getSelectedRune,
  resolveAdaptiveAdventureLocationLevel,
  resolveLevelProgression,
  shardFieldForRarity,
} from '../../../player/domain/player-stats';
import { buildLoadoutSnapshotFromBattle, isLoadoutSnapshot, projectBattleRuneLoadout, type LoadoutSnapshot } from '../../domain/contracts/loadout-snapshot';
import { createAppliedRewardLedgerEntry } from '../../domain/contracts/reward-ledger';
import { createBattleVictoryRewardIntent } from '../../domain/contracts/reward-intent';
import type {
  CreateBattleOptions,
  FinalizeBattleResult,
  GameRepository,
  SaveBattleOptions,
  SaveExplorationOptions,
  SaveAllocationOptions,
  SaveRuneCursorOptions,
  SaveRuneLoadoutOptions,
} from '../../application/ports/GameRepository';

const playerInclude = {
  user: true,
  allocation: true,
  progress: true,
  inventory: true,
  runes: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} satisfies Prisma.PlayerInclude;

type PlayerRecord = Prisma.PlayerGetPayload<{ include: typeof playerInclude }>;
type TransactionClient = Prisma.TransactionClient;
type CommandIntentKey = 'CRAFT_RUNE' | 'REROLL_RUNE_STAT' | 'DESTROY_RUNE' | 'ALLOCATE_STAT_POINT' | 'RESET_ALLOCATED_STATS' | 'EQUIP_RUNE' | 'UNEQUIP_RUNE' | 'MOVE_RUNE_CURSOR' | 'SELECT_RUNE_PAGE_SLOT' | 'ENTER_TUTORIAL_MODE' | 'SKIP_TUTORIAL' | 'RETURN_TO_ADVENTURE' | 'EXPLORE_LOCATION' | 'BATTLE_ATTACK' | 'BATTLE_DEFEND' | 'BATTLE_RUNE_SKILL';

type PersistedBattleState = Pick<BattleView, 'status' | 'turnOwner' | 'player' | 'enemy' | 'log' | 'result' | 'rewards' | 'actionRevision'>;

const buildInventoryDeltaInput = (delta: InventoryDelta): Record<string, { increment: number }> => {
  const data: Record<string, { increment: number }> = {};

  for (const [key, value] of Object.entries(delta)) {
    if (value !== undefined && value !== 0) {
      data[key] = { increment: value };
    }
  }

  return data;
};

const buildInventoryAvailabilityWhere = (playerId: number, delta: InventoryDelta): Prisma.PlayerInventoryWhereInput => {
  const where: Prisma.PlayerInventoryWhereInput = { playerId };

  for (const [key, value] of Object.entries(delta)) {
    if (value !== undefined && value < 0) {
      where[key as keyof Prisma.PlayerInventoryWhereInput] = { gte: Math.abs(value) } as never;
    }
  }

  return where;
};

const defaultBattlePlayerSnapshot = (playerId: number): BattleView['player'] => ({
  playerId,
  name: 'Рунный мастер',
  attack: 0,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
  maxHealth: 1,
  currentHealth: 1,
  maxMana: 0,
  currentMana: 0,
  runeLoadout: null,
  guardPoints: 0,
});

const defaultBattleEnemySnapshot = (enemyCode: string): BattleView['enemy'] => ({
  code: enemyCode,
  name: 'Неизвестный враг',
  kind: 'enemy',
  isElite: false,
  isBoss: false,
  attack: 1,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
  maxHealth: 1,
  currentHealth: 1,
  maxMana: 0,
  currentMana: 0,
  experienceReward: 0,
  goldReward: 0,
  runeDropChance: 0,
  attackText: 'атакует',
  intent: null,
  hasUsedSignatureMove: false,
});

interface ParsedLoadoutSnapshot {
  readonly snapshot: LoadoutSnapshot | null;
  readonly fallbackToBattleSnapshot: boolean;
}

interface ParsedBattleSnapshot {
  readonly snapshot: BattleSnapshot | null;
  readonly fallbackToLegacyColumns: boolean;
}

interface CurrentRuneLoadoutState {
  readonly currentRuneIndex: number;
  readonly selectedRuneId: string | null;
  readonly equippedRuneId: string | null;
  readonly runeIds: readonly string[];
}

const parsePersistedLoadoutSnapshot = (value: string | null): ParsedLoadoutSnapshot => {
  if (!value) {
    return {
      snapshot: null,
      fallbackToBattleSnapshot: false,
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return {
      snapshot: null,
      fallbackToBattleSnapshot: true,
    };
  }

  if (!isLoadoutSnapshot(parsed)) {
    return {
      snapshot: null,
      fallbackToBattleSnapshot: true,
    };
  }

  return {
    snapshot: parsed,
    fallbackToBattleSnapshot: false,
  };
};

const parsePersistedBattleSnapshot = (value: string | null): ParsedBattleSnapshot => {
  if (!value) {
    return {
      snapshot: null,
      fallbackToLegacyColumns: false,
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return {
      snapshot: null,
      fallbackToLegacyColumns: true,
    };
  }

  if (!isBattleSnapshot(parsed)) {
    return {
      snapshot: null,
      fallbackToLegacyColumns: true,
    };
  }

  return {
    snapshot: parsed,
    fallbackToLegacyColumns: false,
  };
};

const parseCommandIntentResultSnapshot = <T>(value: string): T => JSON.parse(value) as T;

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

const hydrateBattlePlayerSnapshot = (
  playerId: number,
  snapshot: BattleView['player'],
  loadoutSnapshot: LoadoutSnapshot | null,
): BattleView['player'] => {
  const fallback = defaultBattlePlayerSnapshot(playerId);
  const currentCooldown = snapshot.runeLoadout?.activeAbility?.currentCooldown ?? 0;
  const normalizedLoadout = projectBattleRuneLoadout(
    loadoutSnapshot ?? buildLoadoutSnapshotFromBattle(snapshot.runeLoadout ?? null),
    currentCooldown,
  );

  return {
    ...fallback,
    ...snapshot,
    runeLoadout: normalizedLoadout,
    guardPoints: snapshot.guardPoints ?? fallback.guardPoints,
  };
};

const isStaleBattleMutation = (
  expectedRevision: number,
  currentBattle: { status: string; actionRevision: number },
): boolean => (
  currentBattle.status === 'ACTIVE'
  && currentBattle.actionRevision > expectedRevision
);

const shouldUseVersionedBattleSnapshot = (
  snapshot: BattleSnapshot | null,
  actionRevision: number,
): snapshot is BattleSnapshot => (
  snapshot !== null
  && snapshot.actionRevision === actionRevision
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

const mapRuneDraftPersistence = (playerId: number, rune: RuneDraft, isEquipped = rune.isEquipped) => ({
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
  isEquipped,
});

export class PrismaGameRepository implements GameRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  private buildCurrentRuneLoadoutState(player: PlayerState): CurrentRuneLoadoutState {
    return {
      currentRuneIndex: player.currentRuneIndex,
      selectedRuneId: getSelectedRune(player)?.id ?? null,
      equippedRuneId: getEquippedRune(player)?.id ?? null,
      runeIds: player.runes.map((rune) => rune.id),
    };
  }

  private assertExpectedRuneLoadoutState(player: PlayerState, options: SaveRuneLoadoutOptions): void {
    const currentState = this.buildCurrentRuneLoadoutState(player);

    if (
      (options.expectedCurrentRuneIndex !== undefined && currentState.currentRuneIndex !== options.expectedCurrentRuneIndex)
      || (options.expectedSelectedRuneId !== undefined && currentState.selectedRuneId !== options.expectedSelectedRuneId)
      || (options.expectedEquippedRuneId !== undefined && currentState.equippedRuneId !== options.expectedEquippedRuneId)
      || (options.expectedRuneIds !== undefined
        && (currentState.runeIds.length !== options.expectedRuneIds.length
          || currentState.runeIds.some((runeId, index) => runeId !== options.expectedRuneIds?.[index])))
    ) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }
  }

  private async reserveCommandIntent<TResult>(
    tx: TransactionClient,
    playerId: number,
    intentId: string,
    commandKey: CommandIntentKey,
    stateKey: string,
  ): Promise<TResult | null> {
    const existing = await tx.commandIntentRecord.findUnique({
      where: {
        playerId_intentId: {
          playerId,
          intentId,
        },
      },
    });

    if (existing && (existing.commandKey !== commandKey || existing.stateKey !== stateKey)) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    if (existing?.status === 'APPLIED') {
      return parseCommandIntentResultSnapshot<TResult>(existing.resultSnapshot);
    }

    try {
      await tx.commandIntentRecord.create({
        data: {
          playerId,
          intentId,
          commandKey,
          stateKey,
        },
      });
      return null;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      const retried = await tx.commandIntentRecord.findUnique({
        where: {
          playerId_intentId: {
            playerId,
            intentId,
          },
        },
      });

      if (retried && (retried.commandKey !== commandKey || retried.stateKey !== stateKey)) {
        throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
      }

      if (retried?.status === 'APPLIED') {
        return parseCommandIntentResultSnapshot<TResult>(retried.resultSnapshot);
      }

      throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
    }
  }

  private async finalizeCommandIntent<TResult>(
    tx: TransactionClient,
    playerId: number,
    intentId: string,
    result: TResult,
  ): Promise<void> {
    await tx.commandIntentRecord.update({
      where: {
        playerId_intentId: {
          playerId,
          intentId,
        },
      },
      data: {
        status: 'APPLIED',
        resultSnapshot: stringifyJson(result, '{}'),
      },
    });
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
    if (!intentId || !stateKey) {
      return apply();
    }

    const existing = await this.reserveCommandIntent<TResult>(tx, playerId, intentId, commandKey, stateKey);
    if (existing) {
      return existing;
    }

    if (currentStateKey !== undefined && currentStateKey !== stateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    const result = await apply();
    await this.finalizeCommandIntent<TResult>(tx, playerId, intentId, result);
    return result;
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

  private mapBiome(biome: { id: number; code: string; name: string; description: string; minLevel: number; maxLevel: number }): BiomeView {
    return {
      id: biome.id,
      code: biome.code,
      name: biome.name,
      description: biome.description,
      minLevel: biome.minLevel,
      maxLevel: biome.maxLevel,
    };
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
      throw new AppError('stale_command_intent', 'Это подтверждение уже устарело. Откройте профиль и начните заново, если всё ещё хотите удалить персонажа.');
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
      throw new AppError('stale_command_intent', 'Это подтверждение уже устарело. Откройте профиль и начните заново, если всё ещё хотите удалить персонажа.');
    }

    if (existing.status === 'APPLIED') {
      parseDeletePlayerReceiptSnapshot(existing.resultSnapshot);
      return 'APPLIED';
    }

    return 'PENDING';
  }

  public async findPlayerByVkId(vkId: number): Promise<PlayerState | null> {
    const player = await this.prisma.player.findFirst({
      where: {
        user: {
          vkId,
        },
      },
      include: playerInclude,
    });

    return player ? this.mapPlayer(player) : null;
  }

  public async findPlayerById(playerId: number): Promise<PlayerState | null> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: playerInclude,
    });

    return player ? this.mapPlayer(player) : null;
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
          throw new AppError('stale_command_intent', 'Это подтверждение уже устарело. Откройте профиль и начните заново, если всё ещё хотите удалить персонажа.');
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
        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
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
        throw new AppError('player_not_found', 'Персонаж не найден. Нажмите «🎮 Начать», чтобы создать нового мастера.');
      }

      if (player.updatedAt.toISOString() !== stateKey) {
        throw new AppError('stale_command_intent', 'Это подтверждение уже устарело. Откройте профиль и начните заново, если всё ещё хотите удалить персонажа.');
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

        throw new AppError('command_retry_pending', 'Команда уже обрабатывается. Дождитесь ответа и обновите экран.');
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
          throw new AppError('stale_command_intent', 'Это подтверждение уже устарело. Откройте профиль и начните заново, если всё ещё хотите удалить персонажа.');
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

  public async createPlayer(vkId: number): Promise<{ player: PlayerState; created: boolean; recoveredFromRace: boolean }> {
    const existing = await this.findPlayerByVkId(vkId);
    if (existing) {
      return {
        player: existing,
        created: false,
        recoveredFromRace: false,
      };
    }

    let created;
    try {
      created = await this.prisma.user.create({
        data: {
          vkId,
          player: {
            create: {
              level: env.game.startingLevel,
              experience: 0,
              gold: 0,
              baseHealth: 8,
              baseAttack: 4,
              baseDefence: 3,
              baseMagicDefence: 1,
              baseDexterity: 3,
              baseIntelligence: 1,
              allocation: {
                create: {},
              },
              progress: {
                create: {
                  unspentStatPoints: env.game.startingStatPoints,
                  locationLevel: gameBalance.world.introLocationLevel,
                  currentRuneIndex: 0,
                  activeBattleId: null,
                  tutorialState: 'ACTIVE',
                  victories: 0,
                  victoryStreak: 0,
                  defeats: 0,
                  defeatStreak: 0,
                  mobsKilled: 0,
                  highestLocationLevel: gameBalance.world.introLocationLevel,
                },
              },
              inventory: {
                create: {
                  ...gameBalance.starterInventory,
                },
              },
            },
          },
        },
        include: {
          player: {
            include: playerInclude,
          },
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      const racedPlayer = await this.findPlayerByVkId(vkId);
      if (!racedPlayer) {
        throw new AppError('player_create_failed', 'Не удалось создать игрока.');
      }

      return {
        player: racedPlayer,
        created: false,
        recoveredFromRace: true,
      };
    }

    if (!created.player) {
      throw new AppError('player_create_failed', 'Не удалось создать игрока.');
    }

    return {
      player: this.mapPlayer(created.player),
      created: true,
      recoveredFromRace: false,
    };
  }

  public async getCommandIntentResult<TResult = PlayerState>(
    playerId: number,
    intentId: string,
    expectedCommandKeys?: readonly string[],
    expectedStateKey?: string,
  ): Promise<{ status: 'APPLIED' | 'PENDING'; result?: TResult } | null> {
    const existing = await this.prisma.commandIntentRecord.findUnique({
      where: {
        playerId_intentId: {
          playerId,
          intentId,
        },
      },
    });

    if (!existing) {
      return null;
    }

    if (expectedCommandKeys && !expectedCommandKeys.includes(existing.commandKey)) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    if (expectedStateKey !== undefined && existing.stateKey !== expectedStateKey) {
      throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
    }

    if (existing.status === 'APPLIED') {
      return {
        status: 'APPLIED',
        result: parseCommandIntentResultSnapshot<TResult>(existing.resultSnapshot),
      };
    }

    return {
      status: 'PENDING',
    };
  }

  public async saveAllocation(
    playerId: number,
    allocationPoints: StatBlock,
    unspentStatPoints: number,
    options?: SaveAllocationOptions,
  ): Promise<PlayerState> {
    return this.prisma.$transaction(async (tx) => {
      const apply = async (): Promise<PlayerState> => {
        const allocationUpdate = options?.expectedAllocationPoints
          ? await tx.playerStatAllocation.updateMany({
              where: {
                playerId,
                health: options.expectedAllocationPoints.health,
                attack: options.expectedAllocationPoints.attack,
                defence: options.expectedAllocationPoints.defence,
                magicDefence: options.expectedAllocationPoints.magicDefence,
                dexterity: options.expectedAllocationPoints.dexterity,
                intelligence: options.expectedAllocationPoints.intelligence,
              },
              data: {
                health: allocationPoints.health,
                attack: allocationPoints.attack,
                defence: allocationPoints.defence,
                magicDefence: allocationPoints.magicDefence,
                dexterity: allocationPoints.dexterity,
                intelligence: allocationPoints.intelligence,
              },
            })
          : { count: 1 };

        if (allocationUpdate.count === 0) {
          throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
        }

        const progressUpdate = options?.expectedUnspentStatPoints !== undefined
          ? await tx.playerProgress.updateMany({
              where: {
                playerId,
                unspentStatPoints: options.expectedUnspentStatPoints,
              },
              data: { unspentStatPoints },
            })
          : { count: 1 };

        if (progressUpdate.count === 0) {
          throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
        }

        if (!options?.expectedAllocationPoints) {
          await tx.playerStatAllocation.update({
            where: { playerId },
            data: {
              health: allocationPoints.health,
              attack: allocationPoints.attack,
              defence: allocationPoints.defence,
              magicDefence: allocationPoints.magicDefence,
              dexterity: allocationPoints.dexterity,
              intelligence: allocationPoints.intelligence,
            },
          });
        }

        if (options?.expectedUnspentStatPoints === undefined) {
          await tx.playerProgress.update({
            where: { playerId },
            data: { unspentStatPoints },
          });
        }

        const updatedPlayer = await this.requirePlayerRecord(tx, playerId);
        return this.mapPlayer(updatedPlayer);
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
          throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
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

        return this.mapPlayer(await this.requirePlayerRecord(tx, playerId));
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
            throw new AppError('stale_command_intent', 'Этот экран рун уже устарел. Я открыл актуальные руны.');
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

        return this.mapPlayer(await this.requirePlayerRecord(tx, playerId));
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
            throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
          }
        }

        if (options?.expectedSelectedRuneId !== undefined
          || options?.expectedEquippedRuneId !== undefined
          || options?.expectedRuneIds !== undefined) {
          const currentPlayer = this.mapPlayer(await this.requirePlayerRecord(tx, playerId));
          this.assertExpectedRuneLoadoutState(currentPlayer, options);
        }

        await tx.rune.updateMany({
          where: { playerId },
          data: { isEquipped: false },
        });

        if (runeId) {
          const equipped = await tx.rune.updateMany({
            where: { id: runeId, playerId },
            data: { isEquipped: true },
          });

          if (equipped.count === 0) {
            throw new AppError('rune_not_found', 'Выбранная руна уже недоступна. Откройте коллекцию ещё раз.');
          }
        }

        if (!options?.expectedPlayerUpdatedAt) {
          await tx.player.update({
            where: { id: playerId },
            data: { updatedAt: new Date() },
          });
        }

        const updatedPlayer = await this.requirePlayerRecord(tx, playerId);
        return this.mapPlayer(updatedPlayer);
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
        const shardField = gameBalance.runes.profiles[rarity].shardField;
        const spent = await tx.playerInventory.updateMany({
          where: buildInventoryAvailabilityWhere(playerId, { [shardField]: -gameBalance.runes.craftCost }),
          data: {
            [shardField]: { increment: -gameBalance.runes.craftCost },
          } as Prisma.PlayerInventoryUpdateManyMutationInput,
        });

        if (spent.count === 0) {
          throw new AppError('not_enough_shards', 'Осколков уже не хватает для создания руны. Обновите экран и попробуйте снова.');
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
        return this.mapPlayer(updatedPlayer);
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
      throw new AppError('rune_not_found', 'Выбранная руна уже недоступна. Откройте коллекцию ещё раз.');
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
        const shardField = gameBalance.runes.profiles[rarity].shardField;
        const spent = await tx.playerInventory.updateMany({
          where: buildInventoryAvailabilityWhere(playerId, { [shardField]: -1 }),
          data: {
            [shardField]: { increment: -1 },
          } as Prisma.PlayerInventoryUpdateManyMutationInput,
        });

        if (spent.count === 0) {
          throw new AppError('not_enough_shards', 'Осколок уже потрачен. Обновите экран и попробуйте снова.');
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
          throw new AppError('rune_not_found', 'Выбранная руна уже недоступна. Откройте алтарь ещё раз.');
        }

        await tx.player.update({
          where: { id: playerId },
          data: { updatedAt: new Date() },
        });

        const updatedPlayer = await this.requirePlayerRecord(tx, playerId);
        return this.mapPlayer(updatedPlayer);
      });
    });
  }

  public async deleteRune(playerId: number, runeId: string): Promise<PlayerState> {
    const deleted = await this.prisma.rune.deleteMany({
      where: { id: runeId, playerId },
    });

    if (deleted.count === 0) {
      throw new AppError('rune_not_found', 'Выбранная руна уже недоступна. Откройте коллекцию ещё раз.');
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
          throw new AppError('rune_not_found', 'Эта руна уже недоступна. Откройте алтарь ещё раз.');
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
        return this.mapPlayer(updatedPlayer);
      });
    });
  }

  public async adjustInventory(playerId: number, delta: InventoryDelta): Promise<PlayerState> {
    const data = buildInventoryDeltaInput(delta);
    if (Object.keys(data).length === 0) {
      return this.requirePlayer(playerId);
    }

    const updated = await this.prisma.playerInventory.updateMany({
      where: buildInventoryAvailabilityWhere(playerId, delta),
      data: data as Prisma.PlayerInventoryUpdateManyMutationInput,
    });

    if (updated.count === 0) {
      throw new AppError('inventory_underflow', 'Ресурсов уже не хватает. Обновите экран и попробуйте снова.');
    }

    return this.requirePlayer(playerId);
  }

  public async findBiomeForLocationLevel(locationLevel: number): Promise<BiomeView | null> {
    const biome = await this.prisma.biome.findFirst({
      where: {
        minLevel: { lte: locationLevel },
        maxLevel: { gte: locationLevel },
      },
      orderBy: { minLevel: 'asc' },
    });

    if (biome) {
      return this.mapBiome(biome);
    }

    const fallbackBiome = await this.prisma.biome.findFirst({
      orderBy: { minLevel: 'asc' },
    });

    return fallbackBiome ? this.mapBiome(fallbackBiome) : null;
  }

  public async listMobTemplatesForBiome(biomeCode: string): Promise<MobTemplateView[]> {
    const templates = await this.prisma.mobTemplate.findMany({
      where: {
        biome: {
          code: biomeCode,
        },
      },
      include: {
        biome: true,
      },
      orderBy: { id: 'asc' },
    });

    return templates.map((template) => ({
      code: template.code,
      biomeCode: template.biome.code,
      name: template.name,
      kind: template.kind,
      isElite: template.isElite,
      isBoss: template.isBoss,
      baseStats: {
        health: template.baseHealth,
        attack: template.baseAttack,
        defence: template.baseDefence,
        magicDefence: template.baseMagicDefence,
        dexterity: template.baseDexterity,
        intelligence: template.baseIntelligence,
      },
      scales: {
        health: template.healthScale,
        attack: template.attackScale,
        defence: template.defenceScale,
        magicDefence: template.magicDefenceScale,
        dexterity: template.dexterityScale,
        intelligence: template.intelligenceScale,
      },
      baseExperience: template.baseExperience,
      baseGold: template.baseGold,
      runeDropChance: template.runeDropChance,
      lootTable: parseJson<InventoryLoot>(template.lootTable, {}),
      attackText: template.attackText,
    }));
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

          return this.mapBattle(existingBattle);
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
            return this.mapBattle(fallbackBattle);
          }

          await tx.playerProgress.update({
            where: { playerId },
            data: { activeBattleId: battleRow.id },
          });
        }

        return this.mapBattle(battleRow);
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
    const battle = await this.prisma.battleSession.findFirst({
      where: {
        playerId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    return battle ? this.mapBattle(battle) : null;
  }

  public async saveBattle(battle: BattleView, options?: SaveBattleOptions): Promise<BattleView> {
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
            throw new AppError('battle_not_found', 'Активный бой уже недоступен. Начните новый бой.');
          }

          if (isStaleBattleMutation(battle.actionRevision, currentBattle)) {
            await this.logStaleBattleMutation(tx, battle.playerId, battle, currentBattle.actionRevision);
          }

          return this.mapBattle(currentBattle);
        }

        const currentBattle = await tx.battleSession.findFirst({
          where: {
            id: battle.id,
            playerId: battle.playerId,
          },
        });

        if (!currentBattle) {
          throw new AppError('battle_not_found', 'Активный бой уже недоступен. Начните новый бой.');
        }

        return this.mapBattle(currentBattle);
      };

      if (options?.commandKey && options.intentId && options.intentStateKey) {
        return this.runWithCommandIntent<BattleView>(
          tx,
          battle.playerId,
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
            player: this.mapPlayer(updatedPlayer),
            battle: existing,
          };
        }

        if (options.currentStateKey !== undefined && options.currentStateKey !== options.intentStateKey) {
          throw new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.');
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
          playerId,
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
          playerId,
        },
      });

      if (!currentBattle) {
        throw new AppError('battle_not_found', 'Активный бой уже недоступен. Начните новый бой.');
      }

      if (finalized.count === 0) {
        if (isStaleBattleMutation(battle.actionRevision, currentBattle)) {
          await this.logStaleBattleMutation(tx, playerId, battle, currentBattle.actionRevision);
        }

        const mappedBattle = this.mapBattle(currentBattle);
        if (options?.commandKey && options.intentId && options.intentStateKey) {
          await this.finalizeCommandIntent<BattleView>(tx, playerId, options.intentId, mappedBattle);
        }

        const updatedPlayer = await this.requirePlayerRecord(tx, playerId);
        return {
          player: this.mapPlayer(updatedPlayer),
          battle: mappedBattle,
        };
      }

      const player = await this.requirePlayerRecord(tx, playerId);
      const currentPlayer = this.mapPlayer(player);
      const rewardIntent = battle.result === 'VICTORY'
        ? createBattleVictoryRewardIntent(playerId, battle)
        : null;

      if (battle.result === 'VICTORY' && !rewardIntent) {
        throw new AppError('battle_reward_missing', 'Нельзя завершить победный бой без зафиксированной награды.');
      }

      let nextLevel = player.level;
      let nextExperience = player.experience;
      let nextGold = player.gold;
      let nextUnspentStatPoints = player.progress?.unspentStatPoints ?? 0;
      let nextVictories = player.progress?.victories ?? 0;
      let nextDefeats = player.progress?.defeats ?? 0;
      let nextMobsKilled = player.progress?.mobsKilled ?? 0;
      let nextVictoryStreak = currentPlayer.victoryStreak;
      let nextDefeatStreak = currentPlayer.defeatStreak;
      let nextLocationLevel = currentPlayer.locationLevel;
      let nextHighestLocationLevel = currentPlayer.highestLocationLevel;
      let nextTutorialState = currentPlayer.tutorialState;
      const inventoryDelta: InventoryDelta = {};

      if (battle.result === 'VICTORY' && rewardIntent) {
        const progression = resolveLevelProgression(
          player.level,
          player.experience,
          rewardIntent.payload.experience,
          nextUnspentStatPoints,
        );
        nextLevel = progression.level;
        nextExperience = progression.experience;
        nextUnspentStatPoints = progression.unspentStatPoints;
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
      } else {
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
          unspentStatPoints: nextUnspentStatPoints,
          locationLevel: nextLocationLevel,
          activeBattleId: null,
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
        const appliedAt = new Date();
        const rewardLedger = createAppliedRewardLedgerEntry(rewardIntent, appliedAt.toISOString());

        await tx.rewardLedgerRecord.create({
          data: {
            playerId,
            ledgerKey: rewardLedger.ledgerKey,
            sourceType: rewardLedger.sourceType,
            sourceId: rewardLedger.sourceId,
            status: rewardLedger.status,
            entrySnapshot: stringifyJson(rewardLedger, '{}'),
            appliedAt,
          },
        });

        await tx.gameLog.create({
          data: {
            userId: player.userId,
            action: 'reward_claim_applied',
            details: stringifyJson({
              ledgerKey: rewardLedger.ledgerKey,
              sourceType: rewardLedger.sourceType,
              sourceId: rewardLedger.sourceId,
            }, '{}'),
          },
        });
      }

      const updatedPlayer = await this.requirePlayerRecord(tx, playerId);
      const finalizedBattle = await tx.battleSession.findFirst({
        where: {
          id: battle.id,
          playerId,
        },
      });

      if (!finalizedBattle) {
        throw new AppError('battle_not_found', 'Активный бой уже недоступен. Начните новый бой.');
      }

      const result = {
        player: this.mapPlayer(updatedPlayer),
        battle: this.mapBattle(finalizedBattle),
      };

      if (options?.commandKey && options.intentId && options.intentStateKey) {
        await this.finalizeCommandIntent<BattleView>(tx, playerId, options.intentId, result.battle);
      }

      return result;
    });
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
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: playerInclude,
    });

    if (!player) {
      throw new AppError('player_not_found', 'Игрок не найден.');
    }

    return this.mapPlayer(player);
  }

  private async requirePlayerRecord(client: TransactionClient | PrismaClient, playerId: number): Promise<PlayerRecord> {
    const player = await client.player.findUnique({
      where: { id: playerId },
      include: playerInclude,
    });

    if (!player) {
      throw new AppError('player_not_found', 'Игрок не найден.');
    }

    return player;
  }

  private mapPlayer(player: PlayerRecord): PlayerState {
    return {
      userId: player.userId,
      vkId: player.user.vkId,
      playerId: player.id,
      level: player.level,
      experience: player.experience,
      gold: player.gold,
      baseStats: {
        health: player.baseHealth,
        attack: player.baseAttack,
        defence: player.baseDefence,
        magicDefence: player.baseMagicDefence,
        dexterity: player.baseDexterity,
        intelligence: player.baseIntelligence,
      },
      allocationPoints: player.allocation
        ? {
            health: player.allocation.health,
            attack: player.allocation.attack,
            defence: player.allocation.defence,
            magicDefence: player.allocation.magicDefence,
            dexterity: player.allocation.dexterity,
            intelligence: player.allocation.intelligence,
          }
        : emptyStats(),
      unspentStatPoints: player.progress?.unspentStatPoints ?? 0,
      locationLevel: player.progress?.locationLevel ?? gameBalance.world.introLocationLevel,
      currentRuneIndex: player.progress?.currentRuneIndex ?? 0,
      activeBattleId: player.progress?.activeBattleId ?? null,
      victories: player.progress?.victories ?? 0,
      victoryStreak: player.progress?.victoryStreak ?? 0,
      defeats: player.progress?.defeats ?? 0,
      defeatStreak: player.progress?.defeatStreak ?? 0,
      mobsKilled: player.progress?.mobsKilled ?? 0,
      highestLocationLevel: player.progress?.highestLocationLevel ?? gameBalance.world.introLocationLevel,
      tutorialState: (player.progress?.tutorialState as PlayerState['tutorialState'] | undefined) ?? 'ACTIVE',
      inventory: player.inventory
        ? {
            usualShards: player.inventory.usualShards,
            unusualShards: player.inventory.unusualShards,
            rareShards: player.inventory.rareShards,
            epicShards: player.inventory.epicShards,
            legendaryShards: player.inventory.legendaryShards,
            mythicalShards: player.inventory.mythicalShards,
            leather: player.inventory.leather,
            bone: player.inventory.bone,
            herb: player.inventory.herb,
            essence: player.inventory.essence,
            metal: player.inventory.metal,
            crystal: player.inventory.crystal,
          }
        : emptyInventory(),
      runes: player.runes.map((rune): RuneView => ({
        id: rune.id,
        runeCode: rune.runeCode,
        archetypeCode: rune.archetypeCode,
        passiveAbilityCodes: parseJson<string[]>(rune.passiveAbilityCodes, []),
        activeAbilityCodes: parseJson<string[]>(rune.activeAbilityCodes, []),
        name: rune.name,
        rarity: rune.rarity as RuneRarity,
        health: rune.health,
        attack: rune.attack,
        defence: rune.defence,
        magicDefence: rune.magicDefence,
        dexterity: rune.dexterity,
        intelligence: rune.intelligence,
        isEquipped: rune.isEquipped,
        createdAt: rune.createdAt.toISOString(),
      })),
      createdAt: player.createdAt.toISOString(),
      updatedAt: player.updatedAt.toISOString(),
    };
  }

  private mapBattle(battle: {
    id: string;
    playerId: number;
    status: string;
    battleType: string;
    actionRevision: number;
    battleSnapshot?: string | null;
    playerLoadoutSnapshot?: string | null;
    locationLevel: number;
    biomeCode: string;
    enemyCode: string;
    turnOwner: string;
    playerSnapshot: string;
    enemySnapshot: string;
    log: string;
    result: string | null;
    rewardsSnapshot: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): BattleView {
    const persistedBattleSnapshot = parsePersistedBattleSnapshot(battle.battleSnapshot ?? null);
    const playerSnapshot = parseJson<BattleView['player']>(battle.playerSnapshot, defaultBattlePlayerSnapshot(battle.playerId));
    const enemySnapshot = parseJson<BattleView['enemy']>(battle.enemySnapshot, defaultBattleEnemySnapshot(battle.enemyCode));
    const battleLog = parseJson<BattleView['log']>(battle.log, []);
    const rewardsSnapshot = parseJson<BattleView['rewards']>(battle.rewardsSnapshot, null);
    const persistedLoadoutSnapshot = parsePersistedLoadoutSnapshot(battle.playerLoadoutSnapshot ?? null);

    const battleSnapshot = shouldUseVersionedBattleSnapshot(persistedBattleSnapshot.snapshot, battle.actionRevision)
      ? persistedBattleSnapshot.snapshot
      : {
      player: playerSnapshot,
      enemy: enemySnapshot,
      log: battleLog,
      result: battle.result as BattleView['result'],
      rewards: rewardsSnapshot,
    };

    if (persistedLoadoutSnapshot.fallbackToBattleSnapshot && !battleSnapshot.player.runeLoadout) {
      throw new AppError('loadout_snapshot_invalid', 'Снимок рунной сборки боя повреждён. Начните новый бой.');
    }

    return {
      id: battle.id,
      playerId: battle.playerId,
      status: battle.status as BattleView['status'],
      battleType: battle.battleType as BattleView['battleType'],
      actionRevision: battle.actionRevision,
      locationLevel: battle.locationLevel,
      biomeCode: battle.biomeCode,
      enemyCode: battle.enemyCode,
      turnOwner: battle.turnOwner as BattleView['turnOwner'],
      player: hydrateBattlePlayerSnapshot(battle.playerId, battleSnapshot.player, persistedLoadoutSnapshot.snapshot),
      enemy: battleSnapshot.enemy,
      log: battleSnapshot.log,
      result: battleSnapshot.result,
      rewards: battleSnapshot.rewards,
      createdAt: battle.createdAt.toISOString(),
      updatedAt: battle.updatedAt.toISOString(),
    };
  }
}
