import { gameCommands } from '../../commands/catalog';
import {
  type StaticCommandRouteConfig,
  toRouteState,
} from '../gameCommandRouteKit';

export const tutorialCommandRoutes = {
  [gameCommands.location]: (handler, ctx, vkId, context) => {
    const routeState = toRouteState(context);
    return handler.exploreLocationScreen(
      ctx,
      vkId,
      routeState.intentId,
      routeState.stateKey,
      routeState.intentSource,
    );
  },
  [gameCommands.skipTutorial]: (handler, ctx, vkId, context) => (
    handler.returnRecapRoute(
      ctx,
      (entryIntentId, entryStateKey, entryIntentSource) => (
        handler.services.skipTutorial.execute(vkId, entryIntentId, entryStateKey, entryIntentSource)
      ),
      'skip_tutorial',
      context,
    )
  ),
  [gameCommands.returnToAdventure]: (handler, ctx, vkId, context) => (
    handler.returnRecapRoute(
      ctx,
      (entryIntentId, entryStateKey, entryIntentSource) => (
        handler.services.returnToAdventure.execute(vkId, entryIntentId, entryStateKey, entryIntentSource)
      ),
      'return_to_adventure',
      context,
    )
  ),
} satisfies StaticCommandRouteConfig;
