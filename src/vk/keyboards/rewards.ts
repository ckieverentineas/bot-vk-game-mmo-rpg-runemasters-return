import { Keyboard } from 'vk-io';

import type { PendingRewardView } from '../../modules/shared/application/ports/GameRepository';
import { gameCommands, resolveTrophyActionCodeCommand } from '../commands/catalog';
import { buildKeyboard } from './builder';
import type { KeyboardBuilder, KeyboardLayout } from './types';

const createPendingRewardLayout = (pendingReward: PendingRewardView): KeyboardLayout => {
  const actionRows = pendingReward.snapshot.trophyActions.map((action) => [{
    label: action.label,
    command: resolveTrophyActionCodeCommand(action.code),
    color: action.code === 'claim_all' ? Keyboard.SECONDARY_COLOR : Keyboard.POSITIVE_COLOR,
    intentScoped: true,
    stateKey: pendingReward.ledgerKey,
  }] as const);

  return [
    ...actionRows,
    [
      { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
    ],
  ];
};

export const createPendingRewardKeyboard = (pendingReward: PendingRewardView): KeyboardBuilder => buildKeyboard(
  createPendingRewardLayout(pendingReward),
  { inline: true },
);
