import { describe, expect, it, vi } from 'vitest';

import { createTestPlayer } from '../../../../shared/testing/game-factories';
import { createTestPlayerLookupRepository } from '../../../../shared/testing/repository-factories';
import type { PartyView } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { JoinParty } from './JoinParty';

const createParty = (): PartyView => ({
  id: 'party-1',
  inviteCode: 'ABC123',
  leaderPlayerId: 1,
  status: 'OPEN',
  activeBattleId: null,
  maxMembers: 2,
  members: [
    {
      playerId: 1,
      vkId: 1001,
      name: 'Рунный мастер #1001',
      role: 'LEADER',
      joinedAt: '2026-04-12T00:00:00.000Z',
    },
    {
      playerId: 2,
      vkId: 1002,
      name: 'Рунный мастер #1002',
      role: 'MEMBER',
      joinedAt: '2026-04-12T00:01:00.000Z',
    },
  ],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:01:00.000Z',
});

describe('JoinParty', () => {
  it('marks the ally as newly joined when they had no active party before the invite', async () => {
    const leader = createTestPlayer({ vkId: 1001, playerId: 1 });
    const ally = createTestPlayer({ vkId: 1002, playerId: 2 });
    const party = createParty();
    const repository = {
      ...createTestPlayerLookupRepository([leader, ally]),
      getActiveParty: vi.fn().mockResolvedValue(null),
      joinPartyByInviteCode: vi.fn().mockResolvedValue(party),
    } as unknown as GameRepository;
    const useCase = new JoinParty(repository);

    await expect(useCase.execute(ally.vkId, ' ABC123 ')).resolves.toEqual({
      player: ally,
      party,
      joinedNow: true,
    });

    expect(repository.getActiveParty).toHaveBeenCalledWith(ally.playerId);
    expect(repository.joinPartyByInviteCode).toHaveBeenCalledWith(ally.playerId, 'ABC123');
  });

  it('marks the ally as already present when they repeat the same invite command', async () => {
    const leader = createTestPlayer({ vkId: 1001, playerId: 1 });
    const ally = createTestPlayer({ vkId: 1002, playerId: 2 });
    const party = createParty();
    const repository = {
      ...createTestPlayerLookupRepository([leader, ally]),
      getActiveParty: vi.fn().mockResolvedValue(party),
      joinPartyByInviteCode: vi.fn().mockResolvedValue(party),
    } as unknown as GameRepository;
    const useCase = new JoinParty(repository);

    await expect(useCase.execute(ally.vkId, 'ABC123')).resolves.toEqual({
      player: ally,
      party,
      joinedNow: false,
    });
  });
});
