import { buildPlayerNextGoalView } from '../../modules/player/application/read-models/next-goal';
import {
  getExplorationSceneEffectLine,
  type ExplorationSceneView,
} from '../../modules/world/domain/exploration-events';
import type { PlayerState } from '../../shared/types/game';
import { renderNextGoalSummary } from './message-formatting';

export const renderExplorationEvent = (event: ExplorationSceneView, player: PlayerState): string => {
  const effectLine = getExplorationSceneEffectLine(event);

  return [
    '🧭 Исследование',
    '',
    event.title,
    ...(event.kindLabel ? [`Знак: ${event.kindLabel}`] : []),
    ...(event.directorLine ? [event.directorLine] : []),
    event.description,
    '',
    event.outcomeLine,
    ...(effectLine ? [effectLine] : []),
    event.nextStepLine,
    '',
    ...renderNextGoalSummary(buildPlayerNextGoalView(player), '👉 Продолжить'),
  ].join('\n');
};
