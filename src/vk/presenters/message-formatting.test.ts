import { describe, expect, it } from 'vitest';

import {
  formatBattleReward,
  formatCountPhrase,
  formatCurrencyBalance,
  formatProgressCounter,
  renderPrimaryActionLine,
  renderNextGoalSummary,
} from './message-formatting';
import type { NextGoalView } from '../../modules/player/application/read-models/next-goal';

describe('message-formatting', () => {
  it('formats shared resource, reward, progress and CTA copy', () => {
    expect(formatCurrencyBalance({ gold: 7, radiance: 2 })).toBe('💰 7 пыли · ✨ 2 сияния');
    expect(formatCurrencyBalance({ gold: 7, radiance: 2 }, 'radiance-first')).toBe('✨ 2 сияния · 💰 7 пыли');
    expect(formatProgressCounter(3, 5)).toBe('3/5');
    expect(renderPrimaryActionLine('⚔️ Исследовать', '👉 Дальше')).toBe('👉 Дальше: «⚔️ Исследовать».');
  });

  it('formats battle reward payloads without duplicating presenter glue', () => {
    expect(formatBattleReward({
      experience: 14,
      gold: 5,
      shards: { USUAL: 2 },
      droppedRune: null,
    })).toBe('+14 опыта · +5 пыли · +2 обычных осколка');
  });

  it('formats Russian count phrases for compact progress summaries', () => {
    const forms = ['запись ждёт', 'записи ждут', 'записей ждут'] as const;

    expect(formatCountPhrase(1, forms)).toBe('1 запись ждёт');
    expect(formatCountPhrase(2, forms)).toBe('2 записи ждут');
    expect(formatCountPhrase(5, forms)).toBe('5 записей ждут');
  });

  it('renders next-step guidance as a separate hint block', () => {
    const nextGoal: NextGoalView = {
      goalType: 'push_higher_threat',
      primaryAction: 'explore',
      primaryActionLabel: '⚔️ Исследовать',
      objectiveText: 'исследуйте маршрут дальше',
      whyText: 'Следующая полезная руна может ждать рядом.',
      schoolCode: null,
      schoolName: null,
      milestoneTitle: null,
      milestoneProgressText: null,
      milestoneBenefitText: null,
    };

    expect(renderNextGoalSummary(nextGoal, '👉 Дальше')).toEqual([
      '',
      '💡 След: исследуйте маршрут дальше.',
      '💡 Дальше: «⚔️ Исследовать».',
    ]);
  });
});
