import type { PendingRewardView } from '../modules/shared/application/ports/GameRepository';

type PendingTrophyAction = PendingRewardView['snapshot']['trophyActions'][number];

export const listPlayerFacingTrophyActions = (
  actions: readonly PendingTrophyAction[],
): readonly PendingTrophyAction[] => {
  const hasUniqueAction = actions.some((action) => action.code !== 'claim_all');

  return hasUniqueAction
    ? actions.filter((action) => action.code !== 'claim_all')
    : actions;
};
