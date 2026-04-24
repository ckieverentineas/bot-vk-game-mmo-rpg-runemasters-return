import { AppError } from '../../../shared/domain/AppError';
import type { BattleView, PlayerState } from '../../../shared/types/game';
import { buildBattleAcquisitionSummary } from '../../player/application/read-models/acquisition-summary';
import type { GameRandom } from '../../shared/application/ports/GameRandom';
import type { GameRepository, SaveBattleOptions } from '../../shared/application/ports/GameRepository';
import { RewardEngine } from '../domain/reward-engine';
import { wrapBattleActionResult, type BattleActionResultView } from './battle-action-result';
import { resolveVictoryRewardOptions } from './resolve-victory-reward-options';

type BattleActionOutcomeRepository = Pick<GameRepository, 'findPlayerById' | 'finalizeBattle' | 'saveBattle'>;

interface BattleActionOutcomeContext {
  readonly repository: BattleActionOutcomeRepository;
  readonly random: GameRandom;
  readonly actingPlayer: PlayerState;
  readonly acquisitionBaselinePlayer: PlayerState;
  readonly battle: BattleView;
  readonly options?: SaveBattleOptions;
  readonly resultPlayerId?: number;
}

const applyCompletionRewards = (
  battle: BattleView,
  player: PlayerState,
  random: GameRandom,
): BattleView => {
  if (battle.result !== 'VICTORY') {
    return battle;
  }

  return RewardEngine.applyVictoryRewards(
    battle,
    resolveVictoryRewardOptions(player, battle, random),
    random,
  ).battle;
};

const resolveFinalizedResultPlayer = async (
  repository: BattleActionOutcomeRepository,
  actingPlayer: PlayerState,
  finalizedPlayer: PlayerState,
  resultPlayerId: number | undefined,
): Promise<PlayerState> => {
  if (!resultPlayerId || resultPlayerId === actingPlayer.playerId) {
    return finalizedPlayer;
  }

  const resultPlayer = await repository.findPlayerById(resultPlayerId);
  if (!resultPlayer) {
    throw new AppError('player_not_found', 'Персонаж уже не найден.');
  }

  return resultPlayer;
};

export const persistBattleActionOutcome = async ({
  repository,
  random,
  actingPlayer,
  acquisitionBaselinePlayer,
  battle,
  options,
  resultPlayerId,
}: BattleActionOutcomeContext): Promise<BattleActionResultView> => {
  if (battle.status !== 'COMPLETED') {
    return wrapBattleActionResult(await repository.saveBattle(battle, options));
  }

  const rewardedBattle = applyCompletionRewards(battle, actingPlayer, random);
  const finalized = await repository.finalizeBattle(actingPlayer.playerId, rewardedBattle, options);
  const resultPlayer = await resolveFinalizedResultPlayer(
    repository,
    actingPlayer,
    finalized.player,
    resultPlayerId,
  );

  return {
    battle: finalized.battle,
    player: resultPlayer,
    acquisitionSummary: buildBattleAcquisitionSummary(acquisitionBaselinePlayer, resultPlayer, finalized.battle),
  };
};
