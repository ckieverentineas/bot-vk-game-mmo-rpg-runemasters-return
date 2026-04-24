import { describe, expect, it } from 'vitest';

import {
  formatBattleReward,
  formatCountPhrase,
  formatCurrencyBalance,
  formatProgressCounter,
  renderPrimaryActionLine,
} from './message-formatting';

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
});
