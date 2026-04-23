import { Keyboard } from 'vk-io';

import type {
  BestiaryLocationDetailView,
  BestiaryOverviewView,
} from '../../modules/world/application/read-models/bestiary';
import {
  createBestiaryLocationCommand,
  createBestiaryPageCommand,
  gameCommands,
} from '../commands/catalog';
import { buildKeyboard } from './builder';
import type { KeyboardBuilder, KeyboardLayout } from './types';

const locationButtonsPerRow = 2;

const resolvePreviousPageNumber = (bestiary: BestiaryOverviewView): number => (
  bestiary.pageNumber > 1 ? bestiary.pageNumber - 1 : bestiary.totalPages
);

const resolveNextPageNumber = (bestiary: BestiaryOverviewView): number => (
  bestiary.pageNumber < bestiary.totalPages ? bestiary.pageNumber + 1 : 1
);

const chunkRows = <T>(items: readonly T[], size: number): readonly (readonly T[])[] => {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
};

const createLocationRows = (bestiary: BestiaryOverviewView): KeyboardLayout => {
  const buttons = bestiary.locations
    .filter((location) => location.isUnlocked)
    .map((location) => ({
      label: location.biome.name,
      command: createBestiaryLocationCommand(location.biome.code),
      color: Keyboard.PRIMARY_COLOR,
    }));

  return chunkRows(buttons, locationButtonsPerRow);
};

const createBestiaryLayout = (bestiary: BestiaryOverviewView): KeyboardLayout => [
  ...createLocationRows(bestiary),
  ...(bestiary.totalPages > 1
    ? [[
        {
          label: '◀ Назад',
          command: createBestiaryPageCommand(resolvePreviousPageNumber(bestiary)),
          color: Keyboard.SECONDARY_COLOR,
        },
        {
          label: '▶ Вперед',
          command: createBestiaryPageCommand(resolveNextPageNumber(bestiary)),
          color: Keyboard.SECONDARY_COLOR,
        },
      ] as const]
    : []),
  [
    { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
];

export const createBestiaryKeyboard = (bestiary: BestiaryOverviewView): KeyboardBuilder => (
  buildKeyboard(createBestiaryLayout(bestiary))
);

export const createBestiaryLocationKeyboard = (
  _detail: BestiaryLocationDetailView,
  pageNumber = 1,
): KeyboardBuilder => buildKeyboard([
  [
    {
      label: '◀ К локациям',
      command: createBestiaryPageCommand(pageNumber),
      color: Keyboard.SECONDARY_COLOR,
    },
  ],
  [
    { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
]);
