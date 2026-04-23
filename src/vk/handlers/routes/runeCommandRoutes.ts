import type { RunePageSlot } from '../../../modules/runes/domain/rune-collection';
import type { StatKey } from '../../../shared/types/game';
import {
  gameCommands,
  resolveCraftingRecipeCommand,
  resolveRuneCursorDeltaCommand,
  resolveRunePageSlotCommand,
  resolveRuneStatRerollCommand,
} from '../../commands/catalog';
import {
  createDynamicCommandRoute,
  type DynamicCommandRoute,
  type StaticCommandRouteConfig,
} from '../gameCommandRouteKit';

export const runeCommandRoutes = {
  [gameCommands.runeCollection]: (handler, ctx, vkId) => handler.openRuneCollection(ctx, vkId, true),
  [gameCommands.equipRune]: (handler, ctx, vkId, context) => (
    handler.equipCurrentRuneSlot(ctx, vkId, null, context)
  ),
  [gameCommands.equipRuneSlot1]: (handler, ctx, vkId, context) => (
    handler.equipCurrentRuneSlot(ctx, vkId, 0, context)
  ),
  [gameCommands.equipRuneSlot2]: (handler, ctx, vkId, context) => (
    handler.equipCurrentRuneSlot(ctx, vkId, 1, context)
  ),
  [gameCommands.unequipRune]: (handler, ctx, vkId, context) => (
    handler.unequipCurrentRuneSlot(ctx, vkId, context)
  ),
  [gameCommands.altar]: (handler, ctx, vkId) => handler.openRuneAltar(ctx, vkId, true),
  [gameCommands.craftRune]: (handler, ctx, vkId, context) => handler.craftRuneCommand(ctx, vkId, context),
  [gameCommands.rerollRuneMenu]: (handler, ctx, vkId) => handler.openRuneRerollMenu(ctx, vkId),
  [gameCommands.destroyRune]: (handler, ctx, vkId, context) => (
    handler.destroyCurrentRuneCommand(ctx, vkId, context)
  ),
} satisfies StaticCommandRouteConfig;

export const runeDynamicCommandRoutes = [
  createDynamicCommandRoute<number>(
    resolveRuneCursorDeltaCommand,
    async (handler, ctx, vkId, runeDelta, context) => {
      const player = await handler.services.moveRuneCursor.execute(
        vkId,
        runeDelta,
        context.intentId ?? undefined,
        context.stateKey ?? undefined,
        context.intentSource,
      );
      await handler.replyWithRuneList(ctx, player);
    },
  ),
  createDynamicCommandRoute<RunePageSlot>(
    resolveRunePageSlotCommand,
    async (handler, ctx, vkId, runePageSlot, context) => {
      const player = await handler.services.selectRunePageSlot.execute(
        vkId,
        runePageSlot,
        context.intentId ?? undefined,
        context.stateKey ?? undefined,
        context.intentSource,
      );
      await handler.replyWithRuneDetail(ctx, player);
    },
  ),
  createDynamicCommandRoute<StatKey>(
    resolveRuneStatRerollCommand,
    async (handler, ctx, vkId, runeStat, context) => {
      const player = await handler.services.rerollCurrentRuneStat.execute(
        vkId,
        runeStat,
        context.intentId ?? undefined,
        context.stateKey ?? undefined,
        context.intentSource,
      );
      await handler.replyWithRuneRerollMenu(ctx, player);
    },
  ),
  createDynamicCommandRoute(
    resolveCraftingRecipeCommand,
    async (handler, ctx, vkId, recipeCode, context) => {
      const result = await handler.services.craftItem.execute(
        vkId,
        recipeCode,
        context.intentId ?? undefined,
        context.stateKey ?? undefined,
        context.intentSource,
      );
      await handler.replyWithAltar(ctx, result);
    },
  ),
] satisfies readonly DynamicCommandRoute[];
