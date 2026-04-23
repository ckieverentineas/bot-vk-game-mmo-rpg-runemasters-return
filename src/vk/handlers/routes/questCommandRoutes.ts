import {
  gameCommands,
  resolveQuestBookPageCommand,
} from '../../commands/catalog';
import {
  createDynamicCommandRoute,
  type DynamicCommandRoute,
  type StaticCommandRouteConfig,
} from '../gameCommandRouteKit';

export const questCommandRoutes = {
  [gameCommands.questBook]: (handler, ctx, vkId) => handler.openQuestBook(ctx, vkId),
  [gameCommands.claimQuestReward]: (handler, ctx, vkId, context) => (
    handler.claimQuestReward(ctx, vkId, context)
  ),
} satisfies StaticCommandRouteConfig;

export const questDynamicCommandRoutes = [
  createDynamicCommandRoute<number>(
    resolveQuestBookPageCommand,
    (handler, ctx, vkId, pageNumber) => handler.openQuestBook(ctx, vkId, pageNumber),
  ),
] satisfies readonly DynamicCommandRoute[];
