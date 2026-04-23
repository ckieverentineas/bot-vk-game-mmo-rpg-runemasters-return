import {
  gameCommands,
  resolvePartyJoinCommand,
} from '../../commands/catalog';
import type {
  DynamicCommandRoute,
  StaticCommandRouteConfig,
} from '../gameCommandRouteKit';

export const partyCommandRoutes = {
  [gameCommands.party]: (handler, ctx, vkId) => handler.showParty(ctx, vkId),
  [gameCommands.createParty]: (handler, ctx, vkId) => handler.createParty(ctx, vkId),
  [gameCommands.leaveParty]: (handler, ctx, vkId) => handler.leaveParty(ctx, vkId),
  [gameCommands.disbandParty]: (handler, ctx, vkId) => handler.disbandParty(ctx, vkId),
  [gameCommands.exploreParty]: (handler, ctx, vkId) => handler.exploreParty(ctx, vkId),
} satisfies StaticCommandRouteConfig;

export const partyDynamicCommandRoutes = [
  {
    tryHandle: async (handler, ctx, vkId, command) => {
      const inviteCode = resolvePartyJoinCommand(command);
      if (!inviteCode) {
        return false;
      }

      await handler.joinParty(ctx, vkId, inviteCode);
      return true;
    },
  },
] satisfies readonly DynamicCommandRoute[];
