import { gameBalance } from '../../../config/game-balance';
import type {
  InventoryDelta,
  InventoryField,
  PlayerState,
  RuneRarity,
} from '../../../shared/types/game';

const rarityPriority: readonly RuneRarity[] = ['MYTHICAL', 'LEGENDARY', 'EPIC', 'RARE', 'UNUSUAL', 'USUAL'];

export interface RuneResourceSpend {
  readonly gold: number;
  readonly inventoryDelta: InventoryDelta;
}

const normalizeSpendAmount = (amount: number): number => (
  Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0
);

const addInventoryCost = (
  delta: InventoryDelta,
  field: InventoryField,
  amount: number,
): InventoryDelta => {
  const normalizedAmount = normalizeSpendAmount(amount);
  if (normalizedAmount <= 0) {
    return delta;
  }

  return {
    ...delta,
    [field]: (delta[field] ?? 0) - normalizedAmount,
  };
};

const canPayInventoryDelta = (
  inventory: PlayerState['inventory'],
  delta: InventoryDelta,
): boolean => (
  Object.entries(delta).every(([field, amount]) => (
    amount === undefined
    || amount >= 0
    || (inventory[field as InventoryField] ?? 0) >= Math.abs(amount)
  ))
);

export const resolveRuneCraftSpend = (rarity: RuneRarity): RuneResourceSpend => {
  const profile = gameBalance.runes.profiles[rarity];
  const materialCosts = gameBalance.runes.craftMaterialCosts[rarity];
  const shardDelta = addInventoryCost({}, profile.shardField, gameBalance.runes.craftCost);
  const inventoryDelta = Object.entries(materialCosts).reduce<InventoryDelta>(
    (delta, [field, amount]) => addInventoryCost(delta, field as InventoryField, amount ?? 0),
    shardDelta,
  );

  return {
    gold: gameBalance.runes.craftDustCosts[rarity],
    inventoryDelta,
  };
};

export const resolveRuneRerollSpend = (rarity: RuneRarity): RuneResourceSpend => ({
  gold: gameBalance.runes.rerollDustCosts[rarity],
  inventoryDelta: addInventoryCost(
    {},
    gameBalance.runes.profiles[rarity].shardField,
    gameBalance.runes.rerollShardCost,
  ),
});

export const canPayRuneSpend = (
  player: Pick<PlayerState, 'gold' | 'inventory'>,
  spend: RuneResourceSpend,
): boolean => (
  player.gold >= spend.gold
  && canPayInventoryDelta(player.inventory, spend.inventoryDelta)
);

export const hasRuneCraftShardBudget = (
  player: Pick<PlayerState, 'inventory'>,
  rarity: RuneRarity,
): boolean => {
  const shardField = gameBalance.runes.profiles[rarity].shardField;
  return player.inventory[shardField] >= gameBalance.runes.craftCost;
};

export const resolveHighestShardReadyRuneRarity = (
  player: Pick<PlayerState, 'inventory'>,
): RuneRarity | null => (
  rarityPriority.find((rarity) => hasRuneCraftShardBudget(player, rarity)) ?? null
);

export const resolveHighestCraftableRuneRarity = (
  player: Pick<PlayerState, 'gold' | 'inventory'>,
): RuneRarity | null => (
  rarityPriority.find((rarity) => canPayRuneSpend(player, resolveRuneCraftSpend(rarity))) ?? null
);
