import { gameCommands } from '../../commands/catalog';
import {
  type StaticCommandRouteConfig,
  toRouteState,
} from '../gameCommandRouteKit';

export const coreCommandRoutes = {
  [gameCommands.start]: (handler, ctx, vkId) => handler.startGame(ctx, vkId),
  [gameCommands.backToMenu]: (handler, ctx, vkId) => handler.showMainMenu(ctx, vkId),
  [gameCommands.profile]: (handler, ctx, vkId) => handler.showProfile(ctx, vkId),
  [gameCommands.deletePlayer]: (handler, ctx, vkId) => handler.confirmDeletePlayer(ctx, vkId),
  [gameCommands.confirmDeletePlayer]: (handler, ctx, vkId, context) => {
    const routeState = toRouteState(context);
    return handler.deletePlayer(ctx, vkId, routeState.intentId, routeState.stateKey, routeState.intentSource);
  },
  [gameCommands.inventory]: (handler, ctx, vkId) => handler.showInventory(ctx, vkId),
} satisfies StaticCommandRouteConfig;
