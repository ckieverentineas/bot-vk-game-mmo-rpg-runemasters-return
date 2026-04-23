import { describe, expect, it, vi } from 'vitest';

import type { PlayerState, RuneView } from '../../../../../shared/types/game';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { GetRuneCollection } from './GetRuneCollection';

const createRune = (overrides: Partial<RuneView> = {}): RuneView => ({
  id: 'rune-1',
  runeCode: 'rune-1',
  archetypeCode: 'ember',
  passiveAbilityCodes: ['ember_heart'],
  activeAbilityCodes: ['ember_pulse'],
  name: 'Обычная руна Пламени',
  rarity: 'USUAL',
  isEquipped: true,
  equippedSlot: 0,
  health: 1,
  attack: 2,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
  createdAt: '2026-04-13T00:00:00.000Z',
  ...overrides,
});

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
  victories: 3,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 3,
  highestLocationLevel: 3,
  tutorialState: 'SKIPPED',
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
  schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
  skills: [],
  runes: [
    createRune(),
    createRune({
      id: 'rune-2',
      runeCode: 'rune-2',
      name: 'Первый знак Пламени',
      rarity: 'UNUSUAL',
      isEquipped: false,
      equippedSlot: null,
    }),
  ],
  createdAt: '2026-04-13T00:00:00.000Z',
  updatedAt: '2026-04-13T00:00:00.000Z',
  ...overrides,
});

describe('GetRuneCollection', () => {
  it('focuses the first school sign when it is the next meaningful rune step', async () => {
    const player = createPlayer({ currentRuneIndex: 0 });
    const focusedPlayer = createPlayer({ currentRuneIndex: 1 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveRuneCursor: vi.fn().mockResolvedValue(focusedPlayer),
    } as unknown as GameRepository;
    const useCase = new GetRuneCollection(repository);

    const result = await useCase.execute(player.vkId);

    expect(repository.saveRuneCursor).toHaveBeenCalledWith(player.playerId, 1);
    expect(result.currentRuneIndex).toBe(1);
  });

  it('keeps the cursor unchanged when the school sign is already focused', async () => {
    const player = createPlayer({ currentRuneIndex: 1 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      saveRuneCursor: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new GetRuneCollection(repository);

    const result = await useCase.execute(player.vkId);

    expect(repository.saveRuneCursor).not.toHaveBeenCalled();
    expect(result).toBe(player);
  });
});
