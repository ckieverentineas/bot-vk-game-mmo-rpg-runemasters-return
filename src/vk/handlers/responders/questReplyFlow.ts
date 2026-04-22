import type { Context } from 'vk-io';

import type { QuestBookView } from '../../../modules/quests/application/read-models/quest-book';
import type { ClaimQuestRewardView } from '../../../modules/quests/application/use-cases/ClaimQuestReward';
import { createQuestBookKeyboard } from '../../keyboards';
import {
  renderQuestBook,
  renderQuestClaimResult,
} from '../../presenters/messages';

export const replyWithQuestBook = async (ctx: Context, book: QuestBookView): Promise<void> => {
  await ctx.reply(renderQuestBook(book), { keyboard: createQuestBookKeyboard(book) });
};

export const replyWithQuestClaimResult = async (
  ctx: Context,
  result: ClaimQuestRewardView,
): Promise<void> => {
  await ctx.reply(renderQuestClaimResult(result), { keyboard: createQuestBookKeyboard(result.book) });
};
