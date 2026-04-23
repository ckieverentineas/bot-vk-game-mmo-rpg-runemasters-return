import { describe, expect, it } from 'vitest';

import type { PlayerState } from '../../shared/types/game';
import { emptyInventory } from '../../modules/player/domain/player-stats';
import type { ClaimDailyTraceView } from '../../modules/activity/application/use-cases/ClaimDailyTrace';
import { renderDailyTrace } from './activityMessages';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: {
    health: 30,
    attack: 5,
    defence: 2,
    magicDefence: 1,
    dexterity: 1,
    intelligence: 1,
  },
  locationLevel: 1,
  currentRuneIndex: 0,
  unlockedRuneSlotCount: 2,
  activeBattleId: null,
  victories: 1,
  victoryStreak: 1,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 1,
  highestLocationLevel: 1,
  tutorialState: 'COMPLETED',
  inventory: emptyInventory(),
  schoolMasteries: [],
  skills: [],
  runes: [],
  createdAt: '2026-04-22T00:00:00.000Z',
  updatedAt: '2026-04-22T00:00:00.000Z',
  ...overrides,
});

const createView = (overrides: Partial<ClaimDailyTraceView> = {}): ClaimDailyTraceView => ({
  player: createPlayer(),
  claimedNow: true,
  trace: {
    activityCode: 'soft_daily_trace',
    gameDay: '2026-04-23',
    title: 'Заметка на старой карте',
    description: 'На полях карты проступает тихая пометка.',
    reward: { gold: 6, inventoryDelta: { usualShards: 1, leather: 1 } },
  },
  ...overrides,
});

describe('renderDailyTrace', () => {
  it('shows the optional reward without streak pressure', () => {
    const message = renderDailyTrace(createView());

    expect(message).toContain('След дня');
    expect(message).toContain('Найдено:');
    expect(message).toContain('без серии');
    expect(message).toContain('без штрафа за пропуск');
    expect(message).toContain('След:');
  });

  it('keeps already-claimed copy compact and non-punitive', () => {
    const message = renderDailyTrace(createView({ claimedNow: false }));

    expect(message).toContain('уже найден');
    expect(message).toContain('Серии нет');
    expect(message).toContain('штрафов за пропуск нет');
    expect(message).not.toContain('Найдено:');
  });
});
