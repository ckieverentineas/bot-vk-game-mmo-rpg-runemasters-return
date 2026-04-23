import { describe, expect, it } from 'vitest';

import type { PlayerState } from '../../shared/types/game';
import { emptyInventory } from '../../modules/player/domain/player-stats';
import {
  buildQuestBookView,
  type QuestBookView,
  type QuestView,
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

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: {
    health: 30,
    attack: 5,
    defence: 2,
    magicDefence: 1,
    dexterity: 1,
    intelligence: 1,
  },
  locationLevel: 1,
  currentRuneIndex: 0,
  unlockedRuneSlotCount: 2,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 1,
  tutorialState: 'COMPLETED',
  inventory: emptyInventory(),
  schoolMasteries: [],
  skills: [],
  runes: [],
  createdAt: '2026-04-22T00:00:00.000Z',
  updatedAt: '2026-04-22T00:00:00.000Z',
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
  it('renders the quest book by priority without full text for every record', () => {
    const message = renderQuestBook(createBook());

    expect(message).toMatchInlineSnapshot(`
"📜 Книга путей

Руны помнят не обещания, а завершённые шаги.

В книге: 1 запись ждёт награду · 1 след ещё тянется · 1 запись уже закрыта.

🎁 Готово

Глава: Первый круг
• 🌑 Пробуждение Пустого мастера · 🎁 Награда ждёт · +5 пыли · +1 обычный осколок

🌒 Ближайший след

Глава: Первое имя
🚪 Имя на границе · 🌒 В пути
След: Выйти из Учебного круга на первую дорогу.
Отметка пути: 0/1.
Награда: +7 пыли.

✅ Закрыто

Первый круг: 🔮 Первый знак."
`);

    expect(message).toContain('След: Выйти из Учебного круга на первую дорогу.');
    expect(message).toContain('Отметка пути: 0/1.');
    expect(message).not.toContain('Первые руны услышали зов.');
    expect(message).not.toContain('Школа оставила ответ в рунах.');
    expect(message).not.toContain('След: Пройти первый школьный след.');
    expect(message).not.toMatch(/\n\d+\./);
    expect(message).not.toContain('Цель:');
    expect(message).not.toContain('Прогресс:');
    expect(message).not.toContain('квест выполнен');
    expect(message).not.toContain('система выдала');
  });

  it('renders ready world trail entries compactly and keeps only the nearest unfinished trail expanded', () => {
    const book = buildQuestBookView(createPlayer({
      highestLocationLevel: 3,
      mobsKilled: 2,
    }), []);

    const message = renderQuestBook(book);

    expect(message).toContain('Глава: Тёмный лес');
    expect(message).toContain('Вторая тень леса');
    expect(message).toContain('• 🌲 Вторая тень леса · 🎁 Награда ждёт');
    expect(message).toContain('Пять отметин дороги');
    expect(message).toContain('🌒 Ближайший след');
    expect(message).toContain('Отметка пути: 2/5.');
    expect(message).not.toContain('След: Дойти до 3-го следа Тёмного леса.');
    expect(message).not.toContain('След: Дойти до 10-го следа Тёмного леса.');
    expect(message).not.toContain('locationLevel');
    expect(message).not.toContain('mobsKilled');
  });

  it('collapses closed records per chapter when the archive grows', () => {
    const book: QuestBookView = {
      player: {} as PlayerState,
      readyToClaimCount: 0,
      inProgressCount: 0,
      claimedCount: 4,
      quests: [
        createQuest({
          code: 'awakening_empty_master',
          icon: '🌑',
          title: 'Пробуждение Пустого мастера',
          story: 'Первые руны услышали зов.',
          objective: 'Принять первое испытание круга.',
          status: 'CLAIMED',
          progress: { current: 1, required: 1, completed: true },
        }),
        createQuest({
          code: 'first_sign',
          icon: '🔮',
          title: 'Первый знак',
          story: 'Школа оставила ответ в рунах.',
          objective: 'Надеть любую руну.',
          status: 'CLAIMED',
          progress: { current: 1, required: 1, completed: true },
        }),
        createQuest({
          code: 'voice_of_school',
          icon: '🜁',
          title: 'Голос школы',
          story: 'Школа стала стилем боя.',
          objective: 'Победить с боевой руной.',
          status: 'CLAIMED',
          progress: { current: 1, required: 1, completed: true },
        }),
        createQuest({
          code: 'two_sockets',
          icon: '🧩',
          title: 'Два гнезда',
          story: 'Два знака спорят в сборке.',
          objective: 'Надеть две руны.',
          status: 'CLAIMED',
          progress: { current: 2, required: 2, completed: true },
        }),
      ],
    };

    const message = renderQuestBook(book);

    expect(message).toContain('✅ Закрыто');
    expect(message).toContain('Первый круг: 🌑 Пробуждение Пустого мастера, 🔮 Первый знак, 🜁 Голос школы, ещё 1 запись.');
    expect(message).not.toContain('Два знака спорят в сборке.');
    expect(message).not.toContain('Награда:');
  });
});
