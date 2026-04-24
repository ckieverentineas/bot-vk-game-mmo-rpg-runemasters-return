import type { Context } from 'vk-io';

import type {
  BestiaryEnemyDetailView,
  BestiaryLocationDetailView,
  BestiaryOverviewView,
} from '../../../modules/world/application/read-models/bestiary';
import {
  createBestiaryEnemyKeyboard,
  createBestiaryKeyboard,
  createBestiaryLocationKeyboard,
} from '../../keyboards';
import {
  renderBestiaryEnemyDetail,
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
): Promise<void> => {
  await ctx.reply(renderBestiaryLocationDetail(detail), {
    keyboard: createBestiaryLocationKeyboard(detail),
  });
};

export const replyWithBestiaryEnemy = async (
  ctx: Context,
  detail: BestiaryEnemyDetailView,
): Promise<void> => {
  await ctx.reply(renderBestiaryEnemyDetail(detail), {
    keyboard: createBestiaryEnemyKeyboard(detail),
  });
};
