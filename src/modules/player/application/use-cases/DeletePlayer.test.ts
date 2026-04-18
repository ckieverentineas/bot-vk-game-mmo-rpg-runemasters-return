import { describe, expect, it, vi } from 'vitest';

import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { DeletePlayer } from './DeletePlayer';

describe('DeletePlayer', () => {
  it('forwards the scoped confirmation intent to the repository', async () => {
    const repository = {
      confirmDeletePlayer: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new DeletePlayer(repository);

    await useCase.execute(1001, 'intent-delete-1', 'state-delete-1', 'payload');

    expect(repository.confirmDeletePlayer).toHaveBeenCalledWith(1001, 'intent-delete-1', 'state-delete-1');
  });

  it('rejects stale or missing confirmations before repository deletion', async () => {
    const repository = {
      confirmDeletePlayer: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new DeletePlayer(repository);

    await expect(useCase.execute(1001)).rejects.toMatchObject({ code: 'stale_command_intent' });
    await expect(useCase.execute(1001, 'intent-delete-2', undefined, 'payload')).rejects.toMatchObject({ code: 'stale_command_intent' });

    expect(repository.confirmDeletePlayer).not.toHaveBeenCalled();
  });
});
