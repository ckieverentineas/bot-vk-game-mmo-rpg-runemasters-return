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
import { emptyInventory, emptyStats, resolveAdaptiveAdventureLocationLevel, resolveLevelProgression, shardFieldForRarity } from '../../../player/domain/player-stats';
import type { GameRepository } from '../../application/ports/GameRepository';

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

type PersistedBattleState = Pick<BattleView, 'status' | 'turnOwner' | 'player' | 'enemy' | 'log' | 'result' | 'rewards'>;

const buildInventoryDeltaInput = (delta: InventoryDelta): Record<string, { increment: number }> => {
  const data: Record<string, { increment: number }> = {};

  for (const [key, value] of Object.entries(delta)) {
    if (value !== undefined && value !== 0) {
      data[key] = { increment: value };
    }
  }

  return data;
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
});

const mapBattlePersistence = (battle: PersistedBattleState) => ({
  status: battle.status,
  turnOwner: battle.turnOwner,
  playerSnapshot: stringifyJson(battle.player, '{}'),
  enemySnapshot: stringifyJson(battle.enemy, '{}'),
  log: stringifyJson(battle.log, '[]'),
  result: battle.result,
  rewardsSnapshot: battle.rewards ? stringifyJson(battle.rewards, 'null') : null,
});

export class PrismaGameRepository implements GameRepository {
  public constructor(private readonly prisma: PrismaClient) {}

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

  public async deletePlayerByVkId(vkId: number): Promise<void> {
    await this.prisma.user.delete({
      where: { vkId },
    });
  }

