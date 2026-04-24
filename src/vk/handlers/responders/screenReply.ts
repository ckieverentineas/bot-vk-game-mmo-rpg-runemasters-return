import type { Context } from 'vk-io';

import type { KeyboardBuilder } from '../../keyboards/types';

export interface VkReplyScreen {
  readonly message: string;
  readonly keyboard: KeyboardBuilder;
}

export const replyWithScreen = async (
  ctx: Context,
  screen: VkReplyScreen,
): Promise<void> => {
  await ctx.reply(screen.message, { keyboard: screen.keyboard });
};
