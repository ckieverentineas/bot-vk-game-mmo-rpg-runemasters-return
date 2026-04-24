import { describe, expect, it, vi } from 'vitest';

import type {
  EconomyTransactionTelemetryPayload,
  GameTelemetry,
} from '../../shared/application/ports/GameTelemetry';
import {
  buildRewardEconomyTelemetryPayload,
  trackRewardEconomyTelemetry,
} from './reward-economy-telemetry';

describe('reward economy telemetry', () => {
  it('builds a normalized economy payload for resource rewards', () => {
    expect(buildRewardEconomyTelemetryPayload({
      sourceType: 'QUEST_REWARD',
      sourceId: 'awakening_empty_master',
      reward: {
        gold: 6,
        radiance: 2,
        inventoryDelta: {
          usualShards: 1,
          rareShards: 2,
          herb: 3,
        },
      },
      playerLevel: 4,
    })).toEqual({
      transactionType: 'reward_claim',
      sourceType: 'QUEST_REWARD',
      sourceId: 'awakening_empty_master',
      resourceDustDelta: 6,
      resourceRadianceDelta: 2,
      resourceShardsDelta: 3,
      runeDelta: 0,
      playerLevel: 4,
    });
  });

  it('tracks claimed rewards and ignores already claimed replays', async () => {
    const economyTransactionCommitted = vi
      .fn<[number, EconomyTransactionTelemetryPayload], Promise<void>>()
      .mockResolvedValue(undefined);
    const telemetry = {
      economyTransactionCommitted,
    } as Partial<GameTelemetry> as GameTelemetry;

    await trackRewardEconomyTelemetry(telemetry, 1001, {
      sourceType: 'DAILY_TRACE',
      sourceId: 'daily:2026-04-12',
      reward: {
        gold: 1,
      },
      claimed: false,
      playerLevel: 1,
    });

    expect(economyTransactionCommitted).not.toHaveBeenCalled();

    await trackRewardEconomyTelemetry(telemetry, 1001, {
      sourceType: 'DAILY_TRACE',
      sourceId: 'daily:2026-04-12',
      reward: {
        gold: 1,
      },
      claimed: true,
      playerLevel: 1,
    });

    expect(economyTransactionCommitted).toHaveBeenCalledWith(1001, {
      transactionType: 'reward_claim',
      sourceType: 'DAILY_TRACE',
      sourceId: 'daily:2026-04-12',
      resourceDustDelta: 1,
      resourceRadianceDelta: 0,
      resourceShardsDelta: 0,
      runeDelta: 0,
      playerLevel: 1,
    });
  });
});
