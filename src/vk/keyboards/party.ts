import { Keyboard } from 'vk-io';

import type { PartyView } from '../../shared/types/game';
import { gameCommands } from '../commands/catalog';
import { buildKeyboard } from './builder';
import type { KeyboardBuilder, KeyboardLayout } from './types';

export const createPartyKeyboard = (party: PartyView | null, viewerPlayerId: number): KeyboardBuilder => {
  const partyBattleActive = party !== null && party.activeBattleId !== null;
  const isLeader = party?.leaderPlayerId === viewerPlayerId;
  const isReady = party !== null && party.members.length >= party.maxMembers;

  const layout: KeyboardLayout = party
    ? [
        ...(!partyBattleActive && isLeader && isReady
          ? [[
              {
                label: '⚔️ Исследовать отрядом',
                command: gameCommands.exploreParty,
                color: Keyboard.POSITIVE_COLOR,
              },
            ]]
          : []),
        ...(!partyBattleActive
          ? [[
              isLeader
                ? {
                    label: '🗑️ Расформировать отряд',
                    command: gameCommands.disbandParty,
                    color: Keyboard.NEGATIVE_COLOR,
                  }
                : {
                    label: '🚪 Выйти из отряда',
                    command: gameCommands.leaveParty,
                    color: Keyboard.NEGATIVE_COLOR,
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
