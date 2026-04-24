import { describe, expect, it, vi } from 'vitest';

import type { InventoryView, PlayerState } from '../../../../shared/types/game';
import type { GameRepository } from '../../../shared/application/ports/GameRepository';
import { buildUseConsumableIntentStateKey } from '../../../crafting/application/command-intent-state';
import { UseConsumable } from './UseConsumable';

const inventory = (overrides: Partial<InventoryView> = {}): InventoryView => ({
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
  healingPills: 0,
  focusPills: 0,
  guardPills: 0,
  clarityPills: 0,
  ...overrides,
});

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  radiance: 0,
  baseStats: {
    health: 8,
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 2,
    intelligence: 1,
  },
  currentHealth: 3,
  currentMana: 1,
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
  inventory: inventory(),
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createRepository = (player: PlayerState, updatedPlayer: PlayerState = player): GameRepository => ({
  findPlayerByVkId: vi.fn().mockResolvedValue(player),
  getCommandIntentResult: vi.fn().mockResolvedValue(null),
  storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
  recordInventoryAndVitalsResult: vi.fn(async (_playerId, _delta, _vitals, _options, buildResult) => (
    buildResult(updatedPlayer)
  )),
} as unknown as GameRepository);

describe('UseConsumable', () => {
  it('spends a healing pill and restores health outside battle', async () => {
    const player = createPlayer({
      inventory: inventory({ healingPills: 1 }),
    });
    const updatedPlayer = createPlayer({
      currentHealth: 8,
      inventory: inventory({ healingPills: 0 }),
    });
    const repository = createRepository(player, updatedPlayer);
    const useCase = new UseConsumable(repository);
    const stateKey = buildUseConsumableIntentStateKey(player, 'healing_pill');

    const result = await useCase.execute(player.vkId, 'healing_pill', 'intent-use-1', stateKey, 'payload');

    expect(repository.recordInventoryAndVitalsResult).toHaveBeenCalledWith(
      player.playerId,
      { healingPills: -1 },
      { currentHealth: 8, currentMana: 1 },
      {
        commandKey: 'USE_CONSUMABLE',
        intentId: 'intent-use-1',
        intentStateKey: stateKey,
        currentStateKey: stateKey,
      },
      expect.any(Function),
    );
    expect(repository.storeCommandIntentResult).toHaveBeenCalledWith(player.playerId, 'intent-use-1', result);
    expect(result.player).toBe(updatedPlayer);
    expect(result.acquisitionSummary).toMatchObject({
      kind: 'consumable_used',
      title: 'Использована: Пилюля восстановления',
    });
  });

  it('rejects use when the player has no selected pill', async () => {
    const player = createPlayer();
    const repository = createRepository(player);
    const useCase = new UseConsumable(repository);
    const stateKey = buildUseConsumableIntentStateKey(player, 'healing_pill');

    await expect(useCase.execute(player.vkId, 'healing_pill', 'intent-use-1', stateKey, 'payload')).rejects.toMatchObject({
      code: 'consumable_not_found',
    });

    expect(repository.recordInventoryAndVitalsResult).not.toHaveBeenCalled();
  });

  it('keeps a full health player from wasting a healing pill', async () => {
    const player = createPlayer({
      currentHealth: 8,
      currentMana: 4,
      inventory: inventory({ healingPills: 1 }),
    });
    const repository = createRepository(player);
    const useCase = new UseConsumable(repository);
    const stateKey = buildUseConsumableIntentStateKey(player, 'healing_pill');

    await expect(useCase.execute(player.vkId, 'healing_pill', 'intent-use-1', stateKey, 'payload')).rejects.toMatchObject({
      code: 'consumable_not_needed',
    });

    expect(repository.recordInventoryAndVitalsResult).not.toHaveBeenCalled();
  });

  it('returns the canonical replay before spending another pill', async () => {
    const player = createPlayer({
      inventory: inventory({ healingPills: 1 }),
    });
    const replayed = {
      player,
      acquisitionSummary: {
        kind: 'consumable_used' as const,
        title: 'Использована: Пилюля восстановления',
        changeLine: 'Восстановлено здоровье.',
        nextStepLine: 'Продолжить путь.',
      },
    };
    const repository = {
      ...createRepository(player),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
    } as unknown as GameRepository;
    const useCase = new UseConsumable(repository);

    await expect(useCase.execute(player.vkId, 'healing_pill', 'intent-use-1', undefined, 'legacy_text')).resolves.toBe(replayed);

    expect(repository.recordInventoryAndVitalsResult).not.toHaveBeenCalled();
  });
});
