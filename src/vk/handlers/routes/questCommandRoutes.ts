import { gameCommands } from '../../commands/catalog';
import type { StaticCommandRouteConfig } from '../gameCommandRouteKit';

export const questCommandRoutes = {
  [gameCommands.questBook]: (handler, ctx, vkId) => handler.openQuestBook(ctx, vkId),
  [gameCommands.claimQuestReward]: (handler, ctx, vkId, context) => (
    handler.claimQuestReward(ctx, vkId, context)
  ),
} satisfies StaticCommandRouteConfig;
