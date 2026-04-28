import type { PendingRewardView } from '../modules/shared/application/ports/GameRepository';

type PendingTrophyAction = PendingRewardView['snapshot']['trophyActions'][number];

const isTrophyActionAvailable = (action: PendingTrophyAction): boolean => (
  action.availability?.available !== false
);

export const listPlayerFacingTrophyActions = (
  actions: readonly PendingTrophyAction[],
): readonly PendingTrophyAction[] => {
  const availableActions = actions.filter(isTrophyActionAvailable);
  const hasUniqueAction = availableActions.some((action) => action.code !== 'claim_all');

  return hasUniqueAction
    ? availableActions.filter((action) => action.code !== 'claim_all')
    : availableActions;
};
