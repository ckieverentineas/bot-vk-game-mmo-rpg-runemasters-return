import type { Context } from 'vk-io';

import type { AppServices } from '../../../app/composition-root';
import type { TrophyActionCode } from '../../../modules/rewards/domain/trophy-actions';
import type { PlayerState } from '../../../shared/types/game';
import {
  createMainMenuKeyboard,
  createPendingRewardKeyboard,
} from '../../keyboards';
import {
  renderCollectedPendingReward,
  renderMainMenu,
  renderPendingReward,
} from '../../presenters/messages';

type RewardReplyServices = Pick<AppServices, 'collectPendingReward' | 'getPendingReward'>;

export const replyWithPendingRewardIfAny = async (
  ctx: Context,
  services: RewardReplyServices,
  player: PlayerState,
): Promise<boolean> => {
  const result = await services.getPendingReward.execute(player.vkId);

  if (!result.pendingReward) {
    return false;
  }

  await ctx.reply(
    renderPendingReward(result.pendingReward),
    { keyboard: createPendingRewardKeyboard(result.pendingReward) },
  );
  return true;
};

export const replyWithPendingRewardScreen = async (
  ctx: Context,
  services: RewardReplyServices,
  vkId: number,
): Promise<void> => {
  const result = await services.getPendingReward.execute(vkId);

  if (!result.pendingReward) {
    await ctx.reply(
      ['На поле не осталось несобранных трофеев.', '', renderMainMenu(result.player)].join('\n'),
      { keyboard: createMainMenuKeyboard(result.player) },
    );
    return;
  }

  await ctx.reply(
    renderPendingReward(result.pendingReward),
    { keyboard: createPendingRewardKeyboard(result.pendingReward) },
  );
};

export const replyWithCollectedPendingReward = async (
  ctx: Context,
  services: RewardReplyServices,
  vkId: number,
  actionCode: TrophyActionCode,
  stateKey?: string,
): Promise<void> => {
  const result = await services.collectPendingReward.execute(vkId, actionCode, stateKey);

  await ctx.reply(
    renderCollectedPendingReward(result),
    { keyboard: createMainMenuKeyboard(result.player) },
  );
};