  public async createPlayer(vkId: number): Promise<PlayerState> {
    const existing = await this.findPlayerByVkId(vkId);
    if (existing) {
      return existing;
    }

    const created = await this.prisma.user.create({
      data: {
        vkId,
        player: {
          create: {
            level: env.game.startingLevel,
            experience: 0,
            gold: 0,
            baseHealth: 4,
            baseAttack: 2,
            baseDefence: 3,
            baseMagicDefence: 0,
            baseDexterity: 2,
            baseIntelligence: 0,
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

    if (!created.player) {
      throw new AppError('player_create_failed', 'Не удалось создать игрока.');
    }

    return this.mapPlayer(created.player);
  }

  public async saveAllocation(playerId: number, allocationPoints: StatBlock, unspentStatPoints: number): Promise<PlayerState> {
    await this.prisma.$transaction(async (tx) => {
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

      await tx.playerProgress.update({
        where: { playerId },
        data: { unspentStatPoints },
      });
    });

    return this.requirePlayer(playerId);
  }

  public async saveExplorationState(
    playerId: number,
    state: Pick<PlayerState, 'locationLevel' | 'highestLocationLevel' | 'victoryStreak' | 'defeatStreak' | 'tutorialState'>,
  ): Promise<PlayerState> {
    await this.prisma.playerProgress.update({
      where: { playerId },
      data: {
        locationLevel: state.locationLevel,
        highestLocationLevel: state.highestLocationLevel,
        victoryStreak: state.victoryStreak,
        defeatStreak: state.defeatStreak,
        tutorialState: state.tutorialState,
      },
    });

    return this.requirePlayer(playerId);
  }

  public async saveRuneCursor(playerId: number, currentRuneIndex: number): Promise<PlayerState> {
    await this.prisma.playerProgress.update({
      where: { playerId },
      data: { currentRuneIndex },
    });

    return this.requirePlayer(playerId);
  }

  public async equipRune(playerId: number, runeId: string | null): Promise<PlayerState> {
    await this.prisma.$transaction(async (tx) => {
      await tx.rune.updateMany({
        where: { playerId },
        data: { isEquipped: false },
      });

      if (runeId) {
        await tx.rune.update({
          where: { id: runeId },
          data: { isEquipped: true },
        });
      }
    });

    return this.requirePlayer(playerId);
  }

  public async createRune(playerId: number, rune: RuneDraft): Promise<PlayerState> {
    await this.prisma.rune.create({
      data: {
        playerId,
        name: rune.name,
        rarity: rune.rarity,
        health: rune.health,
        attack: rune.attack,
        defence: rune.defence,
        magicDefence: rune.magicDefence,
        dexterity: rune.dexterity,
        intelligence: rune.intelligence,
        isEquipped: rune.isEquipped,
      },
    });

    return this.requirePlayer(playerId);
  }

  public async updateRuneStats(playerId: number, runeId: string, stats: StatBlock): Promise<PlayerState> {
    await this.prisma.rune.update({
      where: { id: runeId },
      data: {
        health: stats.health,
        attack: stats.attack,
        defence: stats.defence,
        magicDefence: stats.magicDefence,
        dexterity: stats.dexterity,
        intelligence: stats.intelligence,
      },
    });

    return this.requirePlayer(playerId);
  }

  public async deleteRune(playerId: number, runeId: string): Promise<PlayerState> {
    await this.prisma.rune.deleteMany({
      where: { id: runeId, playerId },
    });

    return this.requirePlayer(playerId);
  }

  public async adjustInventory(playerId: number, delta: InventoryDelta): Promise<PlayerState> {
    const data = buildInventoryDeltaInput(delta);
    if (Object.keys(data).length === 0) {
      return this.requirePlayer(playerId);
    }

    await this.prisma.playerInventory.update({
      where: { playerId },
      data: data as Prisma.PlayerInventoryUpdateInput,
    });

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

  public async createBattle(playerId: number, battle: CreateBattleInput): Promise<BattleView> {
    const created = await this.prisma.$transaction(async (tx) => {
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

      await tx.playerProgress.update({
        where: { playerId },
        data: { activeBattleId: battleRow.id },
      });

      return battleRow;
    });

    return this.mapBattle(created);
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

  public async saveBattle(battle: BattleView): Promise<BattleView> {
    const updated = await this.prisma.battleSession.update({
      where: { id: battle.id },
      data: mapBattlePersistence(battle),
    });

    return this.mapBattle(updated);
  }

  public async finalizeBattle(playerId: number, battle: BattleView, droppedRune: RuneDraft | null): Promise<PlayerState> {
    return this.prisma.$transaction(async (tx) => {
      const player = await this.requirePlayerRecord(tx, playerId);
      const currentPlayer = this.mapPlayer(player);

      await tx.battleSession.update({
        where: { id: battle.id },
        data: mapBattlePersistence(battle),
      });

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

      if (battle.result === 'VICTORY' && battle.rewards) {
        const progression = resolveLevelProgression(player.level, player.experience, battle.rewards.experience, nextUnspentStatPoints);
        nextLevel = progression.level;
        nextExperience = progression.experience;
        nextUnspentStatPoints = progression.unspentStatPoints;
        nextGold = player.gold + battle.rewards.gold;
        nextVictories += 1;
        nextVictoryStreak += 1;
        nextDefeatStreak = 0;
        nextMobsKilled += 1;

        if (battle.locationLevel > gameBalance.world.introLocationLevel) {
          nextHighestLocationLevel = Math.max(currentPlayer.highestLocationLevel, battle.locationLevel);
        }

        for (const [rarity, amount] of Object.entries(battle.rewards.shards) as Array<[RuneRarity, number | undefined]>) {
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
        if (currentPlayer.tutorialState === 'ACTIVE' && battle.result === 'VICTORY') {
          nextTutorialState = 'COMPLETED';
          nextLocationLevel = nextAdventureLocationLevel;
        } else {
          nextLocationLevel = gameBalance.world.introLocationLevel;
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

      if (droppedRune) {
        await tx.rune.create({
          data: {
            playerId,
            name: droppedRune.name,
            rarity: droppedRune.rarity,
            health: droppedRune.health,
            attack: droppedRune.attack,
            defence: droppedRune.defence,
            magicDefence: droppedRune.magicDefence,
            dexterity: droppedRune.dexterity,
            intelligence: droppedRune.intelligence,
            isEquipped: false,
          },
        });
      }

      const updatedPlayer = await this.requirePlayerRecord(tx, playerId);
      return this.mapPlayer(updatedPlayer);
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
    return {
      id: battle.id,
      playerId: battle.playerId,
      status: battle.status as BattleView['status'],
      battleType: battle.battleType as BattleView['battleType'],
      locationLevel: battle.locationLevel,
      biomeCode: battle.biomeCode,
      enemyCode: battle.enemyCode,
      turnOwner: battle.turnOwner as BattleView['turnOwner'],
      player: parseJson<BattleView['player']>(battle.playerSnapshot, defaultBattlePlayerSnapshot(battle.playerId)),
      enemy: parseJson<BattleView['enemy']>(battle.enemySnapshot, defaultBattleEnemySnapshot(battle.enemyCode)),
      log: parseJson<BattleView['log']>(battle.log, []),
      result: battle.result as BattleView['result'],
      rewards: parseJson<BattleView['rewards']>(battle.rewardsSnapshot, null),
      createdAt: battle.createdAt.toISOString(),
      updatedAt: battle.updatedAt.toISOString(),
    };
  }
}
