import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '../../../../shared/types/game';
import type { GameTelemetry } from '../../../shared/application/ports/GameTelemetry';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { resolveAdaptiveAdventureLocationLevel } from '../../../player/domain/player-stats';
import { buildSkipTutorialIntentStateKey } from '../command-intent-state';
import { SkipTutorial } from './SkipTutorial';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 5,
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
  locationLevel: 0,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 2,
  victoryStreak: 1,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 2,
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

const createTelemetry = (): GameTelemetry => ({
  onboardingStarted: vi.fn().mockResolvedValue(undefined),
  tutorialPathChosen: vi.fn().mockResolvedValue(undefined),
  loadoutChanged: vi.fn().mockResolvedValue(undefined),
  schoolNoviceEliteEncounterStarted: vi.fn().mockResolvedValue(undefined),
  firstSchoolPresented: vi.fn().mockResolvedValue(undefined),
  firstSchoolCommitted: vi.fn().mockResolvedValue(undefined),
  schoolNoviceFollowUpActionTaken: vi.fn().mockResolvedValue(undefined),
  returnRecapShown: vi.fn().mockResolvedValue(undefined),
  postSessionNextGoalShown: vi.fn().mockResolvedValue(undefined),
});

describe('SkipTutorial', () => {
  it('moves active tutorial players onto the adventure path and marks onboarding skipped', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      saveExplorationState: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const telemetry = createTelemetry();
    const useCase = new SkipTutorial(repository, telemetry);

    await useCase.execute(player.vkId);

    expect(repository.saveExplorationState).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({
        locationLevel: resolveAdaptiveAdventureLocationLevel(player),
        tutorialState: 'SKIPPED',
      }),
      expect.objectContaining({
        commandKey: 'SKIP_TUTORIAL',
        expectedTutorialState: 'ACTIVE',
      }),
    );
    expect(telemetry.tutorialPathChosen).toHaveBeenCalledWith(player.userId, {
      entrySurface: 'skip_tutorial',
      choice: 'skip_tutorial',
      tutorialState: 'ACTIVE',
    });
  });

  it('keeps completed tutorial state unchanged on repeated skip command', async () => {
    const player = createPlayer({ tutorialState: 'COMPLETED', locationLevel: 0 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      saveExplorationState: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const telemetry = createTelemetry();
    const useCase = new SkipTutorial(repository, telemetry);

    await useCase.execute(player.vkId);

    expect(repository.saveExplorationState).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({
        tutorialState: 'COMPLETED',
      }),
      expect.objectContaining({
        commandKey: 'SKIP_TUTORIAL',
        expectedTutorialState: 'COMPLETED',
      }),
    );
    expect(telemetry.tutorialPathChosen).not.toHaveBeenCalled();
  });

  it('passes guarded exploration options when intent metadata is present', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      saveExplorationState: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new SkipTutorial(repository, createTelemetry());
    const stateKey = buildSkipTutorialIntentStateKey(player);

    await useCase.execute(player.vkId, 'intent-skip-1', stateKey, 'payload');

    expect(repository.saveExplorationState).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({
        locationLevel: resolveAdaptiveAdventureLocationLevel(player),
        tutorialState: 'SKIPPED',
      }),
      expect.objectContaining({
        commandKey: 'SKIP_TUTORIAL',
        intentId: 'intent-skip-1',
        intentStateKey: stateKey,
        expectedLocationLevel: player.locationLevel,
        expectedTutorialState: player.tutorialState,
      }),
    );
  });

  it('returns the canonical replay result before state checks for legacy text', async () => {
    const replayed = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0 })),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new SkipTutorial(repository, createTelemetry());

    await expect(useCase.execute(1001, 'legacy-text:2000000001:1001:85:пропустить обучение', undefined, 'legacy_text')).resolves.toEqual({ player: replayed, replayed: true });

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('still returns canonical replay after a later battle starts', async () => {
    const replayed = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1, activeBattleId: 'battle-1' })),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new SkipTutorial(repository, createTelemetry());

    await expect(useCase.execute(1001, 'legacy-text:2000000001:1001:85:пропустить обучение', undefined, 'legacy_text')).resolves.toEqual({ player: replayed, replayed: true });

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('still returns canonical payload replay after a later battle starts', async () => {
    const replayed = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1, activeBattleId: 'battle-1' })),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new SkipTutorial(repository, createTelemetry());

    await expect(useCase.execute(1001, 'intent-skip-1', 'state-skip-1', 'payload')).resolves.toEqual({ player: replayed, replayed: true });

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('rejects stale payload or missing legacy intent before persistence', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new SkipTutorial(repository, createTelemetry());

    await expect(useCase.execute(player.vkId, 'intent-skip-1', 'stale-state', 'payload')).rejects.toMatchObject({ code: 'stale_command_intent' });
    await expect(useCase.execute(player.vkId, undefined, undefined, 'legacy_text')).rejects.toMatchObject({ code: 'stale_command_intent' });

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('rejects skip command while a battle is already active', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0, activeBattleId: 'battle-1' });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new SkipTutorial(repository, createTelemetry());

    await expect(useCase.execute(player.vkId)).rejects.toMatchObject({ code: 'battle_in_progress' });

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('returns retry-pending for duplicate legacy text command still being processed', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'PENDING' }),
      saveExplorationState: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new SkipTutorial(repository, createTelemetry());

    await expect(useCase.execute(player.vkId, 'legacy-text:2000000001:1001:85:пропустить обучение', undefined, 'legacy_text')).rejects.toMatchObject({ code: 'command_retry_pending' });

    expect(repository.saveExplorationState).not.toHaveBeenCalled();
  });

  it('does not fail the skip flow if telemetry logging throws after persistence', async () => {
    const player = createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0 });
    const updatedPlayer = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      saveExplorationState: vi.fn().mockResolvedValue(updatedPlayer),
    } as unknown as GameRepository;
    const telemetry = createTelemetry();
    vi.mocked(telemetry.tutorialPathChosen).mockRejectedValueOnce(new Error('telemetry offline'));
    const useCase = new SkipTutorial(repository, telemetry);

    await expect(useCase.execute(player.vkId)).resolves.toEqual(updatedPlayer);
    expect(repository.saveExplorationState).toHaveBeenCalled();
  });
});
