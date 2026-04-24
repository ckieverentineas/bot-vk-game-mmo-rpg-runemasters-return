import type { BattleView, RuneDraft, RuneRarity } from '../../../shared/types/game';
import type { GameRandom } from '../../../shared/domain/GameRandom';
import {
  resolveEnemyThreatBountyReward,
  type EnemyThreatBountyReward,
} from '../../world/domain/enemy-threat-growth';
import { RuneFactory } from '../../runes/domain/rune-factory';
import { appendBattleLog, cloneBattle } from './battle-utils';

const shardTitles: Record<RuneRarity, string> = {
  USUAL: 'обычных осколков',
  UNUSUAL: 'необычных осколков',
  RARE: 'редких осколков',
  EPIC: 'эпических осколков',
  LEGENDARY: 'легендарных осколков',
  MYTHICAL: 'мифических осколков',
};

const formatShardRewards = (rewards: Partial<Record<RuneRarity, number>>): string => {
  const parts = Object.entries(rewards)
    .filter(([, amount]) => amount !== undefined && amount > 0)
    .map(([rarity, amount]) => `${shardTitles[rarity as RuneRarity]}: ${amount}`);

  return parts.length > 0 ? parts.join(', ') : 'без осколков';
};

const hasBountyReward = (reward: EnemyThreatBountyReward): boolean => (
  reward.experience > 0
  || reward.gold > 0
  || Object.values(reward.shards).some((amount) => amount !== undefined && amount > 0)
);

const mergeShardRewards = (
  base: Partial<Record<RuneRarity, number>>,
  bonus: Partial<Record<RuneRarity, number>>,
): Partial<Record<RuneRarity, number>> => {
  const result: Partial<Record<RuneRarity, number>> = { ...base };

  for (const [rarity, amount] of Object.entries(bonus)) {
    if (amount === undefined || amount <= 0) {
      continue;
    }

    const key = rarity as RuneRarity;
    result[key] = (result[key] ?? 0) + amount;
  }

  return result;
};

const formatBountyReward = (reward: EnemyThreatBountyReward): string => [
  reward.experience > 0 ? `+${reward.experience} опыта` : null,
  reward.gold > 0 ? `+${reward.gold} пыли` : null,
  formatShardRewards(reward.shards) !== 'без осколков' ? formatShardRewards(reward.shards) : null,
].filter((part): part is string => part !== null).join(', ');

export interface VictoryRewardOptions {
  readonly forcedRune?: RuneDraft | null;
}

const resolveDroppedRune = (
  battle: BattleView,
  options: VictoryRewardOptions,
  random: GameRandom | undefined,
): RuneDraft | null => {
  if (options.forcedRune) {
    return options.forcedRune;
  }

  if (battle.enemy.runeDropChance <= 0) {
    return null;
  }

  if (!random) {
    throw new Error('GameRandom is required to roll a victory rune drop.');
  }

  return random.rollPercentage(battle.enemy.runeDropChance)
    ? RuneFactory.create(battle.locationLevel, undefined, undefined, random)
    : null;
};

export class RewardEngine {
  public static applyVictoryRewards(
    battle: BattleView,
    options: VictoryRewardOptions = {},
    random?: GameRandom,
  ): { battle: BattleView; droppedRune: RuneDraft | null } {
    const nextBattle = cloneBattle(battle);
    if (nextBattle.rewards === null) {
      return { battle: nextBattle, droppedRune: null };
    }

    const shardRewards: Partial<Record<RuneRarity, number>> = {
      USUAL: 2 + Math.floor(nextBattle.locationLevel / 10),
    };

    if (nextBattle.enemy.isElite) {
      shardRewards.UNUSUAL = 1 + Math.floor(nextBattle.locationLevel / 20);
    }

    if (nextBattle.enemy.isBoss) {
      shardRewards.RARE = 1 + Math.floor(nextBattle.locationLevel / 40);
    }

    const bountyReward = nextBattle.enemy.threat
      ? resolveEnemyThreatBountyReward({
          enemyName: nextBattle.enemy.threat.baseEnemyName,
          survivalCount: nextBattle.enemy.threat.survivalCount,
          experience: nextBattle.enemy.threat.experience,
          levelBonus: nextBattle.enemy.threat.levelBonus,
        })
      : null;
    const finalShardRewards = bountyReward
      ? mergeShardRewards(shardRewards, bountyReward.shards)
      : shardRewards;

    const droppedRune = resolveDroppedRune(nextBattle, options, random);

    nextBattle.rewards = {
      ...nextBattle.rewards,
      experience: nextBattle.rewards.experience + (bountyReward?.experience ?? 0),
      gold: nextBattle.rewards.gold + (bountyReward?.gold ?? 0),
      shards: finalShardRewards,
      droppedRune,
    };

    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `🏆 Победа! Награда: ${nextBattle.rewards.experience} опыта, ${nextBattle.rewards.gold} пыли, ${formatShardRewards(finalShardRewards)}.`,
      ...(bountyReward && hasBountyReward(bountyReward)
        ? [`🏠 Дозорная премия: ${formatBountyReward(bountyReward)}.`]
        : []),
      ...(droppedRune ? [`🔮 Найдена руна: ${droppedRune.name}.`] : []),
    );

    return { battle: nextBattle, droppedRune };
  }
}
