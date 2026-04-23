import { describe, expect, it } from 'vitest';

import { gameBalance } from '../../../config/game-balance';
import {
  biomeSeed,
  buildWorldCatalog,
  mobSeed,
} from '../../../content/world';
import type {
  BattleView,
  InventoryDelta,
  InventoryView,
  MobTemplateView,
  RuneRarity,
} from '../../../shared/types/game';
import { RewardEngine } from '../../combat/domain/reward-engine';
import { buildEnemySnapshot } from '../../world/domain/enemy-scaling';
import {
  canPayRuneSpend,
  resolveHighestCraftableRuneRarity,
  resolveRuneCraftSpend,
  resolveRuneRerollSpend,
  type RuneResourceSpend,
} from './rune-economy';

interface EconomyBudget {
  readonly gold: number;
  readonly inventory: InventoryView;
}

const noRuneDropRandom = {
  nextInt: (min: number): number => min,
  rollPercentage: (): boolean => false,
  pickOne: <T>(items: readonly T[]): T => items[0]!,
};

const createBudget = (overrides: Partial<EconomyBudget> = {}): EconomyBudget => ({
  gold: 0,
  inventory: { ...gameBalance.starterInventory },
  ...overrides,
});

const applyInventoryDelta = (
  inventory: InventoryView,
  delta: InventoryDelta,
): InventoryView => {
  const nextInventory = { ...inventory };

  for (const [field, amount] of Object.entries(delta) as Array<[keyof InventoryView, number | undefined]>) {
    if (amount !== undefined && amount !== 0) {
      nextInventory[field] += amount;
    }
  }

  return nextInventory;
};

const applySpend = (
  budget: EconomyBudget,
  spend: RuneResourceSpend,
): EconomyBudget => ({
  gold: budget.gold - spend.gold,
  inventory: applyInventoryDelta(budget.inventory, spend.inventoryDelta),
});

const addBattleRewards = (
  budget: EconomyBudget,
  battle: BattleView,
): EconomyBudget => {
  const rewards = battle.rewards;
  if (!rewards) {
    return budget;
  }

  return {
    gold: budget.gold + rewards.gold,
    inventory: {
      ...budget.inventory,
      usualShards: budget.inventory.usualShards + (rewards.shards.USUAL ?? 0),
      unusualShards: budget.inventory.unusualShards + (rewards.shards.UNUSUAL ?? 0),
      rareShards: budget.inventory.rareShards + (rewards.shards.RARE ?? 0),
    },
  };
};

const createVictoryBattle = (
  template: MobTemplateView,
  locationLevel: number,
): BattleView => {
  const enemy = buildEnemySnapshot(template, locationLevel);

  return {
    id: `battle-${template.code}-${locationLevel}`,
    playerId: 1,
    status: 'COMPLETED',
    battleType: 'PVE',
    actionRevision: 0,
    locationLevel,
    biomeCode: template.biomeCode,
    enemyCode: template.code,
    turnOwner: 'PLAYER',
    player: {
      playerId: 1,
      name: 'Test',
      attack: 5,
      defence: 3,
      magicDefence: 1,
      dexterity: 3,
      intelligence: 2,
      maxHealth: 12,
      currentHealth: 12,
      maxMana: 8,
      currentMana: 8,
      runeLoadout: null,
      guardPoints: 0,
    },
    enemy,
    encounter: null,
    log: [],
    result: 'VICTORY',
    rewards: {
      experience: enemy.experienceReward,
      gold: enemy.goldReward,
      shards: {},
      droppedRune: null,
    },
    createdAt: '2026-04-23T00:00:00.000Z',
    updatedAt: '2026-04-23T00:00:00.000Z',
  };
};

const darkForestNormalTemplates = (): readonly MobTemplateView[] => {
  const catalog = buildWorldCatalog({ biomes: biomeSeed, mobs: mobSeed });

  return catalog
    .listMobTemplatesForBiome('dark-forest')
    .filter((template) => !template.isElite && !template.isBoss);
};

