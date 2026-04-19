import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '../../../../../shared/types/game';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { DestroyCurrentRune } from './DestroyCurrentRune';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
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

describe('DestroyCurrentRune', () => {
  it('uses a stable legacy text replay key without current-state validation', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      destroyRune: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new DestroyCurrentRune(repository);

    await useCase.execute(player.vkId, 'legacy-text:2000000001:1001:79:сломать', undefined, 'legacy_text');

    expect(repository.destroyRune).toHaveBeenCalledWith(
      player.playerId,
      'rune-1',
      { usualShards: 2 },
      'legacy-text:2000000001:1001:79:сломать',
      'legacy-text:2000000001:1001:79:сломать',
      undefined,
    );
  });

  it('rejects unscoped payload destroy commands', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      destroyRune: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new DestroyCurrentRune(repository);

    await expect(useCase.execute(player.vkId, undefined, undefined, 'payload')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.destroyRune).not.toHaveBeenCalled();
  });

  it('returns the canonical replay result before rune selection prechecks for legacy text', async () => {
    const replayed = createPlayer({ runes: [] });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ runes: [] })),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
      destroyRune: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new DestroyCurrentRune(repository);

    await expect(useCase.execute(1001, 'legacy-text:2000000001:1001:79:сломать', undefined, 'legacy_text')).resolves.toEqual(replayed);

    expect(repository.destroyRune).not.toHaveBeenCalled();
  });
});
