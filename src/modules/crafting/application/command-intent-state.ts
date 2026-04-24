import { createHash } from 'node:crypto';

import type { PlayerState } from '../../../shared/types/game';
import {
  getAlchemyConsumable,
  type AlchemyConsumableCode,
} from '../../consumables/domain/alchemy-consumables';
import {
  getCraftingRecipe,
  resolveCraftingRecipeCost,
  resolveCraftingRecipeOutput,
  type CraftingRecipeCode,
} from '../domain/crafting-recipes';

const serializeStateKey = (value: unknown): string => createHash('sha1').update(JSON.stringify(value)).digest('hex');

export const buildCraftingIntentStateKey = (
  player: Pick<PlayerState, 'inventory' | 'skills'>,
  recipeCode: CraftingRecipeCode,
): string => {
  const recipe = getCraftingRecipe(recipeCode);
  const output = resolveCraftingRecipeOutput(player, recipe);

  return serializeStateKey({
    action: 'craft_item',
    recipeCode,
    cost: resolveCraftingRecipeCost(recipe),
    output: {
      consumableCode: output.consumable.code,
      quantity: output.quantity,
    },
    alchemy: player.skills?.find((skill) => skill.skillCode === 'crafting.alchemy') ?? null,
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

export const buildUseConsumableIntentStateKey = (
  player: Pick<PlayerState, 'inventory' | 'currentHealth' | 'currentMana' | 'updatedAt'>,
  consumableCode: AlchemyConsumableCode,
): string => {
  const consumable = getAlchemyConsumable(consumableCode);

  return serializeStateKey({
    action: 'use_consumable',
    consumableCode,
    count: player.inventory[consumable.inventoryField] ?? 0,
    currentHealth: player.currentHealth ?? null,
    currentMana: player.currentMana ?? null,
    updatedAt: player.updatedAt,
  });
};
