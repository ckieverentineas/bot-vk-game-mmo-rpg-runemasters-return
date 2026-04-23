import type { Context } from 'vk-io';

import type { BestiaryView } from '../../../modules/world/application/read-models/bestiary';
import { createBestiaryKeyboard } from '../../keyboards';
import { renderBestiary } from '../../presenters/messages';

export const replyWithBestiary = async (ctx: Context, bestiary: BestiaryView): Promise<void> => {
  await ctx.reply(renderBestiary(bestiary), { keyboard: createBestiaryKeyboard(bestiary) });
};
