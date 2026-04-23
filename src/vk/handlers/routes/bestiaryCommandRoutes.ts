import {
  gameCommands,
  resolveBestiaryLocationCommand,
  resolveBestiaryPageCommand,
} from '../../commands/catalog';
import {
  createDynamicCommandRoute,
  type DynamicCommandRoute,
  type StaticCommandRouteConfig,
} from '../gameCommandRouteKit';

export const bestiaryCommandRoutes = {
  [gameCommands.bestiary]: (handler, ctx, vkId) => handler.openBestiary(ctx, vkId),
} satisfies StaticCommandRouteConfig;

export const bestiaryDynamicCommandRoutes = [
  createDynamicCommandRoute<string>(
    resolveBestiaryLocationCommand,
    (handler, ctx, vkId, biomeCode) => handler.openBestiaryLocation(ctx, vkId, biomeCode),
  ),
  createDynamicCommandRoute<number>(
    resolveBestiaryPageCommand,
    (handler, ctx, vkId, pageNumber) => handler.openBestiary(ctx, vkId, pageNumber),
  ),
] satisfies readonly DynamicCommandRoute[];
