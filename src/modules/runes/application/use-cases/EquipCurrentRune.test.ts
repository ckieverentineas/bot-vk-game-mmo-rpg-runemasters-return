import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '../../../../../shared/types/game';
import type { GameTelemetry } from '../../../../shared/application/ports/GameTelemetry';
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
    const telemetry = {
      loadoutChanged: vi.fn().mockResolvedValue(undefined),
      firstSchoolCommitted: vi.fn().mockResolvedValue(undefined),
      schoolNoviceFollowUpActionTaken: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameTelemetry;
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      equipRune: vi.fn().mockResolvedValue(player),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository, telemetry);
    const stateKey = buildEquipIntentStateKey(player, 0);

    await useCase.execute(player.vkId, 0, 'intent-equip-1', stateKey);

    expect(repository.equipRune).toHaveBeenCalledWith(
      player.playerId,
      'rune-1',
      expect.objectContaining({
        commandKey: 'EQUIP_RUNE',
        targetSlot: 0,
        intentId: 'intent-equip-1',
        intentStateKey: stateKey,
        expectedPlayerUpdatedAt: player.updatedAt,
        expectedCurrentRuneIndex: 0,
        expectedUnlockedRuneSlotCount: 2,
        expectedSelectedRuneId: 'rune-1',
        expectedEquippedRuneId: null,
        expectedEquippedRuneIdsBySlot: [null, null],
        expectedRuneIds: ['rune-1'],
      }),
    );
    expect(telemetry.loadoutChanged).not.toHaveBeenCalled();
    expect(telemetry.schoolNoviceFollowUpActionTaken).not.toHaveBeenCalled();
  });

  it('rejects stale equip intent before persistence', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      equipRune: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository, {
      loadoutChanged: vi.fn(),
      schoolNoviceFollowUpActionTaken: vi.fn(),
    } as unknown as GameTelemetry);

    await expect(useCase.execute(player.vkId, 0, 'intent-equip-1', 'stale-state')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.equipRune).not.toHaveBeenCalled();
  });

  it('rejects incomplete equip intent envelopes before persistence', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      equipRune: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository, {
      loadoutChanged: vi.fn(),
      schoolNoviceFollowUpActionTaken: vi.fn(),
    } as unknown as GameTelemetry);

    await expect(useCase.execute(player.vkId, 0, 'intent-only')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.equipRune).not.toHaveBeenCalled();
  });

  it('returns the canonical replay result before rune selection prechecks for legacy text', async () => {
    const replayed = createPlayer({ runes: [] });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ runes: [] })),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
      equipRune: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository, {
      loadoutChanged: vi.fn(),
      schoolNoviceFollowUpActionTaken: vi.fn(),
    } as unknown as GameTelemetry);

    await expect(useCase.execute(1001, 0, 'legacy-text:2000000001:1001:82:надеть', undefined, 'legacy_text')).resolves.toEqual({
      player: replayed,
      acquisitionSummary: null,
      replayed: true,
    });

    expect(repository.equipRune).not.toHaveBeenCalled();
  });

  it('returns the canonical replay result before persistence for payload intents too', async () => {
    const replayed = createPlayer();
    const telemetry = {
      loadoutChanged: vi.fn().mockResolvedValue(undefined),
      firstSchoolCommitted: vi.fn().mockResolvedValue(undefined),
      schoolNoviceFollowUpActionTaken: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameTelemetry;
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer()),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
      equipRune: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository, telemetry);

    await expect(useCase.execute(1001, 0, 'intent-equip-replay-1', buildEquipIntentStateKey(createPlayer(), 0), 'payload')).resolves.toEqual({
      player: replayed,
      acquisitionSummary: null,
      replayed: true,
    });

    expect(repository.equipRune).not.toHaveBeenCalled();
    expect(telemetry.loadoutChanged).not.toHaveBeenCalled();
    expect(telemetry.schoolNoviceFollowUpActionTaken).not.toHaveBeenCalled();
  });

  it('rejects legacy text equip commands when no server-owned intent can be derived', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      equipRune: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository, {
      loadoutChanged: vi.fn(),
      schoolNoviceFollowUpActionTaken: vi.fn(),
    } as unknown as GameTelemetry);

    await expect(useCase.execute(player.vkId, 0, undefined, undefined, 'legacy_text')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.equipRune).not.toHaveBeenCalled();
  });

  it('equips the selected rune into slot 2 when it is unlocked', async () => {
    const player = createPlayer({
      unlockedRuneSlotCount: 2,
      runes: [
        {
          ...createPlayer().runes[0],
          isEquipped: true,
          equippedSlot: 0,
        },
        {
          ...createPlayer().runes[0],
          id: 'rune-2',
          runeCode: 'rune-2',
          name: 'Руна B',
          isEquipped: false,
        },
      ],
      currentRuneIndex: 1,
    });
    const updatedPlayer = {
      ...player,
      runes: [
        {
          ...player.runes[0],
          isEquipped: true,
          equippedSlot: 0,
        },
        {
          ...player.runes[1],
          isEquipped: true,
          equippedSlot: 1,
        },
      ],
    };
    const telemetry = {
      loadoutChanged: vi.fn().mockResolvedValue(undefined),
      firstSchoolCommitted: vi.fn().mockResolvedValue(undefined),
      schoolNoviceFollowUpActionTaken: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameTelemetry;
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      equipRune: vi.fn().mockResolvedValue(updatedPlayer),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository, telemetry);
    const stateKey = buildEquipIntentStateKey(player, 1);

    await useCase.execute(player.vkId, 1, 'intent-slot-2-1', stateKey);

    expect(repository.equipRune).toHaveBeenCalledWith(
      player.playerId,
      'rune-2',
      expect.objectContaining({
        targetSlot: 1,
        expectedUnlockedRuneSlotCount: 2,
        expectedEquippedRuneIdsBySlot: ['rune-1', null],
      }),
    );
    expect(telemetry.loadoutChanged).toHaveBeenCalledWith(updatedPlayer.userId, {
      changeType: 'equip_rune',
      slotNumber: 2,
      beforeSchoolCode: null,
      afterSchoolCode: 'ember',
      beforeRarity: null,
      afterRarity: 'USUAL',
    });
    expect(telemetry.schoolNoviceFollowUpActionTaken).not.toHaveBeenCalled();
  });

  it('logs equipping the first school sign as a novice follow-up action', async () => {
    const player = createPlayer({
      victories: 3,
      currentRuneIndex: 1,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [
        {
          ...createPlayer().runes[0],
          name: 'Обычная руна Пламени',
          rarity: 'USUAL',
          isEquipped: true,
          equippedSlot: 0,
        },
        {
          ...createPlayer().runes[0],
          id: 'rune-2',
          runeCode: 'rune-2',
          name: 'Необычная руна Пламени',
          rarity: 'UNUSUAL',
          isEquipped: false,
          equippedSlot: null,
        },
      ],
    });
    const updatedPlayer = {
      ...player,
      runes: [
        {
          ...player.runes[0],
          isEquipped: false,
          equippedSlot: null,
        },
        {
          ...player.runes[1],
          isEquipped: true,
          equippedSlot: 0,
        },
      ],
    };
    const telemetry = {
      loadoutChanged: vi.fn().mockResolvedValue(undefined),
      firstSchoolCommitted: vi.fn().mockResolvedValue(undefined),
      schoolNoviceFollowUpActionTaken: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameTelemetry;
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      equipRune: vi.fn().mockResolvedValue(updatedPlayer),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository, telemetry);

    await useCase.execute(player.vkId, 0, 'intent-equip-sign-1', buildEquipIntentStateKey(player, 0));

    expect(telemetry.firstSchoolCommitted).toHaveBeenCalledWith(updatedPlayer.userId, {
      schoolCode: 'ember',
      runeId: 'rune-2',
      runeRarity: 'UNUSUAL',
      commitSource: 'equip_current_rune',
    });
    expect(telemetry.schoolNoviceFollowUpActionTaken).toHaveBeenCalledWith(updatedPlayer.userId, {
      schoolCode: 'ember',
      currentGoalType: 'equip_school_sign',
      actionType: 'equip_school_sign',
      signEquipped: true,
      usedSchoolSign: true,
      battleId: null,
      enemyCode: null,
    });
  });

  it('logs first school commit even when the sign is equipped from an empty primary slot', async () => {
    const player = createPlayer({
      victories: 3,
      currentRuneIndex: 1,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [
        {
          ...createPlayer().runes[0],
          name: 'Обычная руна Пламени',
          rarity: 'USUAL',
          isEquipped: false,
          equippedSlot: null,
        },
        {
          ...createPlayer().runes[0],
          id: 'rune-2',
          runeCode: 'rune-2',
          name: 'Необычная руна Пламени',
          rarity: 'UNUSUAL',
          isEquipped: false,
          equippedSlot: null,
        },
      ],
    });
    const updatedPlayer = {
      ...player,
      runes: [
        {
          ...player.runes[0],
          isEquipped: false,
          equippedSlot: null,
        },
        {
          ...player.runes[1],
          isEquipped: true,
          equippedSlot: 0,
        },
      ],
    };
    const telemetry = {
      loadoutChanged: vi.fn().mockResolvedValue(undefined),
      firstSchoolCommitted: vi.fn().mockResolvedValue(undefined),
      schoolNoviceFollowUpActionTaken: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameTelemetry;
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      equipRune: vi.fn().mockResolvedValue(updatedPlayer),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository, telemetry);

    await useCase.execute(player.vkId, 0, 'intent-equip-sign-empty-1', buildEquipIntentStateKey(player, 0));

    expect(telemetry.firstSchoolCommitted).toHaveBeenCalledWith(updatedPlayer.userId, {
      schoolCode: 'ember',
      runeId: 'rune-2',
      runeRarity: 'UNUSUAL',
      commitSource: 'equip_current_rune',
    });
    expect(telemetry.schoolNoviceFollowUpActionTaken).toHaveBeenCalledWith(updatedPlayer.userId, {
      schoolCode: 'ember',
      currentGoalType: 'equip_first_rune',
      actionType: 'equip_school_sign',
      signEquipped: true,
      usedSchoolSign: true,
      battleId: null,
      enemyCode: null,
    });
  });

  it('does not fail equip if telemetry logging throws after persistence', async () => {
    const player = createPlayer();
    const updatedPlayer = {
      ...player,
      runes: [
        {
          ...player.runes[0],
          isEquipped: true,
          equippedSlot: 0,
        },
      ],
    };
    const telemetry = {
      loadoutChanged: vi.fn().mockRejectedValue(new Error('telemetry offline')),
      firstSchoolCommitted: vi.fn().mockResolvedValue(undefined),
      schoolNoviceFollowUpActionTaken: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameTelemetry;
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      equipRune: vi.fn().mockResolvedValue(updatedPlayer),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository, telemetry);

    await expect(useCase.execute(player.vkId, 0, 'intent-equip-telemetry-1', buildEquipIntentStateKey(player, 0))).resolves.toEqual(updatedPlayer);
    expect(repository.equipRune).toHaveBeenCalled();
  });

  it('rejects equip into a still-locked future rune slot', async () => {
    const player = createPlayer();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      equipRune: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository, {
      loadoutChanged: vi.fn(),
      schoolNoviceFollowUpActionTaken: vi.fn(),
    } as unknown as GameTelemetry);

    await expect(useCase.execute(player.vkId, 2, 'intent-slot-locked', 'state-slot-locked')).rejects.toMatchObject({
      code: 'rune_slot_locked',
    });
    expect(repository.equipRune).not.toHaveBeenCalled();
  });

  it('allows equipping slot 2 without requiring slot 1 as an anchor', async () => {
    const player = createPlayer({ unlockedRuneSlotCount: 2 });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn(),
      equipRune: vi.fn().mockResolvedValue(player),
    } as unknown as GameRepository;
    const useCase = new EquipCurrentRune(repository, {
      loadoutChanged: vi.fn(),
      schoolNoviceFollowUpActionTaken: vi.fn(),
    } as unknown as GameTelemetry);

    await expect(useCase.execute(player.vkId, 1, 'intent-slot-2', buildEquipIntentStateKey(player, 1))).resolves.toBe(player);
    expect(repository.equipRune).toHaveBeenCalledWith(
      player.playerId,
      'rune-1',
      expect.objectContaining({
        targetSlot: 1,
        intentId: 'intent-slot-2',
      }),
    );
  });
});
