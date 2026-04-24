import { describe, expect, it } from 'vitest';

import {
  resolveEnemyThreatBountyReward,
  resolveEnemyThreatDisplayName,
  resolveEnemyThreatRank,
} from './enemy-threat-growth';

describe('enemy threat growth', () => {
  it('does not create a tavern bounty before the enemy receives a name', () => {
    const bounty = resolveEnemyThreatBountyReward({
      enemyName: 'Синий слизень',
      survivalCount: 2,
      experience: 18,
      levelBonus: 2,
    });

    expect(resolveEnemyThreatRank({
      enemyName: 'Синий слизень',
      survivalCount: 2,
      experience: 18,
      levelBonus: 2,
    })).toBe('SURVIVOR');
    expect(bounty).toEqual({
      experience: 0,
      gold: 0,
      shards: {},
    });
  });

  it('creates a dynamic tavern bounty for named threats', () => {
    const threat = {
      enemyName: 'Синий слизень',
      survivalCount: 3,
      experience: 24,
      levelBonus: 3,
    };

    expect(resolveEnemyThreatDisplayName(threat)).toBe('Упрямый Синий слизень');
    expect(resolveEnemyThreatBountyReward(threat)).toEqual({
      experience: 12,
      gold: 33,
      shards: {
        USUAL: 1,
        UNUSUAL: 1,
      },
    });
  });

  it('raises the tavern bounty again when a threat becomes a calamity', () => {
    const bounty = resolveEnemyThreatBountyReward({
      enemyName: 'Синий слизень',
      survivalCount: 6,
      experience: 60,
      levelBonus: 6,
    });

    expect(bounty).toEqual({
      experience: 29,
      gold: 77,
      shards: {
        USUAL: 3,
        UNUSUAL: 2,
        RARE: 1,
      },
    });
  });
});
