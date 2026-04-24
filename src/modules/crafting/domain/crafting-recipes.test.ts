import { describe, expect, it } from 'vitest';

import type { InventoryView, PlayerState } from '../../../shared/types/game';
import {
  canPayCraftingRecipe,
  formatCraftingRecipeOutput,
  getCraftingRecipe,
  resolveAvailableCraftingRecipes,
  resolveCraftingRecipeCost,
  resolveCraftingRecipeConsumableDelta,
  resolveCraftingRecipeInventoryDelta,
  resolveCraftingRecipeMissingCost,
  resolveCraftingRecipeOutput,
} from './crafting-recipes';

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

const player = (
  overrides: Partial<Pick<PlayerState, 'inventory' | 'skills'>> = {},
): Pick<PlayerState, 'inventory' | 'skills'> => ({
  inventory: inventory(),
  skills: [],
  ...overrides,
});

describe('crafting recipes', () => {
  it('prices early alchemy pills from trophy materials', () => {
    const vitalPill = getCraftingRecipe('vital_charm');

    expect(vitalPill.title).toBe('Пилюля восстановления');
    expect(resolveCraftingRecipeCost(vitalPill)).toEqual({
      leather: 2,
      bone: 1,
    });
    expect(resolveCraftingRecipeInventoryDelta(vitalPill)).toEqual({
      leather: -2,
      bone: -1,
    });
  });

  it('produces more pills when the alchemy skill rank grows', () => {
    const vitalPill = getCraftingRecipe('vital_charm');
    const improvedPlayer = player({
      skills: [{ skillCode: 'crafting.alchemy', experience: 100, rank: 1 }],
    });
    const output = resolveCraftingRecipeOutput(improvedPlayer, vitalPill);

    expect(output.consumable.code).toBe('healing_pill');
    expect(output.quantity).toBe(2);
    expect(resolveCraftingRecipeConsumableDelta(improvedPlayer, vitalPill)).toEqual({
      healingPills: 2,
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

  it('formats consumable payoff as recoverable resources', () => {
    expect(formatCraftingRecipeOutput(player(), getCraftingRecipe('rune_focus'))).toBe('Пилюля фокуса x1 · +6 маны');
  });
});
