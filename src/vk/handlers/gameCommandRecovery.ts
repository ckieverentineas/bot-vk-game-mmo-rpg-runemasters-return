import type { Context } from 'vk-io';

import { type AppError, isAppError } from '../../shared/domain/AppError';
import {
  gameCommands,
  resolveRuneCursorDeltaCommand,
  resolveRunePageSlotCommand,
  resolveRuneStatRerollCommand,
} from '../commands/catalog';
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
import type { GameHandler } from './gameHandler';
import type { GameCommandType } from './gameCommandRoutes';

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

const withErrorHeader = (error: AppError, body: string): string => (
  [error.message, '', body].join('\n')
);

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

      await handler.reply(
        ctx,
        withErrorHeader(error, renderBattle(battle)),
        handler.resolveBattleKeyboard(battle),
      );
      return true;
    },
  },
  {
    matches: (command, error) => (
      command === gameCommands.confirmDeletePlayer && error.code === 'command_retry_pending'
    ),
    handle: async (handler, ctx, vkId, command, error) => {
      try {
        const player = await handler.services.getPlayerProfile.execute(vkId);
        await handler.reply(
          ctx,
          withErrorHeader(error, renderProfile(player)),
          createProfileKeyboard(player),
        );
        return true;
      } catch (profileError) {
        if (
          command === gameCommands.confirmDeletePlayer
          && isAppError(profileError)
          && profileError.code === 'player_not_found'
        ) {
          await handler.reply(ctx, 'Персонаж удалён. Можно начать заново в любой момент.', createEntryKeyboard());
          return true;
        }

        await handler.reply(
          ctx,
          'Старый жест удаления больше не действует. Вернитесь в летопись, если всё ещё хотите удалить персонажа.',
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
        withErrorHeader(error, renderProfile(player)),
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
        await handler.reply(
          ctx,
          withErrorHeader(error, renderBattle(battle)),
          handler.resolveBattleKeyboard(battle),
        );
        return true;
      }

      const player = await handler.services.getPlayerProfile.execute(vkId);
      await handler.reply(
        ctx,
        withErrorHeader(error, renderLocation(player)),
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
        withErrorHeader(error, renderLocation(player)),
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
        withErrorHeader(error, renderRuneScreen(player)),
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
        withErrorHeader(error, renderRuneDetailScreen(player)),
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
        withErrorHeader(error, renderAltar(player)),
        createRuneRerollKeyboard(player),
      );
      return true;
    },
  },
];
