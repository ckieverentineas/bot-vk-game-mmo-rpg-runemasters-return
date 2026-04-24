import type { ClaimDailyTraceView } from '../../modules/activity/application/use-cases/ClaimDailyTrace';
import { buildPlayerNextGoalView } from '../../modules/player/application/read-models/next-goal';
import {
  formatResourceReward,
  renderNextGoalSummary,
} from './message-formatting';

export const renderDailyTrace = (view: ClaimDailyTraceView): string => {
  const rewardLine = formatResourceReward(view.trace.reward);

  if (!view.claimedNow) {
    return [
      '✨ След дня',
      '',
      `✅ Уже найдено: ${view.trace.title}.`,
      'Сегодняшний знак уже в сумке.',
      ...renderNextGoalSummary(buildPlayerNextGoalView(view.player), '👉 Дальше'),
    ].join('\n');
  }

  return [
    '✨ След дня',
    '',
    view.trace.title,
    view.trace.description,
    `🎁 ${rewardLine}.`,
    'Тихая находка. Можно идти дальше.',
    ...renderNextGoalSummary(buildPlayerNextGoalView(view.player), '👉 Дальше'),
  ].join('\n');
};
