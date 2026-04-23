import type { Context } from 'vk-io';

import type {
  BestiaryLocationDetailView,
  BestiaryOverviewView,
} from '../../../modules/world/application/read-models/bestiary';
import {
  createBestiaryKeyboard,
  createBestiaryLocationKeyboard,
} from '../../keyboards';
import {
  renderBestiaryLocationDetail,
  renderBestiaryOverview,
} from '../../presenters/messages';

export const replyWithBestiary = async (
  ctx: Context,
  bestiary: BestiaryOverviewView,
): Promise<void> => {
  await ctx.reply(renderBestiaryOverview(bestiary), { keyboard: createBestiaryKeyboard(bestiary) });
};

export const replyWithBestiaryLocation = async (
  ctx: Context,
  detail: BestiaryLocationDetailView,
  pageNumber = 1,
): Promise<void> => {
  await ctx.reply(renderBestiaryLocationDetail(detail), {
    keyboard: createBestiaryLocationKeyboard(detail, pageNumber),
  });
};
