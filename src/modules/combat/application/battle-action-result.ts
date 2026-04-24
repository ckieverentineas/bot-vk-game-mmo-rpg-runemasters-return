import type { BattleView, PlayerState } from '../../../shared/types/game';
import type { GameRepository } from '../../shared/application/ports/GameRepository';
import type { AcquisitionSummaryView } from '../../player/application/read-models/acquisition-summary';

export interface BattleActionResultView {
  readonly battle: BattleView;
  readonly player: PlayerState | null;
  readonly acquisitionSummary: AcquisitionSummaryView | null;
  readonly replayed?: true;
}

export const wrapBattleActionResult = (
  battle: BattleView,
  replayed = false,
): BattleActionResultView => ({
  battle,
  player: null,
  acquisitionSummary: null,
  ...(replayed ? { replayed: true as const } : {}),
});

export const normalizeBattleActionResult = (
  result: BattleActionResultView | BattleView,
  replayed = false,
): BattleActionResultView => {
  if ('battle' in result) {
    return replayed ? { ...result, replayed: true } : result;
  }

  return wrapBattleActionResult(result, replayed);
};

export const persistBattleActionReplay = async (
  repository: Pick<GameRepository, 'storeCommandIntentResult'>,
  playerId: number,
  intentId: string | undefined,
  result: BattleActionResultView,
): Promise<void> => {
  if (!intentId) {
    return;
  }

  await repository.storeCommandIntentResult(playerId, intentId, result);
};
