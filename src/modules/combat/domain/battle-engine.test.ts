import { describe, expect, it, vi, afterEach } from 'vitest';

import type { BattleView } from '../../../shared/types/game';
import { BattleEngine } from './battle-engine';

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  locationLevel: 1,
  biomeCode: 'dark-forest',
  enemyCode: 'blue-slime',
  turnOwner: 'PLAYER',
  player: {
    playerId: 1,
    name: 'Рунный мастер #1001',
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 3,
    intelligence: 1,
    maxHealth: 8,
    currentHealth: 8,
    maxMana: 4,
    currentMana: 4,
  },
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
    maxHealth: 8,
    currentHealth: 8,
    maxMana: 4,
    currentMana: 4,
    experienceReward: 10,
    goldReward: 4,
    runeDropChance: 0,
    attackText: 'бьёт',
  },
  log: ['Враг найден.'],
  result: null,
  rewards: null,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BattleEngine', () => {
  it('завершает бой победой, если атака добивает врага', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      enemy: {
        ...createBattle().enemy,
        currentHealth: 3,
      },
    });

    const resolved = BattleEngine.attack(battle);

    expect(resolved.status).toBe('COMPLETED');
    expect(resolved.result).toBe('VICTORY');
    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.rewards?.experience).toBe(10);
  });

  it('не даёт защите опустить урон ниже единицы', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const battle = createBattle({
      turnOwner: 'ENEMY',
      player: {
        ...createBattle().player,
        defence: 999,
        currentHealth: 5,
        maxHealth: 5,
      },
      enemy: {
        ...createBattle().enemy,
        attack: 1,
      },
    });

    const resolved = BattleEngine.resolveEnemyTurn(battle);

    expect(resolved.player.currentHealth).toBe(4);
    expect(resolved.turnOwner).toBe('PLAYER');
  });
});
