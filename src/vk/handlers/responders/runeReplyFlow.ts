import type { Context } from 'vk-io';

import type { CraftRuneResultView } from '../../../modules/runes/application/use-cases/CraftRune';
import type { PlayerState } from '../../../shared/types/game';
import {
  createRuneDetailKeyboard,
  createRuneKeyboard,
  createRuneRerollKeyboard,
} from '../../keyboards';
import {
  renderAltar,
  renderRuneDetailScreen,
  renderRuneScreen,
} from '../../presenters/messages';

export type RuneHubReplyState = PlayerState | CraftRuneResultView;

const normalizeRuneHubReplyState = (state: RuneHubReplyState): CraftRuneResultView => (
  'player' in state && 'acquisitionSummary' in state
    ? state
    : {
        player: state,
        acquisitionSummary: null,
      }
);

export const replyWithRuneList = async (ctx: Context, state: RuneHubReplyState): Promise<void> => {
  const result = normalizeRuneHubReplyState(state);

  await ctx.reply(
    renderRuneScreen(result.player, result.acquisitionSummary),
    { keyboard: createRuneKeyboard(result.player) },
  );
};

export const replyWithRuneDetail = async (ctx: Context, state: RuneHubReplyState): Promise<void> => {
  const result = normalizeRuneHubReplyState(state);

  await ctx.reply(
    renderRuneDetailScreen(result.player, result.acquisitionSummary),
    { keyboard: createRuneDetailKeyboard(result.player) },
  );
};

export const replyWithRuneRerollMenu = async (ctx: Context, player: PlayerState): Promise<void> => {
  await ctx.reply(renderAltar(player), { keyboard: createRuneRerollKeyboard(player) });
};
