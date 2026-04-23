import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '../../../../../shared/types/game';
import type { GameRandom } from '../../../../shared/application/ports/GameRandom';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { resolveCurrentProgressionLocationLevel } from '../../../player/domain/player-stats';
import { RuneFactory } from '../../domain/rune-factory';
import { RerollCurrentRuneStat } from './RerollCurrentRuneStat';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 100,
  baseStats: { health: 8, attack: 4, defence: 3, magicDefence: 1, dexterity: 2, intelligence: 1 },
  locationLevel: 1,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 0,
  tutorialState: 'SKIPPED',
  inventory: {
    usualShards: 20,
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
  runes: [{
    id: 'rune-1', runeCode: 'rune-1', archetypeCode: 'ember', passiveAbilityCodes: ['ember_heart'], activeAbilityCodes: ['ember_pulse'],
    name: 'Руна A', rarity: 'USUAL', isEquipped: false, health: 1, attack: 2, defence: 0, magicDefence: 0, dexterity: 0, intelligence: 0, createdAt: '2026-04-12T00:00:00.000Z',
  }],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createRandom = (): GameRandom => ({
  nextInt: vi.fn().mockReturnValue(3),
  rollPercentage: vi.fn().mockReturnValue(false),
  pickOne: vi.fn((items: readonly string[]) => items[0]),
});

const createScalingRandom = (): GameRandom => ({
  nextInt: vi.fn((min: number, max: number) => max),
  rollPercentage: vi.fn().mockReturnValue(false),
  pickOne: vi.fn((items: readonly string[]) => items[0]),
});

describe('RerollCurrentRuneStat', () => {
  it('uses a stable legacy text replay key without current-state validation', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      rerollRuneStat: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new RerollCurrentRuneStat(repository, createRandom());

    await useCase.execute(player.vkId, 'attack', 'legacy-text:2000000001:1001:78:~атк', undefined, 'legacy_text');

    expect(repository.rerollRuneStat).toHaveBeenCalledWith(
      player.playerId,
      'rune-1',
      'USUAL',
      expect.any(Object),
      'legacy-text:2000000001:1001:78:~атк',
      'legacy-text:2000000001:1001:78:~атк',
      undefined,
    );
  });

  it('rejects unscoped payload reroll commands', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      rerollRuneStat: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new RerollCurrentRuneStat(repository, createRandom());

    await expect(useCase.execute(player.vkId, 'attack', undefined, undefined, 'payload')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.rerollRuneStat).not.toHaveBeenCalled();
  });

  it('returns the canonical replay result before shard prechecks for legacy text', async () => {
    const replayed = createPlayer({ inventory: { ...createPlayer().inventory, usualShards: 0 } });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ inventory: { ...createPlayer().inventory, usualShards: 0 } })),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
      rerollRuneStat: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new RerollCurrentRuneStat(repository, createRandom());

    await expect(useCase.execute(1001, 'attack', 'legacy-text:2000000001:1001:78:~атк', undefined, 'legacy_text')).resolves.toEqual(replayed);

    expect(repository.rerollRuneStat).not.toHaveBeenCalled();
  });

  it('uses normalized progression level for skipped players stranded at intro state', async () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 0, level: 25 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      rerollRuneStat: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCaseRandom = createScalingRandom();
    const expectedRandom = createScalingRandom();
    const useCase = new RerollCurrentRuneStat(repository, useCaseRandom);
    const expectedRune = RuneFactory.rerollStat(player.runes[0]!, 'attack', resolveCurrentProgressionLocationLevel(player), expectedRandom);

    await useCase.execute(player.vkId, 'attack', 'legacy-text:2000000001:1001:78:~атк', undefined, 'legacy_text');

    expect(repository.rerollRuneStat).toHaveBeenCalledWith(
      player.playerId,
      'rune-1',
      'USUAL',
      {
        health: expectedRune.health,
        attack: expectedRune.attack,
        defence: expectedRune.defence,
        magicDefence: expectedRune.magicDefence,
        dexterity: expectedRune.dexterity,
        intelligence: expectedRune.intelligence,
      },
      'legacy-text:2000000001:1001:78:~атк',
      'legacy-text:2000000001:1001:78:~атк',
      undefined,
    );
  });

  it('waits for dust before spending a shard on reroll', async () => {
    const player = createPlayer({ gold: 0 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      rerollRuneStat: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new RerollCurrentRuneStat(repository, createRandom());

    await expect(useCase.execute(player.vkId, 'attack', 'legacy-text:2000000001:1001:78:~атк', undefined, 'legacy_text')).rejects.toMatchObject({
      code: 'not_enough_rune_resources',
    });

    expect(repository.rerollRuneStat).not.toHaveBeenCalled();
  });
});
