import type { Context } from 'vk-io';

import type { RunicTavernBoardView } from '../../../modules/quests/application/read-models/runic-tavern-board';
import { createRunicTavernKeyboard } from '../../keyboards';
import { renderRunicTavern } from '../../presenters/messages';

export const replyWithRunicTavern = async (
  ctx: Context,
  board: RunicTavernBoardView,
): Promise<void> => {
  await ctx.reply(renderRunicTavern(board), { keyboard: createRunicTavernKeyboard(board) });
};
