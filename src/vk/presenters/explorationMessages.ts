import { buildPlayerNextGoalView } from '../../modules/player/application/read-models/next-goal';
import {
  getExplorationSceneEffectLine,
  type ExplorationSceneView,
} from '../../modules/world/domain/exploration-events';
import type { PlayerState } from '../../shared/types/game';
import {
  renderHintBlock,
  renderNextGoalSummary,
} from './message-formatting';

const trimBattleAbsentPrefix = (line: string): string => line.replace(/^Боя нет:\s*/u, '');

export const renderExplorationEvent = (event: ExplorationSceneView, player: PlayerState): string => {
  const effectLine = getExplorationSceneEffectLine(event);

  return [
    '🧭 Исследование',
    '',
    event.title,
    ...(event.kindLabel ? [`🏷️ ${event.kindLabel}`] : []),
    event.description,
    '',
    `✅ ${trimBattleAbsentPrefix(event.outcomeLine)}`,
    ...(effectLine ? [`🎁 ${effectLine}`] : []),
    ...renderHintBlock([event.directorLine]),
    ...renderNextGoalSummary(buildPlayerNextGoalView(player), '👉 Продолжить'),
  ].join('\n');
};
