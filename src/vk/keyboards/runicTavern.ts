import { Keyboard } from 'vk-io';

import type { RunicTavernBoardView } from '../../modules/quests/application/read-models/runic-tavern-board';
import { gameCommands } from '../commands/catalog';
import { buildKeyboard } from './builder';
import type { KeyboardBuilder, KeyboardLayout } from './types';

const shouldOfferParty = (board: RunicTavernBoardView): boolean => (
  board.threats.some((threat) => threat.recommendedParty)
);

const createRunicTavernLayout = (board: RunicTavernBoardView): KeyboardLayout => [
  [
    { label: '⚔️ Исследовать', command: gameCommands.explore, color: Keyboard.POSITIVE_COLOR },
    ...(shouldOfferParty(board)
      ? [{ label: '🤝 Отряд', command: gameCommands.party, color: Keyboard.PRIMARY_COLOR }]
      : []),
  ],
  [
    { label: '📜 Книга путей', command: gameCommands.questBook, color: Keyboard.SECONDARY_COLOR },
    { label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
];

export const createRunicTavernKeyboard = (board: RunicTavernBoardView): KeyboardBuilder => (
  buildKeyboard(createRunicTavernLayout(board), { inline: true })
);
