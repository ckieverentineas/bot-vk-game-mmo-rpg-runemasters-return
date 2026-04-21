import type { Context } from 'vk-io';

import type { RunePageSlot } from '../../modules/runes/domain/rune-collection';
import type { StatKey } from '../../shared/types/game';
import type { AppError } from '../../shared/domain/AppError';
import { isAppError } from '../../shared/domain/AppError';
import { gameCommands, resolveRuneCursorDeltaCommand, resolveRunePageSlotCommand, resolveRuneStatRerollCommand } from '../commands/catalog';
import {
  createEntryKeyboard,
  createProfileKeyboard,
  createRuneDetailKeyboard,
  createRuneKeyboard,
  createRuneRerollKeyboard,
  createTutorialKeyboard,
} from '../keyboards';
import {
  renderAltar,
  renderBattle,
  renderLocation,
  renderProfile,
  renderRuneDetailScreen,
  renderRuneScreen,
} from '../presenters/messages';
import { resolveCommandEnvelope } from '../router/commandRouter';

import type { GameHandler } from './gameHandler';

type ReplyKeyboard = ReturnType<typeof createEntryKeyboard>;
type ErrorKeyboardCode = 'player_not_found' | 'runes_not_found' | 'rune_not_found' | 'rune_slot_not_found';

export type CommandIntentContext = {
  readonly intentId: string | null;
  readonly stateKey: string | null;
  readonly intentSource: ReturnType<typeof resolveCommandEnvelope>['intentSource'];
};

export type StaticCommandHandler = (
  handler: GameHandler,
  ctx: Context,
  vkId: number,
  context: CommandIntentContext,
) => Promise<void>;

type DynamicCommandResolver<T> = (command: string) => T | null;

type DynamicCommandExecutor<T> = (
  handler: GameHandler,
  ctx: Context,
  vkId: number,
  value: T,
  context: CommandIntentContext,
) => Promise<void>;

export type DynamicCommandRoute = {
  readonly tryHandle: (
    handler: GameHandler,
    ctx: Context,
    vkId: number,
    command: string,
    context: CommandIntentContext,
  ) => Promise<boolean>;
};

const createDynamicCommandRoute = <T>(
  resolve: DynamicCommandResolver<T>,
  handle: DynamicCommandExecutor<T>,
): DynamicCommandRoute => ({
  tryHandle: async (handler, ctx, vkId, command, context) => {
    const resolvedValue = resolve(command);
    if (resolvedValue === null) {
      return false;
    }

    await handle(handler, ctx, vkId, resolvedValue, context);
    return true;
  },
});

export type RecoveryRule = {
  readonly matches: (command: string, error: AppError) => boolean;
  readonly handle: (
    handler: GameHandler,
    ctx: Context,
    vkId: number,
    command: string,
    error: AppError,
  ) => Promise<boolean>;
};

export type GameCommandType = typeof gameCommands[keyof typeof gameCommands];

export const recoverableCommandErrorCodes = new Set([
  'stale_command_intent',
  'command_retry_pending',
  'rune_slot_not_found',
  'battle_in_progress',
]);

const tutorialFlowCommandSet = new Set<GameCommandType>([
  gameCommands.location,
  gameCommands.skipTutorial,
  gameCommands.returnToAdventure,
]);

const runeManageCommandSet = new Set<GameCommandType>([
  gameCommands.equipRune,
  gameCommands.equipRuneSlot1,
  gameCommands.equipRuneSlot2,
  gameCommands.unequipRune,
  gameCommands.craftRune,
  gameCommands.destroyRune,
]);

export const errorCodeKeyboardFactoryByCode: Partial<Record<ErrorKeyboardCode, () => ReplyKeyboard>> = {
  player_not_found: createEntryKeyboard,
  runes_not_found: createRuneKeyboard,
  rune_not_found: createRuneKeyboard,
  rune_slot_not_found: createRuneKeyboard,
};

export const isErrorKeyboardCode = (errorCode: string): errorCode is ErrorKeyboardCode => (
  Object.prototype.hasOwnProperty.call(errorCodeKeyboardFactoryByCode, errorCode)
);

