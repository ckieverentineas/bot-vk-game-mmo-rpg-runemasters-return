import { describe, expect, it } from 'vitest';

import type { PlayerState } from '../../shared/types/game';
import type {
  QuestBookView,
  QuestView,
} from '../../modules/quests/application/read-models/quest-book';
import { renderQuestBook } from './questMessages';

const createQuest = (overrides: Partial<QuestView>): QuestView => ({
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
  ...overrides,
});

const createBook = (): QuestBookView => ({
  player: {} as PlayerState,
  readyToClaimCount: 1,
  inProgressCount: 1,
  claimedCount: 1,
  quests: [
    createQuest({
      code: 'awakening_empty_master',
      icon: '🌑',
      title: 'Пробуждение Пустого мастера',
      story: 'Первые руны услышали зов.',
      objective: 'Принять первое испытание круга.',
      reward: { gold: 5, inventoryDelta: { usualShards: 1 } },
      progress: {
        current: 1,
        required: 1,
        completed: true,
      },
      status: 'READY_TO_CLAIM',
    }),
    createQuest({
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
    }),
    createQuest({
      code: 'first_sign',
      icon: '🔮',
      title: 'Первый знак',
      story: 'Школа оставила ответ в рунах.',
      objective: 'Пройти первый школьный след.',
      reward: { gold: 8, inventoryDelta: { herb: 1 } },
      progress: {
        current: 1,
        required: 1,
        completed: true,
      },
      status: 'CLAIMED',
    }),
  ],
});

describe('renderQuestBook', () => {
  it('renders path records without administrative list tone', () => {
    const message = renderQuestBook(createBook());

    expect(message).toMatchInlineSnapshot(`
"📜 Книга путей

Руны помнят не обещания, а завершённые шаги.

В книге: 1 запись ждёт награду · 1 след ещё тянется · 1 запись уже закрыта.

🌑 Пробуждение Пустого мастера · 🎁 Награда ждёт
Первые руны услышали зов.
След: Принять первое испытание круга.
Шаг завершён. Награда ждёт в книге.
Награда: +5 пыли · +1 обычный осколок.

🚪 Имя на границе · 🌒 В пути
Учебный круг остаётся позади.
След: Выйти из Учебного круга на первую дорогу.
Отметка пути: 0/1.
Награда: +7 пыли.

🔮 Первый знак · ✅ Закрыто
Школа оставила ответ в рунах.
След: Пройти первый школьный след.
Запись закрыта.
Награда: +8 пыли · +1 трава."
`);

    expect(message).toContain('След: Выйти из Учебного круга на первую дорогу.');
    expect(message).toContain('Отметка пути: 0/1.');
    expect(message).not.toMatch(/\n\d+\./);
    expect(message).not.toContain('Цель:');
    expect(message).not.toContain('Прогресс:');
    expect(message).not.toContain('квест выполнен');
    expect(message).not.toContain('система выдала');
  });
});
