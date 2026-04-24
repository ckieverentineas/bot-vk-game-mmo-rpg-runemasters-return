import { describe, expect, it } from 'vitest';

import { AppError } from '../../../shared/domain/AppError';
import type { BattlePlayerSnapshot, BattleView, PlayerState } from '../../../shared/types/game';
import { prepareBattleForActor } from './party-battle-actor';

const createSnapshot = (playerId: number, name: string): BattlePlayerSnapshot => ({
  playerId,
  name,
  attack: 4,
  defence: 2,
  magicDefence: 1,
  dexterity: 2,
  intelligence: 1,
  maxHealth: 12,
  currentHealth: 12,
  maxMana: 4,
  currentMana: 4,
  runeLoadout: null,
  supportRuneLoadout: null,
  guardPoints: 0,
});

const createPlayer = (playerId: number): PlayerState => ({
  playerId,
} as PlayerState);

const createPartyBattle = (): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PARTY_PVE',
  actionRevision: 0,
  locationLevel: 1,
  biomeCode: 'test',
  enemyCode: 'slime',
  turnOwner: 'PLAYER',
  player: createSnapshot(1, 'Leader'),
  enemy: {
    code: 'slime',
    name: 'Slime',
    kind: 'enemy',
    isElite: false,
    isBoss: false,
    attack: 2,
    defence: 0,
    magicDefence: 0,
    dexterity: 1,
    intelligence: 0,
    maxHealth: 8,
    currentHealth: 8,
    maxMana: 0,
    currentMana: 0,
    experienceReward: 1,
    goldReward: 1,
    runeDropChance: 0,
    lootTable: {},
    attackText: 'hits',
    intent: null,
    hasUsedSignatureMove: false,
  },
  party: {
    id: 'party-1',
    inviteCode: 'ABC123',
    leaderPlayerId: 1,
    currentTurnPlayerId: 2,
    enemyTargetPlayerId: null,
    actedPlayerIds: [],
    members: [
      {
        playerId: 1,
        vkId: 101,
        name: 'Leader',
        snapshot: createSnapshot(1, 'Leader'),
      },
      {
        playerId: 2,
        vkId: 102,
        name: 'Ally',
        snapshot: createSnapshot(2, 'Ally'),
      },
    ],
  },
  log: [],
  result: null,
  rewards: null,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
});

describe('prepareBattleForActor', () => {
  it('uses the active party member snapshot for the acting player', () => {
    const battle = createPartyBattle();
    const preparedBattle = prepareBattleForActor(battle, createPlayer(2));

    expect(preparedBattle.player).toEqual(battle.party?.members[1]?.snapshot);
  });

  it('rejects party members outside their turn', () => {
    let thrown: unknown;

    try {
      prepareBattleForActor(createPartyBattle(), createPlayer(1));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).code).toBe('party_member_turn_required');
  });
});
