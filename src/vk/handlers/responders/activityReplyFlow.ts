import type { Context } from 'vk-io';

import type { ClaimDailyTraceView } from '../../../modules/activity/application/use-cases/ClaimDailyTrace';
import { createMainMenuKeyboard } from '../../keyboards';
import { renderDailyTrace } from '../../presenters/messages';
import { replyWithScreen, type VkReplyScreen } from './screenReply';

export const createDailyTraceScreen = (view: ClaimDailyTraceView): VkReplyScreen => ({
  message: renderDailyTrace(view),
  keyboard: createMainMenuKeyboard(view.player),
});

export const replyWithDailyTrace = async (
  ctx: Context,
  view: ClaimDailyTraceView,
): Promise<void> => {
  await replyWithScreen(ctx, createDailyTraceScreen(view));
};
