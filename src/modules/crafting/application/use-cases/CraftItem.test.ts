import { describe, expect, it, vi } from 'vitest';

import type { InventoryView, PlayerState, StatBlock } from '../../../../../shared/types/game';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { buildCraftingIntentStateKey } from '../command-intent-state';
import { CraftItem } from './CraftItem';

const baseStats = (): StatBlock => ({
  health: 8,
  attack: 4,
  defence: 3,
  magicDefence: 1,
  dexterity: 2,
  intelligence: 1,
});

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
  baseStats: baseStats(),
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
  skills: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createRepository = (player: PlayerState, updatedPlayer: PlayerState = player): GameRepository => ({
  findPlayerByVkId: vi.fn().mockResolvedValue(player),
  getCommandIntentResult: vi.fn().mockResolvedValue(null),
  storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
  craftPlayerConsumable: vi.fn().mockResolvedValue(updatedPlayer),
} as unknown as GameRepository);

describe('CraftItem', () => {
  it('brews a pill from trophy materials and stores the acquisition recap', async () => {
    const player = createPlayer({
      inventory: inventory({
        leather: 2,
        bone: 1,
      }),
    });
    const updatedPlayer = createPlayer({
      inventory: inventory({ healingPills: 1 }),
      skills: [{ skillCode: 'crafting.alchemy', experience: 8, rank: 0 }],
    });
    const repository = createRepository(player, updatedPlayer);
    const useCase = new CraftItem(repository);
    const stateKey = buildCraftingIntentStateKey(player, 'vital_charm');

    const result = await useCase.execute(player.vkId, 'vital_charm', 'intent-pill-1', stateKey, 'payload');

    expect(repository.craftPlayerConsumable).toHaveBeenCalledWith(
      player.playerId,
      { leather: -2, bone: -1 },
      { healingPills: 1 },
      [{ skillCode: 'crafting.alchemy', points: 8 }],
      'intent-pill-1',
      stateKey,
      stateKey,
    );
    expect(repository.storeCommandIntentResult).toHaveBeenCalledWith(player.playerId, 'intent-pill-1', result);
    expect(result.player).toBe(updatedPlayer);
    expect(result.acquisitionSummary).toMatchObject({
      kind: 'consumable_crafted',
      title: 'Алхимия: Пилюля восстановления x1',
    });
  });

  it('rejects a pill when materials are missing before touching inventory', async () => {
    const player = createPlayer();
    const repository = createRepository(player);
    const useCase = new CraftItem(repository);
    const stateKey = buildCraftingIntentStateKey(player, 'vital_charm');

    await expect(useCase.execute(1001, 'vital_charm', 'intent-pill-1', stateKey, 'payload')).rejects.toMatchObject({
      code: 'not_enough_crafting_resources',
    });

    expect(repository.craftPlayerConsumable).not.toHaveBeenCalled();
    expect(repository.storeCommandIntentResult).not.toHaveBeenCalled();
  });

  it('returns the canonical replay result before checking current materials', async () => {
    const player = createPlayer();
    const replayed = {
      player,
      acquisitionSummary: {
        kind: 'consumable_crafted' as const,
        title: 'Алхимия: Пилюля восстановления x1',
        changeLine: 'Создана пилюля.',
        nextStepLine: 'Выпить позже.',
      },
    };
    const repository = {
      ...createRepository(player),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayed }),
    } as unknown as GameRepository;
    const useCase = new CraftItem(repository);

    await expect(useCase.execute(1001, 'vital_charm', 'intent-pill-1', undefined, 'legacy_text')).resolves.toBe(replayed);

    expect(repository.craftPlayerConsumable).not.toHaveBeenCalled();
  });

  it('rejects stale payload pills when the altar state has changed', async () => {
    const player = createPlayer({
      inventory: inventory({
        leather: 2,
        bone: 1,
      }),
    });
    const repository = createRepository(player);
    const useCase = new CraftItem(repository);

    await expect(useCase.execute(1001, 'vital_charm', 'intent-pill-1', 'old-state', 'payload')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.craftPlayerConsumable).not.toHaveBeenCalled();
  });
});
