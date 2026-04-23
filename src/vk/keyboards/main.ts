import { Keyboard } from 'vk-io';

import {
  buildEnterTutorialModeIntentStateKey,
  buildExploreLocationIntentStateKey,
} from '../../modules/exploration/application/command-intent-state';
import type { PlayerState } from '../../shared/types/game';
import { gameCommands } from '../commands/catalog';
import { buildKeyboard } from './builder';
import { resolveSchoolContinuationLabel } from './goal-labels';
import type { KeyboardBuilder, KeyboardLayout } from './types';

const createMainMenuLayout = (player?: PlayerState): KeyboardLayout => {
  const locationStateKey = player ? buildEnterTutorialModeIntentStateKey(player) : undefined;
  const exploreStateKey = player ? buildExploreLocationIntentStateKey(player) : undefined;
  const exploreLabel = resolveSchoolContinuationLabel(player, '⚔️ Исследовать');

  return [
    [
      { label: '👤 Летопись', command: gameCommands.profile, color: Keyboard.PRIMARY_COLOR },
      { label: '🎒 Инвентарь', command: gameCommands.inventory, color: Keyboard.SECONDARY_COLOR },
    ],
    [
      { label: '✨ След дня', command: gameCommands.dailyTrace, color: Keyboard.SECONDARY_COLOR },
      { label: '📜 Книга путей', command: gameCommands.questBook, color: Keyboard.PRIMARY_COLOR },
    ],
    [
      { label: '📖 Бестиарий', command: gameCommands.bestiary, color: Keyboard.SECONDARY_COLOR },
    ],
    [
      {
        label: '📘 Обучение',
        command: gameCommands.location,
        color: Keyboard.PRIMARY_COLOR,
        intentScoped: Boolean(player),
        stateKey: locationStateKey,
      },
      {
        label: exploreLabel,
        command: gameCommands.explore,
        color: Keyboard.POSITIVE_COLOR,
        intentScoped: Boolean(player),
        stateKey: exploreStateKey,
      },
    ],
    [
      { label: '🔮 Руны', command: gameCommands.runeCollection, color: Keyboard.POSITIVE_COLOR },
      { label: '🛠 Мастерская', command: gameCommands.altar, color: Keyboard.SECONDARY_COLOR },
    ],
  ];
};

const entryLayout: KeyboardLayout = [
  [{ label: '🎮 Начать', command: gameCommands.start, color: Keyboard.POSITIVE_COLOR }],
];

const createProfileLayout = (_player?: PlayerState): KeyboardLayout => [[
  { label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
], [
  { label: '🗑️ Удалить персонажа', command: gameCommands.deletePlayer, color: Keyboard.NEGATIVE_COLOR },
]];

export const createMainMenuKeyboard = (player?: PlayerState): KeyboardBuilder => (
  buildKeyboard(createMainMenuLayout(player))
);

export const createEntryKeyboard = (): KeyboardBuilder => buildKeyboard(entryLayout);

export const createProfileKeyboard = (player?: PlayerState): KeyboardBuilder => (
  buildKeyboard(createProfileLayout(player))
);

export const createDeleteConfirmationKeyboard = (player: PlayerState): KeyboardBuilder => buildKeyboard([
  [{
    label: '🗑️ Да, удалить',
    command: gameCommands.confirmDeletePlayer,
    color: Keyboard.NEGATIVE_COLOR,
    intentScoped: true,
    stateKey: player.updatedAt,
  }],
  [{ label: '◀ Оставить персонажа', command: gameCommands.profile, color: Keyboard.SECONDARY_COLOR }],
]);
