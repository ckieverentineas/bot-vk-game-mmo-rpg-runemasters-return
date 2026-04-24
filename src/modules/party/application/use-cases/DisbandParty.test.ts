import { describe, expect, it, vi } from 'vitest';

import { createTestPlayer } from '../../../../shared/testing/game-factories';
import { createTestPlayerLookupRepository } from '../../../../shared/testing/repository-factories';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { DisbandParty } from './DisbandParty';

describe('DisbandParty', () => {
  it('disbands the leader active party and returns the empty party screen state', async () => {
    const player = createTestPlayer({ locationLevel: 1, highestLocationLevel: 1, tutorialState: 'SKIPPED' });
    const repository = {
      ...createTestPlayerLookupRepository([player]),
      disbandParty: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new DisbandParty(repository);

    await expect(useCase.execute(player.vkId)).resolves.toEqual({
      player,
      party: null,
    });

    expect(repository.disbandParty).toHaveBeenCalledWith(player.playerId);
  });
});
