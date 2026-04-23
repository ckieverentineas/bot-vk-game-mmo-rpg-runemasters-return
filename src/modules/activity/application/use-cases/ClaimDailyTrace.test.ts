import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '../../../../shared/types/game';
import { emptyInventory } from '../../../player/domain/player-stats';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import { ClaimDailyTrace } from './ClaimDailyTrace';

const now = new Date('2026-04-23T04:00:00.000Z');

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 2,
  experience: 0,
  gold: 10,
  radiance: 0,
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

const applyReward = (player: PlayerState): PlayerState => ({
  ...player,
  gold: player.gold + 6,
  radiance: player.radiance + 1,
  inventory: {
    ...player.inventory,
    usualShards: player.inventory.usualShards + 1,
    leather: player.inventory.leather + 1,
  },
});

const createRepository = (
  player = createPlayer(),
  claimed = true,
): GameRepository => ({
  findPlayerByVkId: vi.fn().mockResolvedValue(player),
  getCommandIntentResult: vi.fn().mockResolvedValue(null),
  claimDailyActivityReward: vi.fn().mockImplementation(async (_playerId, activityCode, gameDay, reward) => ({
    player: claimed ? applyReward(player) : player,
    activityCode,
    gameDay,
    reward,
    claimed,
  })),
} as unknown as GameRepository);

const createTelemetry = (): GameTelemetry => ({
  economyTransactionCommitted: vi.fn().mockResolvedValue(undefined),
  dailyTraceClaimed: vi.fn().mockResolvedValue(undefined),
  dailyTraceAlreadyClaimed: vi.fn().mockResolvedValue(undefined),
} as unknown as GameTelemetry);

const createUseCase = (
  repository: GameRepository,
  telemetry = createTelemetry(),
): ClaimDailyTrace => (
  new ClaimDailyTrace(repository, telemetry, () => now)
);

describe('ClaimDailyTrace', () => {
  it('claims the optional daily trace once through the reward ledger rail', async () => {
    const player = createPlayer();
    const repository = createRepository(player);
    const telemetry = createTelemetry();
    const result = await createUseCase(repository, telemetry).execute(player.vkId);

    expect(repository.claimDailyActivityReward).toHaveBeenCalledWith(
      player.playerId,
      'soft_daily_trace',
      '2026-04-23',
      { gold: 6, radiance: 1, inventoryDelta: { usualShards: 1, leather: 1 } },
      undefined,
    );
    expect(result.claimedNow).toBe(true);
    expect(result.player.gold).toBe(16);
    expect(result.player.radiance).toBe(1);
    expect(telemetry.dailyTraceClaimed).toHaveBeenCalledWith(player.userId, {
      playerId: player.playerId,
      activityCode: 'soft_daily_trace',
      gameDay: '2026-04-23',
      claimedNow: true,
      rewardDustDelta: 6,
      rewardRadianceDelta: 1,
      rewardShardsDelta: 1,
    });
    expect(telemetry.economyTransactionCommitted).toHaveBeenCalledWith(player.userId, {
      transactionType: 'reward_claim',
      sourceType: 'DAILY_TRACE',
      sourceId: 'soft_daily_trace:2026-04-23',
      resourceDustDelta: 6,
      resourceRadianceDelta: 1,
      resourceShardsDelta: 1,
      runeDelta: 0,
      playerLevel: 2,
    });
  });

  it('returns an already-claimed view without economy telemetry', async () => {
    const player = createPlayer();
    const repository = createRepository(player, false);
    const telemetry = createTelemetry();
    const result = await createUseCase(repository, telemetry).execute(player.vkId);

    expect(result.claimedNow).toBe(false);
    expect(result.player.gold).toBe(10);
    expect(telemetry.dailyTraceAlreadyClaimed).toHaveBeenCalledWith(player.userId, {
      playerId: player.playerId,
      activityCode: 'soft_daily_trace',
      gameDay: '2026-04-23',
      claimedNow: false,
      rewardDustDelta: 6,
      rewardRadianceDelta: 1,
      rewardShardsDelta: 1,
    });
    expect(telemetry.economyTransactionCommitted).not.toHaveBeenCalled();
  });

  it('stores command intent metadata when the command comes from legacy text', async () => {
    const player = createPlayer();
    const repository = createRepository(player);

    await createUseCase(repository).execute(
      player.vkId,
      'legacy-text:2000000001:1001:101:след дня',
      undefined,
      'legacy_text',
    );

    expect(repository.claimDailyActivityReward).toHaveBeenCalledWith(
      player.playerId,
      'soft_daily_trace',
      '2026-04-23',
      { gold: 6, radiance: 1, inventoryDelta: { usualShards: 1, leather: 1 } },
      {
        commandKey: 'CLAIM_DAILY_TRACE',
        intentId: 'legacy-text:2000000001:1001:101:след дня',
        intentStateKey: 'legacy-text:2000000001:1001:101:след дня',
        currentStateKey: 'legacy-text:2000000001:1001:101:след дня',
      },
    );
  });

  it('returns canonical command replay before claiming another trace', async () => {
    const player = createPlayer();
    const repository = createRepository(player);
    vi.mocked(repository.getCommandIntentResult).mockResolvedValueOnce({
      status: 'APPLIED',
      result: {
        player,
        activityCode: 'soft_daily_trace',
        gameDay: '2026-04-23',
        reward: { gold: 6, radiance: 1, inventoryDelta: { usualShards: 1, leather: 1 } },
        claimed: true,
      },
    });

    const result = await createUseCase(repository).execute(
      player.vkId,
      'legacy-text:2000000001:1001:101:след дня',
      undefined,
      'legacy_text',
    );

    expect(result).toMatchObject({
      claimedNow: true,
      replayed: true,
      trace: {
        activityCode: 'soft_daily_trace',
        gameDay: '2026-04-23',
      },
    });
    expect(repository.claimDailyActivityReward).not.toHaveBeenCalled();
  });

  it('still returns the daily trace if telemetry fails after persistence', async () => {
    const repository = createRepository();
    const telemetry = createTelemetry();
    vi.mocked(telemetry.dailyTraceClaimed!).mockRejectedValueOnce(new Error('telemetry offline'));

    await expect(createUseCase(repository, telemetry).execute(1001))
      .resolves.toMatchObject({ claimedNow: true });
  });
});
