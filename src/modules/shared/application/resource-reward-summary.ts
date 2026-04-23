import type { ResourceReward, ShardField } from '../../../shared/types/game';

const shardInventoryFields: readonly ShardField[] = [
  'usualShards',
  'unusualShards',
  'rareShards',
  'epicShards',
  'legendaryShards',
  'mythicalShards',
];

export const sumResourceRewardShardDelta = (reward: ResourceReward): number => {
  const inventoryDelta = reward.inventoryDelta;
  if (!inventoryDelta) {
    return 0;
  }

  return shardInventoryFields.reduce(
    (total, field) => total + (inventoryDelta[field] ?? 0),
    0,
  );
};
