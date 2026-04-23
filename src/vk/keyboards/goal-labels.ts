import { buildPlayerNextGoalView } from '../../modules/player/application/read-models/next-goal';
import type { PlayerState } from '../../shared/types/game';

export const resolveSchoolContinuationLabel = (
  player: PlayerState | undefined,
  fallbackLabel: string,
): string => {
  if (!player) {
    return fallbackLabel;
  }

  const nextGoal = buildPlayerNextGoalView(player);
  return nextGoal.goalType === 'challenge_school_miniboss' || nextGoal.goalType === 'prove_school_seal'
    ? nextGoal.primaryActionLabel
    : fallbackLabel;
};