export const config: Readonly<Partial<Record<GameCommandType, StaticCommandHandler>>> = {
  [gameCommands.start]: (handler, ctx, vkId) => handler.startGame(ctx, vkId),
  [gameCommands.backToMenu]: (handler, ctx, vkId) => handler.showMainMenu(ctx, vkId),
  [gameCommands.profile]: (handler, ctx, vkId) => handler.showProfile(ctx, vkId),
  [gameCommands.deletePlayer]: (handler, ctx, vkId) => handler.confirmDeletePlayer(ctx, vkId),
  [gameCommands.confirmDeletePlayer]: (handler, ctx, vkId, context) => {
    const routeState = toRouteState(context);
    return handler.deletePlayer(ctx, vkId, routeState.intentId, routeState.stateKey, routeState.intentSource);
  },
  [gameCommands.inventory]: (handler, ctx, vkId) => handler.showInventory(ctx, vkId),
  [gameCommands.location]: (handler, ctx, vkId, context) => {
    const routeState = toRouteState(context);
    return handler.exploreLocationScreen(ctx, vkId, routeState.intentId, routeState.stateKey, routeState.intentSource);
  },
  [gameCommands.skipTutorial]: (handler, ctx, vkId, context) => {
    return handler.returnRecapRoute(
      ctx,
      (entryIntentId, entryStateKey, entryIntentSource) => (
        handler.services.skipTutorial.execute(vkId, entryIntentId, entryStateKey, entryIntentSource)
      ),
      'skip_tutorial',
      context,
    );
  },
  [gameCommands.returnToAdventure]: (handler, ctx, vkId, context) => {
    return handler.returnRecapRoute(
      ctx,
      (entryIntentId, entryStateKey, entryIntentSource) => (
        handler.services.returnToAdventure.execute(vkId, entryIntentId, entryStateKey, entryIntentSource)
      ),
      'return_to_adventure',
      context,
    );
  },
  [gameCommands.explore]: (handler, ctx, vkId, context) => handler.exploreNewBattle(ctx, vkId, context),
  [gameCommands.engageBattle]: (handler, ctx, vkId, context) => handler.executeBattleAction(ctx, vkId, 'ENGAGE', context),
  [gameCommands.fleeBattle]: (handler, ctx, vkId, context) => handler.executeBattleAction(ctx, vkId, 'FLEE', context),
  [gameCommands.attack]: (handler, ctx, vkId, context) => handler.executeBattleAction(ctx, vkId, 'ATTACK', context),
  [gameCommands.defend]: (handler, ctx, vkId, context) => handler.executeBattleAction(ctx, vkId, 'DEFEND', context),
  [gameCommands.skills]: (handler, ctx, vkId, context) => handler.executeBattleAction(ctx, vkId, 'RUNE_SKILL', context),
  [gameCommands.skillSlot1]: (handler, ctx, vkId, context) => handler.executeBattleAction(ctx, vkId, 'RUNE_SKILL_SLOT_1', context),
  [gameCommands.skillSlot2]: (handler, ctx, vkId, context) => handler.executeBattleAction(ctx, vkId, 'RUNE_SKILL_SLOT_2', context),
  [gameCommands.spell]: (handler, ctx, vkId, context) => handler.executeBattleAction(ctx, vkId, 'RUNE_SKILL', context),
  [gameCommands.runeCollection]: (handler, ctx, vkId) => handler.openRuneCollection(ctx, vkId, true),
  [gameCommands.equipRune]: (handler, ctx, vkId, context) => handler.equipCurrentRuneSlot(ctx, vkId, null, context),
  [gameCommands.equipRuneSlot1]: (handler, ctx, vkId, context) => handler.equipCurrentRuneSlot(ctx, vkId, 0, context),
  [gameCommands.equipRuneSlot2]: (handler, ctx, vkId, context) => handler.equipCurrentRuneSlot(ctx, vkId, 1, context),
  [gameCommands.unequipRune]: (handler, ctx, vkId, context) => handler.unequipCurrentRuneSlot(ctx, vkId, context),
  [gameCommands.altar]: (handler, ctx, vkId) => handler.openRuneWorkshop(ctx, vkId, true),
  [gameCommands.craftRune]: (handler, ctx, vkId, context) => handler.craftRuneCommand(ctx, vkId, context),
  [gameCommands.rerollRuneMenu]: (handler, ctx, vkId) => handler.openRuneRerollMenu(ctx, vkId),
  [gameCommands.destroyRune]: (handler, ctx, vkId, context) => handler.destroyCurrentRuneCommand(ctx, vkId, context),
};

export const dynamicCommandConfig = [
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
      await handler.reply(ctx, renderAltar(player), createRuneRerollKeyboard(player));
    },
  ),
] satisfies readonly DynamicCommandRoute[];

