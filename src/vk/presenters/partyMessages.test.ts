import { describe, expect, it } from 'vitest';

import type { PartyView, PlayerState } from '../../shared/types/game';
import { renderParty } from './partyMessages';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: {
    health: 8,
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 3,
    intelligence: 1,
  },
  locationLevel: 1,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 1,
  tutorialState: 'SKIPPED',
  inventory: {
    usualShards: 0,
    unusualShards: 0,
    rareShards: 0,
    epicShards: 0,
    legendaryShards: 0,
    mythicalShards: 0,
    leather: 0,
    bone: 0,
    herb: 0,
    essence: 0,
    metal: 0,
    crystal: 0,
    radiance: 0,
    starlight: 0,
  },
  runes: [],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  ...overrides,
});

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
      joinedAt: '2026-04-24T00:00:00.000Z',
    },
    {
      playerId: 2,
      vkId: 1002,
      name: 'Рунный мастер #1002',
      role: 'MEMBER',
      joinedAt: '2026-04-24T00:01:00.000Z',
    },
  ],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:01:00.000Z',
});

describe('renderParty', () => {
  it('marks the viewer and ally in the party roster', () => {
    const message = renderParty(createPlayer(), createParty());

    expect(message).toContain('Рунный мастер #1001 · вы · лидер');
    expect(message).toContain('Рунный мастер #1002 · союзник');
  });
});
