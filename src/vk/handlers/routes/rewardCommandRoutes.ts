import { gameCommands, resolveTrophyActionCommand } from '../../commands/catalog';
import {
  createDynamicCommandRoute,
  type DynamicCommandRoute,
  type StaticCommandRouteConfig,
} from '../gameCommandRouteKit';

export const rewardCommandRoutes = {
  [gameCommands.pendingReward]: (handler, ctx, vkId) => handler.showPendingReward(ctx, vkId),
  [gameCommands.collectAllReward]: (handler, ctx, vkId, context) => (
    handler.collectPendingReward(ctx, vkId, 'claim_all', context)
  ),
  [gameCommands.skinBeastReward]: (handler, ctx, vkId, context) => (
    handler.collectPendingReward(ctx, vkId, 'skin_beast', context)
  ),
  [gameCommands.gatherSlimeReward]: (handler, ctx, vkId, context) => (
    handler.collectPendingReward(ctx, vkId, 'gather_slime', context)
  ),
  [gameCommands.extractEssenceReward]: (handler, ctx, vkId, context) => (
    handler.collectPendingReward(ctx, vkId, 'extract_essence', context)
  ),
} satisfies StaticCommandRouteConfig;

export const rewardDynamicCommandRoutes = [
  createDynamicCommandRoute(
    resolveTrophyActionCommand,
    async (handler, ctx, vkId, actionCode, context) => {
      await handler.collectPendingReward(ctx, vkId, actionCode, context);
    },
  ),
] satisfies readonly DynamicCommandRoute[];
