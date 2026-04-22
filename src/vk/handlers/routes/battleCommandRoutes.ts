import type { BattleActionType } from '../../../shared/types/game';
import { gameCommands } from '../../commands/catalog';
import type {
  StaticCommandHandler,
  StaticCommandRouteConfig,
} from '../gameCommandRouteKit';

const createBattleActionRoute = (action: BattleActionType): StaticCommandHandler => (
  (handler, ctx, vkId, context) => handler.executeBattleAction(ctx, vkId, action, context)
);

export const battleCommandRoutes = {
  [gameCommands.explore]: (handler, ctx, vkId, context) => handler.exploreNewBattle(ctx, vkId, context),
  [gameCommands.engageBattle]: createBattleActionRoute('ENGAGE'),
  [gameCommands.fleeBattle]: createBattleActionRoute('FLEE'),
  [gameCommands.attack]: createBattleActionRoute('ATTACK'),
  [gameCommands.defend]: createBattleActionRoute('DEFEND'),
  [gameCommands.skills]: createBattleActionRoute('RUNE_SKILL'),
  [gameCommands.skillSlot1]: createBattleActionRoute('RUNE_SKILL_SLOT_1'),
  [gameCommands.skillSlot2]: createBattleActionRoute('RUNE_SKILL_SLOT_2'),
  [gameCommands.spell]: createBattleActionRoute('RUNE_SKILL'),
} satisfies StaticCommandRouteConfig;
