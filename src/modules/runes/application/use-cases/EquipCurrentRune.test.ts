import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '../../../../../shared/types/game';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { buildEquipIntentStateKey } from '../command-intent-state';
import { EquipCurrentRune } from './EquipCurrentRune';

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
  allocationPoints: {
    health: 0,
    attack: 0,
    defence: 0,
    magicDefence: 0,
    dexterity: 0,
    intelligence: 0,
  },
  unspentStatPoints: 0,
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
  runes: [
    {
      id: 'rune-1',
      runeCode: 'rune-1',
      archetypeCode: 'ember',
      passiveAbilityCodes: ['ember_heart'],
      activeAbilityCodes: ['ember_pulse'],
      name: 'Руна A',
      rarity: 'USUAL',
      isEquipped: false,
      health: 1,
      attack: 2,
      defence: 0,
      magicDefence: 0,
      dexterity: 0,
      intelligence: 0,
      createdAt: '2026-04-12T00:00:00.000Z',
    },
  ],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('EquipCurrentRune', () => {
  it('passes guarded equip options when intent metadata is present', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      equipRune: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository);
    const stateKey = buildEquipIntentStateKey(player);

    await useCase.execute(player.vkId, 'intent-equip-1', stateKey);

    expect(repository.equipRune).toHaveBeenCalledWith(
      player.playerId,
      'rune-1',
      expect.objectContaining({
        commandKey: 'EQUIP_RUNE',
        intentId: 'intent-equip-1',
        intentStateKey: stateKey,
        expectedPlayerUpdatedAt: player.updatedAt,
        expectedCurrentRuneIndex: 0,
        expectedSelectedRuneId: 'rune-1',
        expectedEquippedRuneId: null,
        expectedRuneIds: ['rune-1'],
      }),
    );
  });

  it('rejects stale equip intent before persistence', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      equipRune: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository);

    await expect(useCase.execute(player.vkId, 'intent-equip-1', 'stale-state')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.equipRune).not.toHaveBeenCalled();
  });

  it('rejects incomplete equip intent envelopes before persistence', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      equipRune: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository);

    await expect(useCase.execute(player.vkId, 'intent-only')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.equipRune).not.toHaveBeenCalled();
  });
});
