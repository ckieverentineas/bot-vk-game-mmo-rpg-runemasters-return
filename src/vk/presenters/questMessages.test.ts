import { describe, expect, it } from 'vitest';

import type { PlayerState } from '../../shared/types/game';
import type { QuestBookView } from '../../modules/quests/application/read-models/quest-book';
import { renderQuestBook } from './questMessages';

const createBook = (): QuestBookView => ({
  player: {} as PlayerState,
  readyToClaimCount: 0,
  inProgressCount: 1,
  claimedCount: 0,
  quests: [
    {
      code: 'name_on_threshold',
      icon: '🚪',
      title: 'Имя на границе',
      story: 'Учебный круг остаётся позади.',
      objective: 'Выйти из Учебного круга на первую дорогу.',
      reward: { gold: 7 },
      progress: {
        current: 0,
        required: 1,
        completed: false,
      },
      status: 'IN_PROGRESS',
    },
  ],
});

describe('renderQuestBook', () => {
  it('renders path records without administrative progress labels', () => {
    const message = renderQuestBook(createBook());

    expect(message).toContain('След: Выйти из Учебного круга на первую дорогу.');
    expect(message).toContain('Путь: 0/1.');
    expect(message).not.toContain('Цель:');
    expect(message).not.toContain('Прогресс:');
  });
});
