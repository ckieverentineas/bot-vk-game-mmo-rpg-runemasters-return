import {
  gameCommands,
  resolveCraftingRecipeCommand,
  resolveWorkshopCraftCommand,
  resolveWorkshopEquipCommand,
  resolveWorkshopRepairCommand,
  resolveWorkshopUnequipCommand,
} from '../../commands/catalog';
import {
  createDynamicCommandRoute,
  type DynamicCommandRoute,
  type StaticCommandRouteConfig,
} from '../gameCommandRouteKit';

export const workshopCommandRoutes = {
  [gameCommands.workshop]: (handler, ctx, vkId) => handler.openWorkshop(ctx, vkId),
} satisfies StaticCommandRouteConfig;

export const workshopDynamicCommandRoutes = [
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
      const view = await handler.services.getWorkshop.execute(vkId);
      await handler.replyWithWorkshop(ctx, {
        view,
        acquisitionSummary: result.acquisitionSummary,
      });
    },
  ),
  createDynamicCommandRoute(
    resolveWorkshopCraftCommand,
    async (handler, ctx, vkId, blueprintInstanceId, context) => {
      const result = await handler.services.craftWorkshopItem.execute(
        vkId,
        blueprintInstanceId,
        context.intentId ?? undefined,
        context.stateKey ?? undefined,
        context.intentSource,
      );
      await handler.replyWithWorkshop(ctx, result);
    },
  ),
  createDynamicCommandRoute(
    resolveWorkshopRepairCommand,
    async (handler, ctx, vkId, payload, context) => {
      const result = await handler.services.repairWorkshopItem.execute(
        vkId,
        payload.itemId,
        payload.repairBlueprintInstanceId,
        context.intentId ?? undefined,
        context.stateKey ?? undefined,
        context.intentSource,
      );
      await handler.replyWithWorkshop(ctx, result);
    },
  ),
  createDynamicCommandRoute(
    resolveWorkshopEquipCommand,
    async (handler, ctx, vkId, itemId, context) => {
      const result = await handler.services.equipWorkshopItem.execute(
        vkId,
        itemId,
        context.intentId ?? undefined,
        context.stateKey ?? undefined,
        context.intentSource,
      );
      await handler.replyWithWorkshop(ctx, result);
    },
  ),
  createDynamicCommandRoute(
    resolveWorkshopUnequipCommand,
    async (handler, ctx, vkId, itemId, context) => {
      const result = await handler.services.unequipWorkshopItem.execute(
        vkId,
        itemId,
        context.intentId ?? undefined,
        context.stateKey ?? undefined,
        context.intentSource,
      );
      await handler.replyWithWorkshop(ctx, result);
    },
  ),
] satisfies readonly DynamicCommandRoute[];
