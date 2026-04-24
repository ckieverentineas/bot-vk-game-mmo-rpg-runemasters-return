import { Prisma, PrismaClient } from '@prisma/client';

import { env } from '../../../../config/env';
import { gameBalance } from '../../../../config/game-balance';
import { AppError } from '../../../../shared/domain/AppError';
import type { PlayerState } from '../../../../shared/types/game';
import {
  DEFAULT_UNLOCKED_RUNE_SLOT_COUNT,
} from '../../../player/domain/player-stats';
import type { CreatePlayerResult } from '../../application/ports/GameRepository';
import {
  mapPlayerRecord,
  playerInclude,
  type PlayerRecord,
} from './prisma-game-mappers';
import { isPrismaUniqueConstraintError } from './prisma-error-utils';

type PrismaPersistenceClient = PrismaClient | Prisma.TransactionClient;

export class PrismaPlayerPersistence {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findPlayerByVkId(vkId: number): Promise<PlayerState | null> {
    const player = await this.prisma.player.findFirst({
      where: {
        user: {
          vkId,
        },
      },
      include: playerInclude,
    });

    return player ? mapPlayerRecord(player) : null;
  }

  public async findPlayerById(playerId: number): Promise<PlayerState | null> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: playerInclude,
    });

    return player ? mapPlayerRecord(player) : null;
  }

  public async createPlayer(vkId: number): Promise<CreatePlayerResult> {
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
              radiance: 0,
              baseHealth: 8,
              baseAttack: 4,
              baseDefence: 3,
              baseMagicDefence: 1,
              baseDexterity: 3,
              baseIntelligence: 1,
              progress: {
                create: {
                  locationLevel: gameBalance.world.introLocationLevel,
                  currentRuneIndex: 0,
                  unlockedRuneSlotCount: DEFAULT_UNLOCKED_RUNE_SLOT_COUNT,
                  activeBattleId: null,
                  currentHealth: 8,
                  currentMana: 4,
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
      if (!isPrismaUniqueConstraintError(error)) {
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
      player: mapPlayerRecord(created.player),
      created: true,
      recoveredFromRace: false,
    };
  }

  public async requirePlayer(playerId: number): Promise<PlayerState> {
    return mapPlayerRecord(await this.requirePlayerRecord(this.prisma, playerId));
  }

  public async requirePlayerRecord(
    client: PrismaPersistenceClient,
    playerId: number,
  ): Promise<PlayerRecord> {
    const player = await client.player.findUnique({
      where: { id: playerId },
      include: playerInclude,
    });

    if (!player) {
      throw new AppError('player_not_found', 'Игрок не найден.');
    }

    return player;
  }
}
