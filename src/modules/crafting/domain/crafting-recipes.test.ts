import { describe, expect, it } from 'vitest';

import type { InventoryView, PlayerState, StatBlock } from '../../../shared/types/game';
import {
  canPayCraftingRecipe,
  formatCraftingStatDelta,
  getCraftingRecipe,
  resolveAvailableCraftingRecipes,
  resolveCraftingRecipeCost,
  resolveCraftingRecipeInventoryDelta,
  resolveCraftingRecipeMissingCost,
  resolveCraftingRecipeRank,
} from './crafting-recipes';

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
  ...overrides,
});

const player = (
  overrides: Partial<Pick<PlayerState, 'baseStats' | 'inventory'>> = {},
): Pick<PlayerState, 'baseStats' | 'inventory'> => ({
  baseStats: baseStats(),
  inventory: inventory(),
  ...overrides,
});

describe('crafting recipes', () => {
  it('prices early alchemy pills from trophy materials', () => {
    const vitalPill = getCraftingRecipe('vital_charm');

    expect(vitalPill.title).toBe('Пилюля живучести');
    expect(resolveCraftingRecipeCost(player(), vitalPill)).toEqual({
      leather: 2,
      bone: 1,
    });
    expect(resolveCraftingRecipeInventoryDelta(player(), vitalPill)).toEqual({
      leather: -2,
      bone: -1,
    });
  });

  it('scales the next pill cost from the stat already improved by that recipe', () => {
    const vitalPill = getCraftingRecipe('vital_charm');
    const improvedPlayer = player({
      baseStats: {
        ...baseStats(),
        health: 10,
      },
    });

    expect(resolveCraftingRecipeRank(improvedPlayer, vitalPill)).toBe(2);
    expect(resolveCraftingRecipeCost(improvedPlayer, vitalPill)).toEqual({
      leather: 6,
      bone: 3,
    });
  });

  it('reports missing materials without hiding other available recipes', () => {
    const readyPlayer = player({
      inventory: inventory({
        leather: 2,
        bone: 1,
        herb: 2,
        essence: 1,
      }),
    });
    const attackPill = getCraftingRecipe('keen_edge');

    expect(canPayCraftingRecipe(readyPlayer, getCraftingRecipe('vital_charm'))).toBe(true);
    expect(canPayCraftingRecipe(readyPlayer, attackPill)).toBe(false);
    expect(resolveCraftingRecipeMissingCost(readyPlayer, attackPill)).toEqual({
      metal: 2,
    });
    expect(resolveAvailableCraftingRecipes(readyPlayer).map((recipe) => recipe.code)).toEqual([
      'vital_charm',
      'rune_focus',
    ]);
  });

  it('formats stat payoff as qualitative pill progress', () => {
    expect(formatCraftingStatDelta(getCraftingRecipe('rune_focus').statDelta)).toBe('+1 интеллект');
  });
});
