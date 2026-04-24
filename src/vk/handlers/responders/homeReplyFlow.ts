import type { Context } from 'vk-io';

import type { PlayerState } from '../../../shared/types/game';
import {
  createDeleteConfirmationKeyboard,
  createEntryKeyboard,
  createMainMenuKeyboard,
  createProfileKeyboard,
  createSchoolMasteryKeyboard,
  createTutorialKeyboard,
} from '../../keyboards';
import {
  renderInventory,
  renderLocation,
  renderMainMenu,
  renderProfile,
  renderReturnRecap,
  renderSchoolMastery,
  renderWelcome,
} from '../../presenters/messages';

const formatRuneCountLabel = (count: number): string => {
  const remainder10 = count % 10;
  const remainder100 = count % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return 'руна';
  }

  if (remainder10 >= 2 && remainder10 <= 4 && (remainder100 < 12 || remainder100 > 14)) {
    return 'руны';
  }

  return 'рун';
};

export const replyWithMainMenu = async (ctx: Context, player: PlayerState): Promise<void> => {
  await ctx.reply(renderMainMenu(player), { keyboard: createMainMenuKeyboard(player) });
};

export const replyWithProfile = async (ctx: Context, player: PlayerState): Promise<void> => {
  await ctx.reply(renderProfile(player), { keyboard: createProfileKeyboard(player) });
};

export const replyWithSchoolMastery = async (ctx: Context, player: PlayerState): Promise<void> => {
  await ctx.reply(renderSchoolMastery(player), { keyboard: createSchoolMasteryKeyboard(player) });
};

export const replyWithInventory = async (ctx: Context, player: PlayerState): Promise<void> => {
  await ctx.reply(renderInventory(player), { keyboard: createMainMenuKeyboard(player) });
};

export const replyWithLocation = async (ctx: Context, player: PlayerState): Promise<void> => {
  await ctx.reply(renderLocation(player), { keyboard: createTutorialKeyboard(player) });
};

export const replyWithWelcome = async (
  ctx: Context,
  player: PlayerState,
  created: boolean,
): Promise<void> => {
  const keyboard = created || player.tutorialState === 'ACTIVE'
    ? createTutorialKeyboard(player)
    : createMainMenuKeyboard(player);

  await ctx.reply(renderWelcome(player, created), { keyboard });
};

export const replyWithReturnRecap = async (ctx: Context, player: PlayerState): Promise<void> => {
  await ctx.reply(
    renderReturnRecap(player, '🧭 Возвращение в приключения'),
    { keyboard: createMainMenuKeyboard(player) },
  );
};

export const replyWithDeleteConfirmation = async (ctx: Context, player: PlayerState): Promise<void> => {
  const runeSummary = player.runes.length > 0
    ? ` и ${player.runes.length} ${formatRuneCountLabel(player.runes.length)}`
    : '';

  await ctx.reply(
    [
      '⚠️ Удаление персонажа',
      '',
      `Будет удалён герой уровня ${player.level}${runeSummary}.`,
      'Это действие необратимо: прогресс и руны будут удалены.',
      '«🗑️ Да, удалить» — только если действительно хотите начать заново.',
    ].join('\n'),
    { keyboard: createDeleteConfirmationKeyboard(player) },
  );
};

export const replyWithDeletedPlayer = async (ctx: Context): Promise<void> => {
  await ctx.reply(
    'Персонаж удалён. Можно начать заново в любой момент.',
    { keyboard: createEntryKeyboard() },
  );
};
