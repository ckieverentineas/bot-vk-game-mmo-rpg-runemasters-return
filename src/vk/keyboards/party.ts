import { Keyboard } from 'vk-io';

import type { PartyView } from '../../shared/types/game';
import { gameCommands } from '../commands/catalog';
import { buildKeyboard } from './builder';
import type { KeyboardBuilder, KeyboardLayout } from './types';

export const createPartyKeyboard = (party: PartyView | null, viewerPlayerId: number): KeyboardBuilder => {
  const layout: KeyboardLayout = party
    ? [
        ...(party.leaderPlayerId === viewerPlayerId && party.members.length >= party.maxMembers
          ? [[
              {
                label: '⚔️ Исследовать отрядом',
                command: gameCommands.exploreParty,
                color: Keyboard.POSITIVE_COLOR,
              },
            ]]
          : []),
        [
          { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
        ],
      ]
    : [
        [
          {
            label: '🤝 Создать отряд',
            command: gameCommands.createParty,
            color: Keyboard.POSITIVE_COLOR,
          },
        ],
        [
          { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
        ],
      ];

  return buildKeyboard(layout);
};
