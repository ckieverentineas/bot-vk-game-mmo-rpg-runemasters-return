import { createHash } from 'node:crypto';

import type { PlayerState } from '../../../shared/types/game';
import {
  getCraftingRecipe,
  resolveCraftingRecipeCost,
  resolveCraftingRecipeRank,
  type CraftingRecipeCode,
} from '../domain/crafting-recipes';

const serializeStateKey = (value: unknown): string => createHash('sha1').update(JSON.stringify(value)).digest('hex');

export const buildCraftingIntentStateKey = (
  player: Pick<PlayerState, 'baseStats' | 'inventory'>,
  recipeCode: CraftingRecipeCode,
): string => {
  const recipe = getCraftingRecipe(recipeCode);

  return serializeStateKey({
    action: 'craft_item',
    recipeCode,
    rank: resolveCraftingRecipeRank(player, recipe),
    cost: resolveCraftingRecipeCost(player, recipe),
    baseStats: player.baseStats,
    materials: {
      leather: player.inventory.leather,
      bone: player.inventory.bone,
      herb: player.inventory.herb,
      essence: player.inventory.essence,
      metal: player.inventory.metal,
      crystal: player.inventory.crystal,
    },
  });
};
