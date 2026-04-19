import { describe, expect, it, vi } from 'vitest';

import { gameBalance } from '../../../../config/game-balance';
import type { PlayerState } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildEnterTutorialModeIntentStateKey } from '../command-intent-state';
import { EnterTutorialMode } from './EnterTutorialMode';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: {
    health: 8,
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 2,
    intelligence: 1,
  },
  locationLevel: 1,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 1,
  tutorialState: 'ACTIVE',
  inventory: {
    usualShards: 0,
    unusualShards: 0,
    rareShards: 0,
    epicShards: 0,
    legendaryShards: 0,
    mythicalShards: 0,
    leather: 0,
    bone: 0,
    herb: 0,
    essence: 0,
    metal: 0,
    crystal: 0,
  },
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('EnterTutorialMode', () => {
  it('moves active tutorial players into the intro location', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 2 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveExplorationState: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new EnterTutorialMode(repository);

    await useCase.execute(player.vkId);

    expect(repository.saveExplorationState).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({
        locationLevel: gameBalance.world.introLocationLevel,
        tutorialState: 'ACTIVE',
      }),
      expect.objectContaining({
        commandKey: 'ENTER_TUTORIAL_MODE',
      }),
    );
  });

  it('passes guarded exploration options when payload intent metadata is present', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 2 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      saveExplorationState: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new EnterTutorialMode(repository);
    const stateKey = buildEnterTutorialModeIntentStateKey(player);

    await useCase.execute(player.vkId, 'intent-location-1', stateKey, 'payload');

    expect(repository.saveExplorationState).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({
        locationLevel: gameBalance.world.introLocationLevel,
      }),
      expect.objectContaining({
        commandKey: 'ENTER_TUTORIAL_MODE',
        intentId: 'intent-location-1',
        intentStateKey: stateKey,
        expectedLocationLevel: player.locationLevel,
        expectedTutorialState: player.tutorialState,
      }),
    );
  });

  it('does not re-enter tutorial mode for skipped players', async () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: gameBalance.world.introLocationLevel });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EnterTutorialMode(repository);

    await expect(useCase.execute(player.vkId)).resolves.toEqual(player);

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('returns the canonical replay result for legacy text when no fresher battle context exists', async () => {
    const replayed = createPlayer({ tutorialState: 'ACTIVE', locationLevel: gameBalance.world.introLocationLevel });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ tutorialState: 'ACTIVE', locationLevel: gameBalance.world.introLocationLevel, activeBattleId: null })),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EnterTutorialMode(repository);

    await expect(useCase.execute(1001, 'legacy-text:2000000001:1001:94:локация', undefined, 'legacy_text')).resolves.toEqual(replayed);

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('prefers the current battle context over replaying an older tutorial-entry text command', async () => {
    const replayed = createPlayer({ tutorialState: 'ACTIVE', locationLevel: gameBalance.world.introLocationLevel, activeBattleId: null });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ tutorialState: 'ACTIVE', activeBattleId: 'battle-1' })),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EnterTutorialMode(repository);

    await expect(useCase.execute(1001, 'legacy-text:2000000001:1001:94:локация', undefined, 'legacy_text')).rejects.toMatchObject({
      code: 'battle_in_progress',
    });

    expect(repository.getCommandIntentResult).not.toHaveBeenCalled();
    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('rejects replaying an older tutorial-entry result after the player moved to a fresher non-battle exploration state', async () => {
    const replayed = createPlayer({ tutorialState: 'ACTIVE', locationLevel: gameBalance.world.introLocationLevel, activeBattleId: null });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1, activeBattleId: null })),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EnterTutorialMode(repository);

    await expect(useCase.execute(1001, 'legacy-text:2000000001:1001:94:локация', undefined, 'legacy_text')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('rejects stale payload or missing legacy intent before persistence', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 2 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EnterTutorialMode(repository);

    await expect(useCase.execute(player.vkId, 'intent-location-2', 'stale-state', 'payload')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });
    await expect(useCase.execute(player.vkId, undefined, undefined, 'legacy_text')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('rejects tutorial screen entry while a battle is already active', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', activeBattleId: 'battle-1' });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EnterTutorialMode(repository);

    await expect(useCase.execute(player.vkId)).rejects.toMatchObject({
      code: 'battle_in_progress',
    });

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('returns retry-pending for duplicate legacy text location command still being processed', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 2 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'PENDING' }),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EnterTutorialMode(repository);

    await expect(useCase.execute(player.vkId, 'legacy-text:2000000001:1001:94:локация', undefined, 'legacy_text')).rejects.toMatchObject({
      code: 'command_retry_pending',
    });

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });
});
