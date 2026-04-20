import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '../../../../../shared/types/game';
import type { GameTelemetry } from '../../../../shared/application/ports/GameTelemetry';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { RegisterPlayer } from './RegisterPlayer';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: { health: 8, attack: 4, defence: 3, magicDefence: 1, dexterity: 2, intelligence: 1 },
  locationLevel: 0,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 0,
  tutorialState: 'ACTIVE',
  inventory: {
    usualShards: 0, unusualShards: 0, rareShards: 0, epicShards: 0, legendaryShards: 0, mythicalShards: 0,
    leather: 0, bone: 0, herb: 0, essence: 0, metal: 0, crystal: 0,
  },
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('RegisterPlayer', () => {
  it('logs registration only for a true fresh create', async () => {
    const player = createPlayer();
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
    const player = createPlayer();
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
    const player = createPlayer();
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
