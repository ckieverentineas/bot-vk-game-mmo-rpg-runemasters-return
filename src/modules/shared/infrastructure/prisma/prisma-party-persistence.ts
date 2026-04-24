import { Prisma, PrismaClient } from '@prisma/client';

import { randomBytes } from 'node:crypto';

import { AppError } from '../../../../shared/domain/AppError';
import type { PartyView } from '../../../../shared/types/game';
import {
  type PlayerRecord,
} from './prisma-game-mappers';
import { isPrismaUniqueConstraintError } from './prisma-error-utils';

type TransactionClient = Prisma.TransactionClient;

type PrismaPersistenceClient = TransactionClient | PrismaClient;

type RequirePlayerRecord = (
  client: PrismaPersistenceClient,
  playerId: number,
) => Promise<PlayerRecord>;

interface PrismaPartyPersistenceContext {
  readonly requirePlayerRecord: RequirePlayerRecord;
}

const activePartyStatuses = ['OPEN', 'IN_BATTLE'] as const;

export const partyInclude = {
  members: {
    include: {
      player: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'asc' as const,
    },
  },
} satisfies Prisma.PlayerPartyInclude;

export type PartyRecord = Prisma.PlayerPartyGetPayload<{ include: typeof partyInclude }>;

const createPartyInviteCode = (): string => randomBytes(3).toString('hex').toUpperCase();

const normalizePartyInviteCode = (inviteCode: string): string => (
  inviteCode.trim().replace(/\s+/g, '').toUpperCase()
);

const normalizePartyRole = (role: string): PartyView['members'][number]['role'] => (
  role === 'LEADER' ? 'LEADER' : 'MEMBER'
);

const formatPartyMemberName = (vkId: number): string => `Рунный мастер #${vkId}`;

export const mapPartyRecord = (party: PartyRecord): PartyView => ({
  id: party.id,
  inviteCode: party.inviteCode,
  leaderPlayerId: party.leaderPlayerId,
  status: party.status === 'IN_BATTLE' ? 'IN_BATTLE' : party.status === 'COMPLETED' ? 'COMPLETED' : 'OPEN',
  maxMembers: party.maxMembers,
  activeBattleId: party.activeBattleId,
  members: party.members.map((member) => ({
    playerId: member.playerId,
    vkId: member.player.user.vkId,
    name: formatPartyMemberName(member.player.user.vkId),
    role: normalizePartyRole(member.role),
    joinedAt: member.joinedAt.toISOString(),
  })),
  createdAt: party.createdAt.toISOString(),
  updatedAt: party.updatedAt.toISOString(),
});

export class PrismaPartyPersistence {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly context: PrismaPartyPersistenceContext,
  ) {}

  public async getActiveParty(playerId: number): Promise<PartyView | null> {
    const party = await this.findActivePartyRecord(this.prisma, playerId);
    return party ? mapPartyRecord(party) : null;
  }

  public async createParty(playerId: number): Promise<PartyView> {
    return this.prisma.$transaction(async (tx) => {
      const existingParty = await this.findActivePartyRecord(tx, playerId);
      if (existingParty) {
        return mapPartyRecord(existingParty);
      }

      const player = await this.context.requirePlayerRecord(tx, playerId);
      if (player.progress?.activeBattleId) {
        throw new AppError('party_player_busy', 'Сначала завершите текущий бой, затем собирайте отряд.');
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const party = await tx.playerParty.create({
            data: {
              inviteCode: createPartyInviteCode(),
              leaderPlayerId: playerId,
              maxMembers: 2,
              members: {
                create: {
                  playerId,
                  role: 'LEADER',
                },
              },
            },
            include: partyInclude,
          });

          return mapPartyRecord(party);
        } catch (error) {
          if (!isPrismaUniqueConstraintError(error)) {
            throw error;
          }
        }
      }

      throw new AppError('party_invite_code_collision', 'Не удалось создать код отряда. Попробуйте ещё раз.');
    });
  }

  public async joinPartyByInviteCode(playerId: number, inviteCode: string): Promise<PartyView> {
    const normalizedInviteCode = normalizePartyInviteCode(inviteCode);
    if (!normalizedInviteCode) {
      throw new AppError('party_invite_code_invalid', 'Введите код отряда после команды.');
    }

    return this.prisma.$transaction(async (tx) => {
      const party = await tx.playerParty.findFirst({
        where: {
          inviteCode: normalizedInviteCode,
          status: 'OPEN',
        },
        include: partyInclude,
      });

      if (!party) {
        throw new AppError('party_not_found', 'Отряд с таким кодом не найден или уже ушёл в бой.');
      }

      if (party.members.some((member) => member.playerId === playerId)) {
        return mapPartyRecord(party);
      }

      const existingParty = await this.findActivePartyRecord(tx, playerId);
      if (existingParty) {
        throw new AppError('party_already_joined', 'Вы уже состоите в активном отряде.');
      }

      const player = await this.context.requirePlayerRecord(tx, playerId);
      if (player.progress?.activeBattleId) {
        throw new AppError('party_player_busy', 'Сначала завершите текущий бой, затем входите в отряд.');
      }

      if (party.members.length >= party.maxMembers) {
        throw new AppError('party_full', 'В этом отряде уже два мастера.');
      }

      await tx.playerPartyMember.create({
        data: {
          partyId: party.id,
          playerId,
          role: 'MEMBER',
        },
      });

      const updatedParty = await tx.playerParty.findUnique({
        where: { id: party.id },
        include: partyInclude,
      });

      if (!updatedParty) {
        throw new AppError('party_not_found', 'Отряд уже рассеялся.');
      }

      return mapPartyRecord(updatedParty);
    });
  }

  public async leaveParty(playerId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const party = await this.findActivePartyRecord(tx, playerId);
      if (!party) {
        throw new AppError('party_not_found', 'Сейчас вы не состоите в активном отряде.');
      }

      if (party.leaderPlayerId === playerId) {
        throw new AppError('party_disband_required', 'Лидер может только распустить отряд целиком.');
      }

      if (party.activeBattleId !== null || party.status === 'IN_BATTLE') {
        throw new AppError('party_battle_active', 'Нельзя выйти из отряда посреди общего боя.');
      }

      await tx.playerPartyMember.deleteMany({
        where: {
          partyId: party.id,
          playerId,
        },
      });
    });
  }

  public async disbandParty(playerId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const party = await this.findActivePartyRecord(tx, playerId);
      if (!party) {
        throw new AppError('party_not_found', 'Сейчас у вас нет активного отряда.');
      }

      if (party.leaderPlayerId !== playerId) {
        throw new AppError('party_leader_required', 'Только лидер может распустить отряд.');
      }

      if (party.activeBattleId !== null || party.status === 'IN_BATTLE') {
        throw new AppError('party_battle_active', 'Нельзя распустить отряд посреди общего боя.');
      }

      await tx.playerParty.updateMany({
        where: {
          id: party.id,
          leaderPlayerId: playerId,
        },
        data: {
          status: 'COMPLETED',
          activeBattleId: null,
        },
      });
    });
  }

  private async findActivePartyRecord(
    client: PrismaPersistenceClient,
    playerId: number,
  ): Promise<PartyRecord | null> {
    return client.playerParty.findFirst({
      where: {
        status: { in: [...activePartyStatuses] },
        members: {
          some: { playerId },
        },
      },
      include: partyInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
}
