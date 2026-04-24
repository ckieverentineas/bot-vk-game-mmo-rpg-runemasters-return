import {
  type BestiaryEnemyCommandPayload,
  type BestiaryLocationCommandPayload,
  gameCommands,
  resolveBestiaryEnemyCommand,
  resolveBestiaryEnemyRewardCommand,
  resolveBestiaryLocationCommand,
  resolveBestiaryLocationRewardCommand,
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
  createDynamicCommandRoute<BestiaryLocationCommandPayload>(
    resolveBestiaryLocationCommand,
    (handler, ctx, vkId, payload) => handler.openBestiaryLocation(
      ctx,
      vkId,
      payload.biomeCode,
      payload.enemyPageNumber,
    ),
  ),
  createDynamicCommandRoute<BestiaryEnemyCommandPayload>(
    resolveBestiaryEnemyCommand,
    (handler, ctx, vkId, payload) => handler.openBestiaryEnemy(ctx, vkId, payload.biomeCode, payload.enemyCode),
  ),
  createDynamicCommandRoute<string>(
    resolveBestiaryLocationRewardCommand,
    (handler, ctx, vkId, biomeCode) => handler.claimBestiaryLocationReward(ctx, vkId, biomeCode),
  ),
  createDynamicCommandRoute<BestiaryEnemyCommandPayload>(
    resolveBestiaryEnemyRewardCommand,
    (handler, ctx, vkId, payload) => handler.claimBestiaryEnemyReward(ctx, vkId, payload.biomeCode, payload.enemyCode),
  ),
  createDynamicCommandRoute<number>(
    resolveBestiaryPageCommand,
    (handler, ctx, vkId, pageNumber) => handler.openBestiary(ctx, vkId, pageNumber),
  ),
] satisfies readonly DynamicCommandRoute[];