const collectEarlyBattleBudget = (fightCount: number): EconomyBudget => {
  const templates = darkForestNormalTemplates();

  return Array.from({ length: fightCount }).reduce<EconomyBudget>((budget, _, index) => {
    const template = templates[index % templates.length]!;
    const locationLevel = Math.min(15, index + 1);
    const battle = createVictoryBattle(template, locationLevel);
    const rewardedBattle = RewardEngine.applyVictoryRewards(
      battle,
      { forcedRune: null },
      noRuneDropRandom,
    ).battle;

    return addBattleRewards(budget, rewardedBattle);
  }, createBudget());
};

const applyUsualRuneSpendPlan = (
  budget: EconomyBudget,
  crafts: number,
  rerolls: number,
): EconomyBudget => {
  let nextBudget = budget;

  for (let index = 0; index < crafts; index += 1) {
    nextBudget = applySpend(nextBudget, resolveRuneCraftSpend('USUAL'));
  }

  for (let index = 0; index < rerolls; index += 1) {
    nextBudget = applySpend(nextBudget, resolveRuneRerollSpend('USUAL'));
  }

  return nextBudget;
};

describe('rune economy balance', () => {
  it('prices craft and reroll with dust plus the existing shard costs', () => {
    expect(resolveRuneCraftSpend('USUAL')).toEqual({
      gold: 18,
      inventoryDelta: { usualShards: -10 },
    });
    expect(resolveRuneRerollSpend('USUAL')).toEqual({
      gold: 5,
      inventoryDelta: { usualShards: -1 },
    });
  });

  it('uses essence as the first uncommon craft gate without blocking usual crafts', () => {
    const usualReady = createBudget({
      gold: 18,
      inventory: {
        ...gameBalance.starterInventory,
        unusualShards: 10,
        essence: 0,
      },
    });
    const unusualReady = createBudget({
      gold: 30,
      inventory: {
        ...gameBalance.starterInventory,
        usualShards: 0,
        unusualShards: 10,
        essence: 1,
      },
    });

    expect(resolveHighestCraftableRuneRarity(usualReady)).toBe('USUAL');
    expect(resolveHighestCraftableRuneRarity(unusualReady)).toBe('UNUSUAL');
    expect(canPayRuneSpend(usualReady, resolveRuneCraftSpend('UNUSUAL'))).toBe(false);
  });

  it.each([
    {
      label: '30 minutes',
      fights: 8,
      crafts: 1,
      rerolls: 6,
      maxDustAfterPlannedSpends: 40,
      maxUsualShardsAfterPlannedSpends: 25,
    },
    {
      label: '60 minutes',
      fights: 12,
      crafts: 2,
      rerolls: 12,
      maxDustAfterPlannedSpends: 45,
      maxUsualShardsAfterPlannedSpends: 25,
    },
  ])('keeps early $label dust and usual shard surplus spendable', ({
    fights,
    crafts,
    rerolls,
    maxDustAfterPlannedSpends,
    maxUsualShardsAfterPlannedSpends,
  }) => {
    const sourcedBudget = collectEarlyBattleBudget(fights);
    const spentBudget = applyUsualRuneSpendPlan(sourcedBudget, crafts, rerolls);

    expect(spentBudget.gold).toBeGreaterThanOrEqual(0);
    expect(spentBudget.inventory.usualShards).toBeGreaterThanOrEqual(0);
    expect(spentBudget.gold).toBeLessThanOrEqual(maxDustAfterPlannedSpends);
    expect(spentBudget.inventory.usualShards).toBeLessThanOrEqual(maxUsualShardsAfterPlannedSpends);
  });

  it('does not let early essence spam uncommon crafts from starter shards alone', () => {
    const rarity: RuneRarity = 'UNUSUAL';
    const budget = createBudget({
      gold: 90,
      inventory: {
        ...gameBalance.starterInventory,
        usualShards: 0,
        unusualShards: 20,
        essence: 1,
      },
    });

    const afterOneCraft = applySpend(budget, resolveRuneCraftSpend(rarity));

    expect(canPayRuneSpend(budget, resolveRuneCraftSpend(rarity))).toBe(true);
    expect(canPayRuneSpend(afterOneCraft, resolveRuneCraftSpend(rarity))).toBe(false);
  });
});
