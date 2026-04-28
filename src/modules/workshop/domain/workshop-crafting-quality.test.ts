import { describe, expect, it } from 'vitest';

import type { PlayerState } from '../../../shared/types/game';
import { createPlayerSkillView } from '../../player/domain/player-skills';
import { getWorkshopBlueprint, getWorkshopItemDefinition } from './workshop-catalog';
import type { WorkshopBlueprintInstanceView } from './workshop-blueprint-instances';
import { resolveWorkshopCraftedItemOutcome } from './workshop-crafting-quality';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  name: 'Мастер',
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
  runes: [],
  createdAt: '2026-04-28T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
  ...overrides,
});

const createBlueprintInstance = (
  overrides: Partial<WorkshopBlueprintInstanceView> = {},
): WorkshopBlueprintInstanceView => ({
  id: 'bp-hunter-cleaver-1',
  playerId: 1,
  blueprintCode: 'hunter_cleaver',
  rarity: 'RARE',
  sourceType: 'QUEST',
  sourceId: 'test',
  discoveryKind: 'QUEST',
  quality: 'FINE',
  craftPotential: 'default',
  modifierSnapshot: {},
  status: 'AVAILABLE',
  createdAt: '2026-04-28T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
  discoveredAt: '2026-04-28T00:00:00.000Z',
  consumedAt: null,
  ...overrides,
});

describe('workshop crafting quality', () => {
  it('turns a concrete blueprint instance into a crafted item outcome', () => {
    const player = createPlayer();
    const blueprint = getWorkshopBlueprint('hunter_cleaver');
    const item = getWorkshopItemDefinition('hunter_cleaver');
    const instance = createBlueprintInstance();

    const outcome = resolveWorkshopCraftedItemOutcome(player, blueprint, item, instance);

    expect(outcome).toEqual({
      quality: 'FINE',
      durability: 18,
      maxDurability: 18,
      statBonus: {
        health: 0,
        attack: 3,
        defence: 0,
        magicDefence: 0,
        dexterity: 0,
        intelligence: 0,
      },
      skillGains: [
        {
          skillCode: 'crafting.workshop',
          points: 20,
        },
      ],
    });
  });

  it('lets workshop mastery raise the resulting quality by one tier', () => {
    const player = createPlayer({
      skills: [
        createPlayerSkillView('crafting.workshop', 100),
      ],
    });
    const blueprint = getWorkshopBlueprint('skinning_kit');
    const item = getWorkshopItemDefinition('skinning_kit');
    const instance = createBlueprintInstance({
      blueprintCode: 'skinning_kit',
      rarity: 'COMMON',
      quality: 'FINE',
    });

    const outcome = resolveWorkshopCraftedItemOutcome(player, blueprint, item, instance);

    expect(outcome.quality).toBe('MASTERWORK');
    expect(outcome.maxDurability).toBe(16);
    expect(outcome.statBonus.dexterity).toBe(3);
  });

  it('lets an awakened radiance feature raise the resulting quality by one tier', () => {
    const player = createPlayer();
    const blueprint = getWorkshopBlueprint('hunter_cleaver');
    const item = getWorkshopItemDefinition('hunter_cleaver');
    const instance = createBlueprintInstance({
      quality: 'STURDY',
      modifierSnapshot: { radianceFeatureAwakened: true },
    });

    const outcome = resolveWorkshopCraftedItemOutcome(player, blueprint, item, instance);

    expect(outcome.quality).toBe('FINE');
    expect(outcome.maxDurability).toBe(18);
    expect(outcome.statBonus.attack).toBe(3);
  });

  it('keeps rough blueprints visibly worse without producing invalid negative stats', () => {
    const player = createPlayer();
    const blueprint = getWorkshopBlueprint('skinning_kit');
    const item = getWorkshopItemDefinition('skinning_kit');
    const instance = createBlueprintInstance({
      blueprintCode: 'skinning_kit',
      rarity: 'COMMON',
      quality: 'ROUGH',
    });

    const outcome = resolveWorkshopCraftedItemOutcome(player, blueprint, item, instance);

    expect(outcome.quality).toBe('ROUGH');
    expect(outcome.maxDurability).toBe(10);
    expect(outcome.statBonus).toEqual({
      health: 0,
      attack: 0,
      defence: 0,
      magicDefence: 0,
      dexterity: 0,
      intelligence: 0,
    });
  });
});
