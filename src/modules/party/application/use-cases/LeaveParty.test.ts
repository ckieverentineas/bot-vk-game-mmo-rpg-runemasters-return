import { describe, expect, it, vi } from 'vitest';

import { createTestPlayer } from '../../../../shared/testing/game-factories';
import { createTestPlayerLookupRepository } from '../../../../shared/testing/repository-factories';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { LeaveParty } from './LeaveParty';

describe('LeaveParty', () => {
  it('removes the player from the active party and returns the empty party screen state', async () => {
    const player = createTestPlayer({ vkId: 1002, playerId: 2, locationLevel: 1, highestLocationLevel: 1, tutorialState: 'SKIPPED' });
    const repository = {
      ...createTestPlayerLookupRepository([player]),
      leaveParty: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new LeaveParty(repository);

    await expect(useCase.execute(player.vkId)).resolves.toEqual({
      player,
      party: null,
    });

    expect(repository.leaveParty).toHaveBeenCalledWith(player.playerId);
  });
});
