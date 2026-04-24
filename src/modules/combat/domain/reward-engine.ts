import type { BattleView, RuneDraft, RuneRarity } from '../../../shared/types/game';
import type { GameRandom } from '../../../shared/domain/GameRandom';
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

    const droppedRune = resolveDroppedRune(nextBattle, options, random);

    nextBattle.rewards = {
      ...nextBattle.rewards,
      shards: shardRewards,
      droppedRune,
    };

    nextBattle.log = appendBattleLog(
      nextBattle.log,
      `🏆 Победа! Награда: ${nextBattle.rewards.experience} опыта, ${nextBattle.rewards.gold} пыли, ${formatShardRewards(shardRewards)}.`,
      ...(droppedRune ? [`🔮 Найдена руна: ${droppedRune.name}.`] : []),
    );

    return { battle: nextBattle, droppedRune };
  }
}
