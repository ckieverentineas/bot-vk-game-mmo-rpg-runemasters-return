import { describe, expect, it } from 'vitest';

import type { BattleView } from '../../../shared/types/game';
import {
  finishEnemyAction,
  finishPlayerAction,
  preparePartyEnemyTarget,
} from './battle-turn-flow';

const createPlayerSnapshot = (overrides: Partial<BattleView['player']> = {}): BattleView['player'] => ({
  playerId: 1,
  name: 'Рунный мастер #1001',
  attack: 4,
  defence: 2,
  magicDefence: 1,
  dexterity: 3,
  intelligence: 4,
  maxHealth: 10,
  currentHealth: 10,
  maxMana: 4,
  currentMana: 1,
  runeLoadout: null,
  supportRuneLoadout: null,
  guardPoints: 0,
  ...overrides,
});

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-turn-flow-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 0,
  locationLevel: 1,
  biomeCode: 'dark-forest',
  enemyCode: 'blue-slime',
  turnOwner: 'PLAYER',
  player: createPlayerSnapshot(),
  enemy: {
    code: 'blue-slime',
    name: 'Синий слизень',
    kind: 'slime',
    isElite: false,
    isBoss: false,
    attack: 3,
    defence: 1,
    magicDefence: 0,
    dexterity: 2,
    intelligence: 1,
    maxHealth: 12,
    currentHealth: 12,
    maxMana: 0,
    currentMana: 0,
    experienceReward: 10,
    goldReward: 4,
    runeDropChance: 0,
    attackText: 'бьёт',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['Бой начался.'],
  result: null,
  rewards: null,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  ...overrides,
});

const createPartyBattle = (
  overrides: Partial<BattleView> = {},
): BattleView & { party: NonNullable<BattleView['party']> } => {
  const firstMember = createPlayerSnapshot({ playerId: 1, name: 'Рунный мастер #1001' });
  const secondMember = createPlayerSnapshot({ playerId: 2, name: 'Рунный мастер #1002' });

  return createBattle({
    battleType: 'PARTY_PVE',
    player: firstMember,
    party: {
      id: 'party-1',
      inviteCode: 'ABC123',
      leaderPlayerId: 1,
      currentTurnPlayerId: 1,
      enemyTargetPlayerId: null,
      actedPlayerIds: [],
      members: [
        { playerId: 1, vkId: 1001, name: firstMember.name, snapshot: firstMember },
        { playerId: 2, vkId: 1002, name: secondMember.name, snapshot: secondMember },
      ],
    },
    ...overrides,
  }) as BattleView & { party: NonNullable<BattleView['party']> };
};

describe('battle turn flow', () => {
  it('syncs a party member and passes the player turn to the next living member', () => {
    const battle = createPartyBattle({
      player: createPlayerSnapshot({ playerId: 1, currentHealth: 6, currentMana: 2 }),
    });

    const resolved = finishPlayerAction(battle);

    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.player.playerId).toBe(2);
    expect(resolved.party?.currentTurnPlayerId).toBe(2);
    expect(resolved.party?.actedPlayerIds).toEqual([1]);
    expect(resolved.party?.members[0]?.snapshot.currentHealth).toBe(6);
    expect(resolved.party?.members[0]?.snapshot.currentMana).toBe(2);
  });

  it('passes the turn to the enemy after every living party member acted', () => {
    const secondMember = createPlayerSnapshot({ playerId: 2, name: 'Рунный мастер #1002' });
    const battle = createPartyBattle({
      player: secondMember,
      party: {
        ...createPartyBattle().party,
        currentTurnPlayerId: 2,
        actedPlayerIds: [1],
      },
    });

    const resolved = finishPlayerAction(battle);

    expect(resolved.turnOwner).toBe('ENEMY');
    expect(resolved.party?.currentTurnPlayerId).toBeNull();
    expect(resolved.party?.actedPlayerIds).toEqual([1, 2]);
  });

  it('refreshes mana and rune cooldown when the enemy turn returns to a solo player', () => {
    const battle = createBattle({
      turnOwner: 'ENEMY',
      player: createPlayerSnapshot({
        currentMana: 1,
        runeLoadout: {
          runeId: 'rune-1',
          runeName: 'Руна Бури',
          archetypeCode: 'gale',
          archetypeName: 'Буря',
          passiveAbilityCodes: [],
          activeAbility: {
            code: 'gale_step',
            name: 'Шаг шквала',
            manaCost: 2,
            cooldownTurns: 2,
            currentCooldown: 2,
          },
        },
      }),
    });

    const resolved = finishEnemyAction(battle);

    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.player.currentMana).toBe(2);
    expect(resolved.player.runeLoadout?.activeAbility?.currentCooldown).toBe(1);
    expect(resolved.log.some((entry) => entry.includes('Рунный фокус: +1 маны'))).toBe(true);
  });

  it('selects a living party target for enemy actions and finishes defeat when nobody lives', () => {
    const battle = createPartyBattle({
      party: {
        ...createPartyBattle().party,
        enemyTargetPlayerId: 2,
      },
    });

    const targeted = preparePartyEnemyTarget(battle);

    expect(targeted.status).toBe('ACTIVE');
    expect(targeted.player.playerId).toBe(2);
    expect(targeted.party?.enemyTargetPlayerId).toBe(2);

    const defeatedParty = createPartyBattle({
      party: {
        ...createPartyBattle().party,
        members: createPartyBattle().party.members.map((member) => ({
          ...member,
          snapshot: {
            ...member.snapshot,
            currentHealth: 0,
          },
        })),
      },
    });

    const defeated = preparePartyEnemyTarget(defeatedParty);

    expect(defeated.status).toBe('COMPLETED');
    expect(defeated.result).toBe('DEFEAT');
  });
});
