import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BattleView } from '../../../shared/types/game';
import { resolveEnemyActionTurn } from './battle-enemy-actions';

type BattlePlayerSnapshot = BattleView['player'];
type BattleEnemySnapshot = BattleView['enemy'];

const createPlayerSnapshot = (
  overrides: Partial<BattlePlayerSnapshot> = {},
): BattlePlayerSnapshot => ({
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
  ...overrides,
});

const createEnemySnapshot = (
  overrides: Partial<BattleEnemySnapshot> = {},
): BattleEnemySnapshot => ({
  code: 'training-bandit',
  name: 'Training Bandit',
  kind: 'bandit',
  isElite: false,
  isBoss: false,
  attack: 5,
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
  ...overrides,
});

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-enemy-actions-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 0,
  locationLevel: 1,
  biomeCode: 'dark-forest',
  enemyCode: 'training-bandit',
  turnOwner: 'ENEMY',
  player: createPlayerSnapshot(),
  enemy: createEnemySnapshot(),
  log: ['Battle started.'],
  result: null,
  rewards: null,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('battle enemy actions', () => {
  it('resolves a basic enemy attack and returns the player turn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const resolved = resolveEnemyActionTurn(createBattle());

    expect(resolved.player.currentHealth).toBe(6);
    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.log.length).toBeGreaterThan(1);
  });

  it('keeps the response window open when signature reaction succeeds', () => {
    const battle = createBattle({
      enemy: createEnemySnapshot({
        kind: 'slime',
        currentHealth: 6,
      }),
    });

    const resolved = resolveEnemyActionTurn(battle, {
      signatureReactionChancePercent: 58,
      signatureReactionSucceeded: true,
    });

    expect(resolved.enemy.intent?.code).toBe('GUARD_BREAK');
    expect(resolved.enemy.hasUsedSignatureMove).toBe(false);
    expect(resolved.player.currentHealth).toBe(10);
    expect(resolved.turnOwner).toBe('PLAYER');
    expect(resolved.log.some((entry) => entry.includes('58%'))).toBe(true);
  });

  it('fires the prepared signature move immediately when reaction fails', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      player: createPlayerSnapshot({
        guardPoints: 3,
      }),
      enemy: createEnemySnapshot({
        kind: 'slime',
        currentHealth: 6,
      }),
    });

    const resolved = resolveEnemyActionTurn(battle, {
      signatureReactionChancePercent: 42,
      signatureReactionSucceeded: false,
    });

    expect(resolved.enemy.intent).toBeNull();
    expect(resolved.enemy.hasUsedSignatureMove).toBe(true);
    expect(resolved.player.guardPoints).toBe(0);
    expect(resolved.player.currentHealth).toBe(5);
    expect(resolved.turnOwner).toBe('PLAYER');
  });

  it('resolves an already prepared heavy strike', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const battle = createBattle({
      enemy: createEnemySnapshot({
        kind: 'wolf',
        intent: {
          code: 'HEAVY_STRIKE',
          title: 'Heavy Strike',
          description: 'The next enemy attack is stronger.',
          bonusAttack: 3,
        },
      }),
    });

    const resolved = resolveEnemyActionTurn(battle);

    expect(resolved.enemy.intent).toBeNull();
    expect(resolved.enemy.hasUsedSignatureMove).toBe(true);
    expect(resolved.player.currentHealth).toBe(3);
    expect(resolved.turnOwner).toBe('PLAYER');
  });
});
