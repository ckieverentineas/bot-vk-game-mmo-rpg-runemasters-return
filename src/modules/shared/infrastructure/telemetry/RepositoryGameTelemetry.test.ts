import { describe, expect, it, vi } from 'vitest';

import type { GameRepository } from '../../application/ports/GameRepository';
import { RepositoryGameTelemetry } from './RepositoryGameTelemetry';

describe('RepositoryGameTelemetry', () => {
  it('logs economy transactions with the stable event shape', async () => {
    const repository = {
      log: vi.fn().mockResolvedValue(undefined),
    } as unknown as Pick<GameRepository, 'log'>;
    const telemetry = new RepositoryGameTelemetry(repository);

    await telemetry.economyTransactionCommitted(1, {
      transactionType: 'reward_claim',
      sourceType: 'QUEST_REWARD',
      sourceId: 'awakening_empty_master',
      resourceDustDelta: 5,
      resourceShardsDelta: 1,
      runeDelta: 0,
      playerLevel: 1,
    });

    expect(repository.log).toHaveBeenCalledWith(1, 'economy_transaction_committed', {
      event_version: 1,
      transactionType: 'reward_claim',
      sourceType: 'QUEST_REWARD',
      sourceId: 'awakening_empty_master',
      resourceDustDelta: 5,
      resourceShardsDelta: 1,
      runeDelta: 0,
      playerLevel: 1,
    });
  });

  it('logs daily trace claim telemetry with a stable event name', async () => {
    const repository = {
      log: vi.fn().mockResolvedValue(undefined),
    } as unknown as Pick<GameRepository, 'log'>;
    const telemetry = new RepositoryGameTelemetry(repository);

    await telemetry.dailyTraceClaimed(1, {
      playerId: 1,
      activityCode: 'soft_daily_trace',
      gameDay: '2026-04-23',
      claimedNow: true,
      rewardDustDelta: 6,
      rewardShardsDelta: 1,
    });

    expect(repository.log).toHaveBeenCalledWith(1, 'daily_trace_claimed', {
      event_version: 1,
      playerId: 1,
      activityCode: 'soft_daily_trace',
      gameDay: '2026-04-23',
      claimedNow: true,
      rewardDustDelta: 6,
      rewardShardsDelta: 1,
    });
  });
});
