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
});
