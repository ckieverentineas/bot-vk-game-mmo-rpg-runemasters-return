import { Keyboard } from 'vk-io';

import type { QuestBookView } from '../../modules/quests/application/read-models/quest-book';
import {
  createQuestBookPageCommand,
  gameCommands,
} from '../commands/catalog';
import {
  getQuestBookPageView,
  normalizeQuestBookPageNumber,
} from '../presenters/questMessages';
import { buildKeyboard } from './builder';
import type { KeyboardBuilder, KeyboardLayout } from './types';

const maxQuestKeyboardRows = 6;
const navigationRowCount = 1;
const maxVisibleRewardButtons = maxQuestKeyboardRows - navigationRowCount;

const resolvePreviousPageNumber = (book: QuestBookView, pageNumber: number): number => {
  const currentPage = normalizeQuestBookPageNumber(book, pageNumber);
  const totalPages = getQuestBookPageView(book, currentPage).totalPages;

  return currentPage > 1 ? currentPage - 1 : totalPages;
};

const resolveNextPageNumber = (book: QuestBookView, pageNumber: number): number => {
  const currentPage = normalizeQuestBookPageNumber(book, pageNumber);
  const totalPages = getQuestBookPageView(book, currentPage).totalPages;

  return currentPage < totalPages ? currentPage + 1 : 1;
};

const createNavigationRow = (book: QuestBookView, pageNumber: number) => {
  const page = getQuestBookPageView(book, pageNumber);

  if (page.totalPages <= 1) {
    return [
      { label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
    ] as const;
  }

  return [
    {
      label: '◀ Назад',
      command: createQuestBookPageCommand(resolvePreviousPageNumber(book, page.pageNumber)),
      color: Keyboard.SECONDARY_COLOR,
    },
    { label: 'Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
    {
      label: '▶ Вперёд',
      command: createQuestBookPageCommand(resolveNextPageNumber(book, page.pageNumber)),
      color: Keyboard.SECONDARY_COLOR,
    },
  ] as const;
};

const createQuestBookLayout = (book: QuestBookView, pageNumber: number): KeyboardLayout => {
  const page = getQuestBookPageView(book, pageNumber);
  const rewardRows = page.quests
    .filter((quest) => quest.status === 'READY_TO_CLAIM')
    .slice(0, maxVisibleRewardButtons)
    .map((quest) => [{
      label: `🎁 ${quest.title}`,
      command: gameCommands.claimQuestReward,
      color: Keyboard.POSITIVE_COLOR,
      intentScoped: true,
      stateKey: quest.code,
    }] as const);

  return [
    ...rewardRows,
    createNavigationRow(book, page.pageNumber),
  ];
};

export const createQuestBookKeyboard = (book: QuestBookView, pageNumber = 1): KeyboardBuilder => (
  buildKeyboard(createQuestBookLayout(book, pageNumber), { inline: true })
);
