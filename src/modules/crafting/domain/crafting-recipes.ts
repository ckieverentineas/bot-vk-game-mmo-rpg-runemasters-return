import type { InventoryDelta, MaterialField, PlayerState } from '../../../shared/types/game';
import {
  formatAlchemyConsumableEffect,
  getAlchemyConsumable,
  resolveAlchemyConsumableGain,
  resolveAlchemyCraftQuantity,
  type AlchemyConsumableCode,
  type AlchemyConsumableDefinition,
} from '../../consumables/domain/alchemy-consumables';

export type CraftingRecipeCode =
  | 'vital_charm'
  | 'keen_edge'
  | 'guard_plate'
  | 'rune_focus';

export type CraftingRecipeCost = Partial<Record<MaterialField, number>>;

export interface CraftingRecipeDefinition {
  readonly code: CraftingRecipeCode;
  readonly title: string;
  readonly buttonLabel: string;
  readonly description: string;
  readonly baseCost: CraftingRecipeCost;
  readonly produces: AlchemyConsumableCode;
  readonly skillExperience: number;
  readonly resultLine: string;
}

export interface CraftingRecipeOutput {
  readonly consumable: AlchemyConsumableDefinition;
  readonly quantity: number;
}

export const craftingRecipes: readonly CraftingRecipeDefinition[] = [
  {
    code: 'vital_charm',
    title: 'Пилюля восстановления',
    buttonLabel: '❤️ Сварить',
    description: 'Кожа и кость растираются в плотную алую пилюлю для восстановления ран.',
    baseCost: { leather: 2, bone: 1 },
    produces: 'healing_pill',
    skillExperience: 8,
    resultLine: 'Создаёт пилюлю восстановления для применения в бою или между встречами.',
  },
  {
    code: 'keen_edge',
    title: 'Пилюля ясности',
    buttonLabel: '🧠 Ясность',
    description: 'Металл и кость дают короткую ясность тела и рунного канала.',
    baseCost: { metal: 2, bone: 1 },
    produces: 'clarity_pill',
    skillExperience: 8,
    resultLine: 'Создаёт пилюлю ясности: немного здоровья и маны без постоянного роста статов.',
  },
  {
    code: 'guard_plate',
    title: 'Пилюля стойкости',
    buttonLabel: '🛡️ Стойкость',
    description: 'Кожа, металл и кость собираются в сухую защитную пилюлю.',
    baseCost: { leather: 1, metal: 1, bone: 1 },
    produces: 'guard_pill',
    skillExperience: 8,
    resultLine: 'Создаёт пилюлю стойкости: восстановление тела и короткая опора в бою.',
  },
  {
    code: 'rune_focus',
    title: 'Пилюля фокуса',
    buttonLabel: '💠 Фокус',
    description: 'Трава и эссенция стабилизируют канал активных рун.',
    baseCost: { herb: 2, essence: 1 },
    produces: 'focus_pill',
    skillExperience: 8,
    resultLine: 'Создаёт пилюлю фокуса для восстановления маны активных рун.',
  },
];

const recipeByCode = new Map<CraftingRecipeCode, CraftingRecipeDefinition>(
  craftingRecipes.map((recipe) => [recipe.code, recipe]),
);

export const listCraftingRecipes = (): readonly CraftingRecipeDefinition[] => craftingRecipes;

export const getCraftingRecipe = (code: CraftingRecipeCode): CraftingRecipeDefinition => {
  const recipe = recipeByCode.get(code);
  if (!recipe) {
    throw new Error(`Unknown crafting recipe: ${code}`);
  }

  return recipe;
};

export const resolveCraftingRecipeOutput = (
  player: Pick<PlayerState, 'skills'>,
  recipe: CraftingRecipeDefinition,
): CraftingRecipeOutput => ({
  consumable: getAlchemyConsumable(recipe.produces),
  quantity: resolveAlchemyCraftQuantity(player),
});

export const resolveCraftingRecipeCost = (
  recipe: CraftingRecipeDefinition,
): CraftingRecipeCost => recipe.baseCost;

export const resolveCraftingRecipeInventoryDelta = (
  recipe: CraftingRecipeDefinition,
): InventoryDelta => (
  Object.entries(resolveCraftingRecipeCost(recipe)).reduce<InventoryDelta>((delta, [field, amount]) => ({
    ...delta,
    [field]: amount === undefined ? 0 : -amount,
  }), {})
);

export const resolveCraftingRecipeConsumableDelta = (
  player: Pick<PlayerState, 'skills'>,
  recipe: CraftingRecipeDefinition,
): InventoryDelta => {
  const output = resolveCraftingRecipeOutput(player, recipe);
  return resolveAlchemyConsumableGain(output.consumable, output.quantity);
};

export const canPayCraftingRecipe = (
  player: Pick<PlayerState, 'inventory'>,
  recipe: CraftingRecipeDefinition,
): boolean => (
  Object.entries(resolveCraftingRecipeCost(recipe)).every(([field, amount]) => (
    amount === undefined || player.inventory[field as MaterialField] >= amount
  ))
);

export const resolveCraftingRecipeMissingCost = (
  player: Pick<PlayerState, 'inventory'>,
  recipe: CraftingRecipeDefinition,
): CraftingRecipeCost => (
  Object.entries(resolveCraftingRecipeCost(recipe)).reduce<CraftingRecipeCost>((missing, [field, amount]) => {
    const required = amount ?? 0;
    const available = player.inventory[field as MaterialField] ?? 0;
    const shortage = Math.max(0, required - available);

    return shortage > 0
      ? { ...missing, [field]: shortage }
      : missing;
  }, {})
);

export const resolveAvailableCraftingRecipes = (
  player: Pick<PlayerState, 'inventory'>,
): readonly CraftingRecipeDefinition[] => (
  craftingRecipes.filter((recipe) => canPayCraftingRecipe(player, recipe))
);

export const formatCraftingRecipeOutput = (
  player: Pick<PlayerState, 'skills'>,
  recipe: CraftingRecipeDefinition,
): string => {
  const output = resolveCraftingRecipeOutput(player, recipe);
  const effect = formatAlchemyConsumableEffect(output.consumable.effect);

  return `${output.consumable.title} x${output.quantity} · ${effect}`;
};
