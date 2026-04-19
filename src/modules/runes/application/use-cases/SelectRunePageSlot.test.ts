import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '../../../../../shared/types/game';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { buildSelectRunePageSlotIntentStateKey } from '../command-intent-state';
import { SelectRunePageSlot } from './SelectRunePageSlot';

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
  highestLocationLevel: 1,
  tutorialState: 'SKIPPED',
  inventory: {
    usualShards: 0, unusualShards: 0, rareShards: 0, epicShards: 0, legendaryShards: 0, mythicalShards: 0,
    leather: 0, bone: 0, herb: 0, essence: 0, metal: 0, crystal: 0,
  },
  runes: [
    { id: 'rune-1', runeCode: 'rune-1', archetypeCode: 'ember', passiveAbilityCodes: ['ember_heart'], activeAbilityCodes: ['ember_pulse'], name: 'Руна A', rarity: 'USUAL', isEquipped: false, health: 1, attack: 2, defence: 0, magicDefence: 0, dexterity: 0, intelligence: 0, createdAt: '2026-04-12T00:00:00.000Z' },
    { id: 'rune-2', runeCode: 'rune-2', archetypeCode: 'ember', passiveAbilityCodes: ['ember_heart'], activeAbilityCodes: ['ember_pulse'], name: 'Руна B', rarity: 'USUAL', isEquipped: false, health: 1, attack: 2, defence: 0, magicDefence: 0, dexterity: 0, intelligence: 0, createdAt: '2026-04-12T00:00:00.000Z' },
  ],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('SelectRunePageSlot', () => {
  it('passes guarded slot options when payload intent metadata is present', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveRuneCursor: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new SelectRunePageSlot(repository);
    const stateKey = buildSelectRunePageSlotIntentStateKey(player, 1);

    await useCase.execute(player.vkId, 1, 'intent-rune-slot-1', stateKey, 'payload');

    expect(repository.saveRuneCursor).toHaveBeenCalledWith(
      player.playerId,
      1,
      expect.objectContaining({
        commandKey: 'SELECT_RUNE_PAGE_SLOT',
        intentId: 'intent-rune-slot-1',
        intentStateKey: stateKey,
        expectedPlayerUpdatedAt: player.updatedAt,
      }),
    );
  });

  it('passes server-owned legacy text intent for rune slot selection', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      saveRuneCursor: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new SelectRunePageSlot(repository);

    await useCase.execute(player.vkId, 1, 'legacy-text:2000000001:1001:98:руна слот 2', undefined, 'legacy_text');

    expect(repository.saveRuneCursor).toHaveBeenCalledWith(
      player.playerId,
      1,
      expect.objectContaining({
        commandKey: 'SELECT_RUNE_PAGE_SLOT',
        intentId: 'legacy-text:2000000001:1001:98:руна слот 2',
        intentStateKey: 'legacy-text:2000000001:1001:98:руна слот 2',
        expectedPlayerUpdatedAt: player.updatedAt,
      }),
    );
  });

  it('returns the canonical legacy text replay before selecting the slot again', async () => {
    const player = createPlayer({ currentRuneIndex: 1 });
    const replayed = createPlayer({ currentRuneIndex: 1 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
      saveRuneCursor: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new SelectRunePageSlot(repository);

    await expect(useCase.execute(player.vkId, 1, 'legacy-text:2000000001:1001:99:руна слот 2', undefined, 'legacy_text')).resolves.toEqual(replayed);

    expect(repository.saveRuneCursor).not.toHaveBeenCalled();
  });

  it('rejects stale slot selection before persistence', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveRuneCursor: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new SelectRunePageSlot(repository);

    await expect(useCase.execute(player.vkId, 0, 'intent-rune-slot-1', 'stale-state', 'payload')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.saveRuneCursor).not.toHaveBeenCalled();
  });

  it('fail-closes legacy text slot selection without message metadata', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      saveRuneCursor: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new SelectRunePageSlot(repository);

    await expect(useCase.execute(player.vkId, 1, undefined, undefined, 'legacy_text')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.saveRuneCursor).not.toHaveBeenCalled();
  });
});
