import { describe, expect, it } from 'vitest';

import { emptyInventory } from '../../modules/player/domain/player-stats';
import {
  buildQuestBookView,
  type QuestBookView,
  type QuestView,
} from '../../modules/quests/application/read-models/quest-book';
import type { PlayerState } from '../../shared/types/game';
import {
  getQuestBookPageView,
  renderQuestBook,
} from './questMessages';

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
  it('renders a compact chapter page with reward markers', () => {
    const message = renderQuestBook(createBook());

    expect(message).toContain('Страница 1 из 1 · записи 1-3 из 3.');
    expect(message).toContain('Ближайший след: 🚪 Имя на границе — 0/1 · Выйти из Учебного круга на первую дорогу.');
    expect(message).toContain('Готовые награды: 1 запись ждёт.');
    expect(message).toContain('🎁 Готовые награды · 1');
    expect(message).toContain('1. 🌑 Пробуждение Пустого мастера · Первый круг');
    expect(message).toContain('🎁 Награда не собрана: +5 пыли · +1 обычный осколок');
    expect(message).toContain('+5 пыли · +1 обычный осколок');
    expect(message).toContain('🧭 Ближайший след');
    expect(message).toContain('2. 🚪 Имя на границе · Первое имя');
    expect(message).toContain('🌒 В пути: 0/1 · Выйти из Учебного круга на первую дорогу.');
    expect(message).toContain('✅ Архив · 1');
    expect(message).toContain('3. 🔮 Первый знак');
    expect(message).not.toContain('✅ Закрыто');
    expect(message).not.toContain('Первые руны услышали зов.');
    expect(message).not.toContain('Школа оставила ответ в рунах.');
    expect(message).not.toContain('Цель:');
    expect(message).not.toContain('Прогресс:');
    expect(message).not.toContain('квест выполнен');
    expect(message).not.toContain('система выдала');
  });

  it('renders requested pages instead of pulling every ready record into one message', () => {
    const book = buildQuestBookView(createPlayer({
      highestLocationLevel: 3,
      mobsKilled: 2,
    }), []);

    const page = getQuestBookPageView(book, 3);
    const message = renderQuestBook(book, 3);

    expect(page.quests).toHaveLength(5);
    expect(message).toContain('Страница 3 из');
    expect(message).toContain('🌒 Следы дальше · 5');
    expect(message).toContain('Пять отметин дороги');
    expect(message).toContain('2/5');
    expect(message).toContain('Костёр среди чащи');
    expect(message).toContain('Устье забытых пещер');
    expect(message).not.toContain('Вторая тень леса');
    expect(message).not.toContain('1. 🌑 Пробуждение Пустого мастера');
    expect(message).not.toContain('2. 🔮 Первый знак');
    expect(message).not.toContain('locationLevel');
    expect(message).not.toContain('mobsKilled');
  });

  it('keeps closed records compact on the current page', () => {
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

    expect(message).toContain('Страница 1 из 1 · записи 1-4 из 4.');
    expect(message).toContain('Ближайший след: все открытые следы закрыты.');
    expect(message).toContain('Готовых наград сейчас нет.');
    expect(message).toContain('✅ Архив · 4');
    expect(message).not.toContain('✅ Закрыто');
    expect(message).toContain('1. 🌑 Пробуждение Пустого мастера');
    expect(message).toContain('4. 🧩 Два гнезда');
    expect(message).not.toContain('Два знака спорят в сборке.');
    expect(message).not.toContain('Награда:');
  });
});
