import { describe, expect, it } from 'vitest';

import type { BattleView } from '../../../shared/types/game';
import {
  attemptBattleFlee,
  engageBattleEncounter,
} from './battle-encounter-actions';

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-encounter-actions-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 0,
  locationLevel: 1,
  biomeCode: 'dark-forest',
  enemyCode: 'blue-slime',
  turnOwner: 'PLAYER',
  player: {
    playerId: 1,
    name: 'Tester',
    attack: 4,
    defence: 2,
    magicDefence: 1,
    dexterity: 3,
    intelligence: 4,
    maxHealth: 10,
    currentHealth: 10,
    maxMana: 8,
    currentMana: 4,
    runeLoadout: null,
    supportRuneLoadout: null,
    guardPoints: 0,
  },
  enemy: {
    code: 'blue-slime',
    name: 'Blue Slime',
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
    attackText: 'hits',
    intent: null,
    hasUsedSignatureMove: false,
  },
  encounter: {
    status: 'OFFERED',
    initialTurnOwner: 'ENEMY',
    canFlee: true,
    fleeChancePercent: 52,
    effectLine: 'Enemy starts wounded.',
  },
  log: ['Encounter offered.'],
  result: null,
  rewards: null,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  ...overrides,
});

describe('battle encounter actions', () => {
  it('engages an offered encounter with the stored initial turn owner', () => {
    const resolved = engageBattleEncounter(createBattle());

    expect(resolved.encounter?.status).toBe('ENGAGED');
    expect(resolved.status).toBe('ACTIVE');
    expect(resolved.turnOwner).toBe('ENEMY');
    expect(resolved.log.length).toBeGreaterThan(1);
  });

  it('finishes the encounter as fled when retreat succeeds', () => {
    const resolved = attemptBattleFlee(createBattle(), true);

    expect(resolved.encounter?.status).toBe('FLED');
    expect(resolved.status).toBe('COMPLETED');
    expect(resolved.result).toBe('FLED');
    expect(resolved.rewards).toBeNull();
  });

  it('starts combat on the enemy turn when retreat fails', () => {
    const resolved = attemptBattleFlee(createBattle(), false);

    expect(resolved.encounter?.status).toBe('ENGAGED');
    expect(resolved.status).toBe('ACTIVE');
    expect(resolved.turnOwner).toBe('ENEMY');
  });
});
