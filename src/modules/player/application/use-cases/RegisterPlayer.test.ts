import { describe, expect, it, vi } from 'vitest';

import { createTestPlayer } from '../../../../shared/testing/game-factories';
import type { GameTelemetry } from '../../../../shared/application/ports/GameTelemetry';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { RegisterPlayer } from './RegisterPlayer';

describe('RegisterPlayer', () => {
  it('logs registration only for a true fresh create', async () => {
    const player = createTestPlayer();
    const telemetry = {
      onboardingStarted: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameTelemetry;
    const repository = {
      createPlayer: vi.fn().mockResolvedValue({ player, created: true, recoveredFromRace: false }),
      log: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new RegisterPlayer(repository, telemetry);

    const result = await useCase.execute(player.vkId);

    expect(result).toEqual({ player, created: true });
    expect(repository.log).toHaveBeenCalledTimes(1);
    expect(telemetry.onboardingStarted).toHaveBeenCalledWith(player.userId, {
      entrySurface: 'start',
      tutorialState: player.tutorialState,
    });
  });

  it('returns created false without duplicate log when creation lost a race', async () => {
    const player = createTestPlayer();
    const telemetry = {
      onboardingStarted: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameTelemetry;
    const repository = {
      createPlayer: vi.fn().mockResolvedValue({ player, created: false, recoveredFromRace: false }),
      log: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new RegisterPlayer(repository, telemetry);

    const result = await useCase.execute(player.vkId);

    expect(result).toEqual({ player, created: false });
    expect(repository.log).not.toHaveBeenCalled();
    expect(telemetry.onboardingStarted).not.toHaveBeenCalled();
  });

  it('keeps first-run welcome semantics when creation lost a uniqueness race', async () => {
    const player = createTestPlayer();
    const telemetry = {
      onboardingStarted: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameTelemetry;
    const repository = {
      createPlayer: vi.fn().mockResolvedValue({ player, created: false, recoveredFromRace: true }),
      log: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new RegisterPlayer(repository, telemetry);

    const result = await useCase.execute(player.vkId);

    expect(result).toEqual({ player, created: true });
    expect(repository.log).not.toHaveBeenCalled();
    expect(telemetry.onboardingStarted).not.toHaveBeenCalled();
  });
});
