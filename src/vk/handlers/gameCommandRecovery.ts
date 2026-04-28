import type { Context } from 'vk-io';

import { type AppError, isAppError } from '../../shared/domain/AppError';
import {
  gameCommands,
  resolveCraftingRecipeCommand,
  resolveRuneCursorDeltaCommand,
  resolveRunePageSlotCommand,
  resolveRuneStatRerollCommand,
  resolveWorkshopAwakenCommand,
  resolveWorkshopCraftCommand,
  resolveWorkshopRepairCommand,
  resolveWorkshopShopCommand,
} from '../commands/catalog';
import {
  createEntryKeyboard,
  createAltarKeyboard,
  createProfileKeyboard,
  createRuneKeyboard,
  createRuneRerollKeyboard,
  createTutorialKeyboard,
  createWorkshopKeyboard,
} from '../keyboards';
import {
  renderAltar,
  renderBattle,
  renderLocation,
  renderProfile,
  renderRuneScreen,
  renderWorkshop,
} from '../presenters/messages';
import type { GameHandler } from './gameHandler';
import type { GameCommandType } from './gameCommandRouteKit';

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
  'not_enough_rune_resources',
  'not_enough_crafting_resources',
  'not_enough_workshop_resources',
  'not_enough_dust',
  'not_enough_radiance',
  'workshop_blueprint_unavailable',
  'workshop_blueprint_feature_unavailable',
  'workshop_item_not_repairable',
  'not_enough_shards',
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

const isWorkshopCommand = (command: string): boolean => (
  command === gameCommands.workshop
  || resolveCraftingRecipeCommand(command) !== null
  || resolveWorkshopCraftCommand(command) !== null
  || resolveWorkshopAwakenCommand(command) !== null
  || resolveWorkshopRepairCommand(command) !== null
  || resolveWorkshopShopCommand(command) !== null
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
        withErrorHeader(error, renderAltar(player)),
        createAltarKeyboard(player),
      );
      return true;
    },
  },
  {
    matches: isWorkshopCommand,
    handle: async (handler, ctx, vkId, _command, error) => {
      const view = await handler.services.getWorkshop.execute(vkId);
      await handler.reply(
        ctx,
        withErrorHeader(error, renderWorkshop(view)),
        createWorkshopKeyboard(view),
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
