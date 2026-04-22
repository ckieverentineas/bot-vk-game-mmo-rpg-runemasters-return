import { Keyboard } from 'vk-io';

import type { QuestBookView } from '../../modules/quests/application/read-models/quest-book';
import { gameCommands } from '../commands/catalog';
import { buildKeyboard } from './builder';
import type { KeyboardBuilder, KeyboardLayout } from './types';

const createQuestBookLayout = (book: QuestBookView): KeyboardLayout => {
  const rewardRows = book.quests
    .filter((quest) => quest.status === 'READY_TO_CLAIM')
    .map((quest) => [{
      label: `🎁 ${quest.title}`,
      command: gameCommands.claimQuestReward,
      color: Keyboard.POSITIVE_COLOR,
      intentScoped: true,
      stateKey: quest.code,
    }] as const);

  return [
    ...rewardRows,
    [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
  ];
};

export const createQuestBookKeyboard = (book: QuestBookView): KeyboardBuilder => (
  buildKeyboard(createQuestBookLayout(book), { inline: true })
);
