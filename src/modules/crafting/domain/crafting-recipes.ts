import type { InventoryDelta, InventoryView, MaterialField, PlayerState, StatBlock, StatKey } from '../../../shared/types/game';

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
  readonly statDelta: StatBlock;
  readonly resultLine: string;
}

const starterBaseStats: Readonly<Pick<StatBlock, 'health' | 'attack' | 'defence' | 'intelligence'>> = {
  health: 8,
  attack: 4,
  defence: 3,
  intelligence: 1,
};

const emptyStats = (): StatBlock => ({
  health: 0,
  attack: 0,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
});

const createStatDelta = (stat: keyof StatBlock): StatBlock => ({
  ...emptyStats(),
  [stat]: 1,
});

export const craftingRecipes: readonly CraftingRecipeDefinition[] = [
  {
    code: 'vital_charm',
    title: 'Пилюля живучести',
    buttonLabel: '❤️ Живучесть',
    description: 'Кожа и кость растираются в плотную алую пилюлю для долгого пути.',
    baseCost: { leather: 2, bone: 1 },
    statDelta: createStatDelta('health'),
    resultLine: 'Максимальное здоровье растёт на 1.',
  },
  {
    code: 'keen_edge',
    title: 'Пилюля острого удара',
    buttonLabel: '⚔️ Удар',
    description: 'Металл и кость дают телу короткий боевой импульс первого удара.',
    baseCost: { metal: 2, bone: 1 },
    statDelta: createStatDelta('attack'),
    resultLine: 'Базовая атака растёт на 1.',
  },
  {
    code: 'guard_plate',
    title: 'Пилюля стойкости',
    buttonLabel: '🛡️ Стойкость',
    description: 'Кожа, металл и кость собираются в сухую защитную пилюлю.',
    baseCost: { leather: 1, metal: 1, bone: 1 },
    statDelta: createStatDelta('defence'),
    resultLine: 'Базовая физическая защита растёт на 1.',
  },
  {
    code: 'rune_focus',
    title: 'Пилюля рунного фокуса',
    buttonLabel: '💠 Фокус',
    description: 'Трава и эссенция стабилизируют канал активных рун.',
    baseCost: { herb: 2, essence: 1 },
    statDelta: createStatDelta('intelligence'),
    resultLine: 'Интеллект растёт на 1, а вместе с ним запас маны.',
  },
];

const recipeByCode = new Map<CraftingRecipeCode, CraftingRecipeDefinition>(
  craftingRecipes.map((recipe) => [recipe.code, recipe]),
);

const resolveRecipeStat = (recipe: CraftingRecipeDefinition): keyof typeof starterBaseStats => {
  const stat = (Object.keys(starterBaseStats) as Array<keyof typeof starterBaseStats>)
    .find((candidate) => recipe.statDelta[candidate] > 0);

  if (!stat) {
    throw new Error(`Crafting recipe ${recipe.code} has no supported stat payoff.`);
  }

  return stat;
};

export const listCraftingRecipes = (): readonly CraftingRecipeDefinition[] => craftingRecipes;

export const getCraftingRecipe = (code: CraftingRecipeCode): CraftingRecipeDefinition => {
  const recipe = recipeByCode.get(code);
  if (!recipe) {
    throw new Error(`Unknown crafting recipe: ${code}`);
  }

  return recipe;
};

export const resolveCraftingRecipeRank = (
  player: Pick<PlayerState, 'baseStats'>,
  recipe: CraftingRecipeDefinition,
): number => {
  const stat = resolveRecipeStat(recipe);
  return Math.max(0, player.baseStats[stat] - starterBaseStats[stat]);
};

export const resolveCraftingRecipeCost = (
  player: Pick<PlayerState, 'baseStats'>,
  recipe: CraftingRecipeDefinition,
): CraftingRecipeCost => {
  const multiplier = resolveCraftingRecipeRank(player, recipe) + 1;

  return Object.entries(recipe.baseCost).reduce<CraftingRecipeCost>((cost, [field, amount]) => {
    if (amount === undefined || amount <= 0) {
      return cost;
    }

    return {
      ...cost,
      [field]: amount * multiplier,
    };
  }, {});
};

export const resolveCraftingRecipeInventoryDelta = (
  player: Pick<PlayerState, 'baseStats'>,
  recipe: CraftingRecipeDefinition,
): InventoryDelta => (
  Object.entries(resolveCraftingRecipeCost(player, recipe)).reduce<InventoryDelta>((delta, [field, amount]) => ({
    ...delta,
    [field]: amount === undefined ? 0 : -amount,
  }), {})
);

export const canPayCraftingRecipe = (
  player: Pick<PlayerState, 'baseStats' | 'inventory'>,
  recipe: CraftingRecipeDefinition,
): boolean => (
  Object.entries(resolveCraftingRecipeCost(player, recipe)).every(([field, amount]) => (
    amount === undefined || player.inventory[field as MaterialField] >= amount
  ))
);

export const resolveCraftingRecipeMissingCost = (
  player: Pick<PlayerState, 'baseStats' | 'inventory'>,
  recipe: CraftingRecipeDefinition,
): CraftingRecipeCost => (
  Object.entries(resolveCraftingRecipeCost(player, recipe)).reduce<CraftingRecipeCost>((missing, [field, amount]) => {
    const required = amount ?? 0;
    const available = player.inventory[field as MaterialField] ?? 0;
    const shortage = Math.max(0, required - available);

    return shortage > 0
      ? { ...missing, [field]: shortage }
      : missing;
  }, {})
);

export const resolveAvailableCraftingRecipes = (
  player: Pick<PlayerState, 'baseStats' | 'inventory'>,
): readonly CraftingRecipeDefinition[] => (
  craftingRecipes.filter((recipe) => canPayCraftingRecipe(player, recipe))
);

export const hasCraftingMaterials = (inventory: InventoryView): boolean => (
  inventory.leather > 0
  || inventory.bone > 0
  || inventory.herb > 0
  || inventory.essence > 0
  || inventory.metal > 0
  || inventory.crystal > 0
);

export const formatCraftingStatDelta = (statDelta: StatBlock): string => {
  const statLabels: Readonly<Record<StatKey, string>> = {
    health: 'здоровье',
    attack: 'атака',
    defence: 'физическая защита',
    magicDefence: 'магическая защита',
    dexterity: 'ловкость',
    intelligence: 'интеллект',
  };

  const parts = (Object.entries(statDelta) as Array<[StatKey, number]>)
    .filter(([, amount]) => amount > 0)
    .map(([stat, amount]) => `+${amount} ${statLabels[stat]}`);

  return parts.length > 0 ? parts.join(' · ') : 'без роста';
};
