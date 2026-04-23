import { Keyboard } from 'vk-io';

import type { BestiaryView } from '../../modules/world/application/read-models/bestiary';
import {
  createBestiaryPageCommand,
  gameCommands,
} from '../commands/catalog';
import { buildKeyboard } from './builder';
import type { KeyboardBuilder, KeyboardLayout } from './types';

const resolvePreviousPageNumber = (bestiary: BestiaryView): number => (
  bestiary.pageNumber > 1 ? bestiary.pageNumber - 1 : bestiary.totalPages
);

const resolveNextPageNumber = (bestiary: BestiaryView): number => (
  bestiary.pageNumber < bestiary.totalPages ? bestiary.pageNumber + 1 : 1
);

const createBestiaryLayout = (bestiary: BestiaryView): KeyboardLayout => [
  ...(bestiary.totalPages > 1
    ? [[
        {
          label: '◀ Назад',
          command: createBestiaryPageCommand(resolvePreviousPageNumber(bestiary)),
          color: Keyboard.SECONDARY_COLOR,
        },
        {
          label: '▶ Вперёд',
          command: createBestiaryPageCommand(resolveNextPageNumber(bestiary)),
          color: Keyboard.SECONDARY_COLOR,
        },
      ] as const]
    : []),
  [
    { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
];

export const createBestiaryKeyboard = (bestiary: BestiaryView): KeyboardBuilder => (
  buildKeyboard(createBestiaryLayout(bestiary))
);
