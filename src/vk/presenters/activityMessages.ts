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
      `${view.trace.title} уже найден.`,
      'Сегодня этот мягкий след уже дал свою пользу. Серии нет, штрафов за пропуск нет.',
      '',
      ...renderNextGoalSummary(buildPlayerNextGoalView(view.player), '👉 Дальше'),
    ].join('\n');
  }

  return [
    '✨ След дня',
    '',
    view.trace.title,
    view.trace.description,
    `Найдено: ${rewardLine}.`,
    'Это необязательный след: без серии, без штрафа за пропуск и без долга на завтра.',
    '',
    ...renderNextGoalSummary(buildPlayerNextGoalView(view.player), '👉 Дальше'),
  ].join('\n');
};