export const recoveryRules: readonly RecoveryRule[] = [
  {
    matches: (command, error) => (
      error.code === 'battle_in_progress' && tutorialFlowCommandSet.has(command as GameCommandType)
    ),
    handle: async (handler, ctx, vkId, _command, error) => {
      const battle = await handler.safeGetActiveBattle(vkId);
      if (battle === null) {
        return false;
      }

      await handler.reply(ctx, [error.message, '', renderBattle(battle)].join('\n'), handler.resolveBattleKeyboard(battle));
      return true;
    },
  },
  {
    matches: (command, error) => (
      command === gameCommands.confirmDeletePlayer && error.code === 'command_retry_pending'
    ),
    handle: async (handler, ctx, vkId, _command, error) => {
      try {
        const player = await handler.services.getPlayerProfile.execute(vkId);
        await handler.reply(
          ctx,
          [error.message, '', renderProfile(player)].join('\n'),
          createProfileKeyboard(player),
        );
        return true;
      } catch (profileError) {
        if (
          _command === gameCommands.confirmDeletePlayer
          && isAppError(profileError)
          && profileError.code === 'player_not_found'
        ) {
          await handler.reply(ctx, 'Персонаж удалён. Можно начать заново в любой момент.', createEntryKeyboard());
          return true;
        }

        await handler.reply(
          ctx,
          'Это команда уже истекла. Обновите профиль и начните заново, если всё ещё хотите удалить персонажа.',
          createEntryKeyboard(),
        );
        return true;
      }
    },
  },
  {
    matches: (command) => command === gameCommands.confirmDeletePlayer,
    handle: async (handler, ctx, vkId, _command, error) => {
      const player = await handler.services.getPlayerProfile.execute(vkId);
      await handler.reply(
        ctx,
        [error.message, '', renderProfile(player)].join('\n'),
        createProfileKeyboard(player),
      );
      return true;
    },
  },
  {
    matches: (command) => command === gameCommands.explore,
    handle: async (handler, ctx, vkId, _command, error) => {
      const battle = await handler.safeGetActiveBattle(vkId);
      if (battle !== null) {
        await handler.reply(ctx, [error.message, '', renderBattle(battle)].join('\n'), handler.resolveBattleKeyboard(battle));
        return true;
      }

      const player = await handler.services.getPlayerProfile.execute(vkId);
      await handler.reply(
        ctx,
        [error.message, '', renderLocation(player)].join('\n'),
        createTutorialKeyboard(player),
      );
      return true;
    },
  },
  {
    matches: (command) => tutorialFlowCommandSet.has(command as GameCommandType),
    handle: async (handler, ctx, vkId, _command, error) => {
      const player = await handler.services.getPlayerProfile.execute(vkId);
      await handler.reply(
        ctx,
        [error.message, '', renderLocation(player)].join('\n'),
        createTutorialKeyboard(player),
      );
      return true;
    },
  },
  {
    matches: (command) => (
      resolveRuneCursorDeltaCommand(command) !== null
      || resolveRunePageSlotCommand(command) !== null
    ),
    handle: async (handler, ctx, vkId, _command, error) => {
      const player = await handler.services.getRuneCollection.execute(vkId);
      await handler.reply(
        ctx,
        [error.message, '', renderRuneScreen(player)].join('\n'),
        createRuneKeyboard(player),
      );
      return true;
    },
  },
  {
    matches: (command) => runeManageCommandSet.has(command as GameCommandType),
    handle: async (handler, ctx, vkId, _command, error) => {
      const player = await handler.services.getRuneCollection.execute(vkId);
      await handler.reply(
        ctx,
        [error.message, '', renderRuneDetailScreen(player)].join('\n'),
        createRuneDetailKeyboard(player),
      );
      return true;
    },
  },
  {
    matches: (command) => (
      command === gameCommands.rerollRuneMenu
      || resolveRuneStatRerollCommand(command) !== null
    ),
    handle: async (handler, ctx, vkId, _command, error) => {
      const player = await handler.services.getRuneCollection.execute(vkId);
      await handler.reply(
        ctx,
        [error.message, '', renderAltar(player)].join('\n'),
        createRuneRerollKeyboard(player),
      );
      return true;
    },
  },
];

export const toRouteState = (context: CommandIntentContext): {
  intentId: string | undefined;
  stateKey: string | undefined;
  intentSource: ReturnType<typeof resolveCommandEnvelope>['intentSource'];
} => ({
  intentId: context.intentId ?? undefined,
  stateKey: context.stateKey ?? undefined,
  intentSource: context.intentSource,
});
